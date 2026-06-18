import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

type ReportType = 'commercial' | 'region' | 'product' | 'client' | 'top-products' | 'performance' | 'full'
type ReportPeriod = 'week' | 'month' | 'year' | '12months'

function getDateRange(period: ReportPeriod) {
  const now = new Date()
  let start: Date

  switch (period) {
    case 'week':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
      break
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1)
      break
    case '12months':
      start = new Date(now.getFullYear(), now.getMonth() - 12, 1)
      break
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  return { start, end: now }
}

// GET /api/reports?type=commercial&period=month
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') || 'commercial') as ReportType
    const period = (searchParams.get('period') || 'month') as ReportPeriod
    const { start, end } = getDateRange(period)

    // ─── Summary stats (common) ───
    const [totalOrders, totalRevenue, totalClients, totalProducts] = await Promise.all([
      db.order.count({
        where: { companyId, createdAt: { gte: start, lte: end } },
      }),
      db.order.aggregate({
        _sum: { total: true },
        where: { companyId, createdAt: { gte: start, lte: end } },
      }),
      db.client.count({ where: { companyId } }),
      db.product.count({ where: { companyId, status: 'active' } }),
    ])

    const summary = {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      totalClients,
      totalProducts,
      period,
      from: start.toISOString(),
      to: end.toISOString(),
    }

    // ─── Report type routing ───
    let data: Record<string, unknown> = {}

    switch (type) {
      case 'commercial': {
        const commercials = await db.user.findMany({
          where: { companyId, role: { in: ['commercial', 'admin'] } },
          select: { id: true, name: true, avatar: true },
        })

        // Batch: fetch all orders and targets in 2 queries instead of 2N
        const commercialIds = commercials.map((c) => c.id)

        const [allOrders, allTargets] = await Promise.all([
          db.order.findMany({
            where: {
              commercialId: { in: commercialIds },
              companyId,
              createdAt: { gte: start, lte: end },
            },
            select: { commercialId: true, total: true },
          }),
          db.target.findMany({
            where: { userId: { in: commercialIds }, type: 'revenue' },
            orderBy: { createdAt: 'desc' },
          }),
        ])

        // Build Maps for O(1) lookup
        const ordersByCommercial = new Map<string, number[]>()
        for (const order of allOrders) {
          const cid = order.commercialId || ''
          if (!ordersByCommercial.has(cid)) {
            ordersByCommercial.set(cid, [])
          }
          ordersByCommercial.get(cid)!.push(order.total)
        }

        const targetsByUser = new Map<string, { value: number; achieved: number }>()
        for (const target of allTargets) {
          if (!targetsByUser.has(target.userId)) {
            targetsByUser.set(target.userId, { value: target.value, achieved: target.achieved })
          }
        }

        const commercialData = commercials.map((c) => {
          const orderTotals = ordersByCommercial.get(c.id) || []
          const revenue = orderTotals.reduce((sum, t) => sum + t, 0)
          const count = orderTotals.length

          const target = targetsByUser.get(c.id)
          const targetValue = target?.value || 0
          const achieved = target?.achieved || revenue
          const targetPercent = targetValue > 0 ? Math.min((achieved / targetValue) * 100, 100) : 0

          return {
            id: c.id,
            name: c.name,
            avatar: c.avatar,
            revenue: Math.round(revenue),
            orderCount: count,
            targetValue: Math.round(targetValue),
            targetAchieved: Math.round(achieved),
            targetPercent: Math.round(targetPercent * 10) / 10,
          }
        })

        data = { commercials: commercialData.sort((a, b) => b.revenue - a.revenue) }
        break
      }

      case 'region': {
        const clients = await db.client.findMany({
          where: { companyId, region: { not: null } },
          select: { region: true },
        })

        const orders = await db.order.findMany({
          where: { companyId, createdAt: { gte: start, lte: end } },
          select: { total: true, client: { select: { region: true } } },
        })

        // Group by region
        const regionMap = new Map<string, { count: number; revenue: number; clients: number }>()

        for (const client of clients) {
          const region = client.region!
          if (!regionMap.has(region)) {
            regionMap.set(region, { count: 0, revenue: 0, clients: 0 })
          }
          regionMap.get(region)!.clients++
        }

        for (const order of orders) {
          const region = order.client.region
          if (region) {
            if (!regionMap.has(region)) {
              regionMap.set(region, { count: 0, revenue: 0, clients: 0 })
            }
            regionMap.get(region)!.count++
            regionMap.get(region)!.revenue += order.total
          }
        }

        const totalClientsWithRegion = clients.length
        const regions = Array.from(regionMap.entries())
          .map(([region, stats]) => ({
            region,
            orderCount: stats.count,
            revenue: Math.round(stats.revenue),
            clientCount: stats.clients,
            clientPercent: totalClientsWithRegion > 0
              ? Math.round((stats.clients / totalClientsWithRegion) * 1000) / 10
              : 0,
          }))
          .sort((a, b) => b.revenue - a.revenue)

        data = { regions, totalRegions: regions.length }
        break
      }

      case 'product': {
        const orderItems = await db.orderItem.groupBy({
          by: ['productId'],
          where: {
            order: { companyId, createdAt: { gte: start, lte: end } },
          },
          _sum: { quantity: true, totalPrice: true },
          orderBy: { _sum: { totalPrice: 'desc' } },
        })

        // Batch: fetch all products in 1 query instead of N
        const productIds = orderItems.map((item) => item.productId)
        const products = await db.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, reference: true, category: { select: { name: true } } },
        })

        const productMap = new Map(products.map((p) => [p.id, p]))

        const productData = orderItems.map((item) => {
          const product = productMap.get(item.productId)
          return {
            id: item.productId,
            name: product?.name || 'Inconnu',
            reference: product?.reference || '',
            category: product?.category?.name || '',
            quantitySold: item._sum.quantity || 0,
            revenue: Math.round(item._sum.totalPrice || 0),
          }
        })

        data = { products: productData }
        break
      }

      case 'client': {
        const orders = await db.order.findMany({
          where: { companyId, createdAt: { gte: start, lte: end } },
          include: {
            client: { select: { id: true, companyName: true, contactName: true, city: true, region: true } },
          },
        })

        const clientMap = new Map<string, { companyName: string; contactName: string; city: string | null; region: string | null; revenue: number; orderCount: number }>()

        for (const order of orders) {
          const cid = order.clientId
          if (!clientMap.has(cid)) {
            clientMap.set(cid, {
              companyName: order.client.companyName,
              contactName: order.client.contactName,
              city: order.client.city,
              region: order.client.region,
              revenue: 0,
              orderCount: 0,
            })
          }
          const entry = clientMap.get(cid)!
          entry.revenue += order.total
          entry.orderCount++
        }

        const clients = Array.from(clientMap.entries())
          .map(([id, stats]) => ({ id, ...stats, revenue: Math.round(stats.revenue) }))
          .sort((a, b) => b.revenue - a.revenue)

        data = { clients }
        break
      }

      case 'top-products': {
        const orderItems = await db.orderItem.groupBy({
          by: ['productId'],
          where: {
            order: { companyId, createdAt: { gte: start, lte: end } },
          },
          _sum: { quantity: true, totalPrice: true },
          orderBy: { _sum: { quantity: 'desc' } },
          take: 10,
        })

        // Batch: fetch all products in 1 query instead of N
        const productIds = orderItems.map((item) => item.productId)
        const products = await db.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, reference: true, stock: true, price: true },
        })

        const productMap = new Map(products.map((p) => [p.id, p]))

        const topProducts = orderItems.map((item) => {
          const product = productMap.get(item.productId)
          return {
            id: item.productId,
            name: product?.name || 'Inconnu',
            reference: product?.reference || '',
            quantitySold: item._sum.quantity || 0,
            revenue: Math.round(item._sum.totalPrice || 0),
            stock: product?.stock || 0,
            unitPrice: product?.price || 0,
          }
        })

        data = { topProducts }
        break
      }

      case 'full': {
        // Combined export: salesByCommercial, topProducts, topClients
        const [commercialRes, productRes, clientRes] = await Promise.all([
          // Sales by commercial
          (async () => {
            const commercials = await db.user.findMany({
              where: { companyId, role: { in: ['commercial', 'admin'] } },
              select: { id: true, name: true },
            })
            const commercialIds = commercials.map((c) => c.id)
            const allOrders = await db.order.findMany({
              where: { commercialId: { in: commercialIds }, companyId, createdAt: { gte: start, lte: end } },
              select: { commercialId: true, total: true },
            })
            const ordersByCommercial = new Map<string, number[]>()
            for (const order of allOrders) {
              const cid2 = order.commercialId || ''
              if (!ordersByCommercial.has(cid2)) ordersByCommercial.set(cid2, [])
              ordersByCommercial.get(cid2)!.push(order.total)
            }
            return commercials.map((c) => {
              const totals = ordersByCommercial.get(c.id) || []
              return {
                name: c.name,
                revenue: Math.round(totals.reduce((s, t) => s + t, 0)),
                orderCount: totals.length,
              }
            }).sort((a, b) => b.revenue - a.revenue)
          })(),
          // Top products
          (async () => {
            const orderItems = await db.orderItem.groupBy({
              by: ['productId'],
              where: { order: { companyId, createdAt: { gte: start, lte: end } } },
              _sum: { quantity: true, totalPrice: true },
              orderBy: { _sum: { quantity: 'desc' } },
              take: 20,
            })
            const productIds = orderItems.map((i) => i.productId)
            const products = await db.product.findMany({
              where: { id: { in: productIds } },
              select: { id: true, name: true, reference: true },
            })
            const productMap = new Map(products.map((p) => [p.id, p]))
            return orderItems.map((item) => ({
              name: productMap.get(item.productId)?.name || 'Inconnu',
              reference: productMap.get(item.productId)?.reference || '',
              quantitySold: item._sum.quantity || 0,
              revenue: Math.round(item._sum.totalPrice || 0),
            }))
          })(),
          // Top clients
          (async () => {
            const orders = await db.order.findMany({
              where: { companyId, createdAt: { gte: start, lte: end } },
              include: { client: { select: { companyName: true, contactName: true, city: true, region: true } } },
            })
            const clientMap = new Map<string, { companyName: string; contactName: string; city: string | null; region: string | null; revenue: number; orderCount: number }>()
            for (const order of orders) {
              if (!clientMap.has(order.clientId)) {
                clientMap.set(order.clientId, {
                  companyName: order.client.companyName,
                  contactName: order.client.contactName,
                  city: order.client.city,
                  region: order.client.region,
                  revenue: 0, orderCount: 0,
                })
              }
              const entry = clientMap.get(order.clientId)!
              entry.revenue += order.total
              entry.orderCount++
            }
            return Array.from(clientMap.values())
              .map((c) => ({ ...c, revenue: Math.round(c.revenue) }))
              .sort((a, b) => b.revenue - a.revenue)
          })(),
        ])

        data = {
          salesByCommercial: commercialRes,
          topProducts: productRes,
          topClients: clientRes,
        }
        break
      }

      case 'performance': {
        const now = new Date()

        // Batch: fire all 24 queries (12 months x 2) in parallel via Promise.all
        const monthNames = [
          'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
        ]

        const monthQueries = Array.from({ length: 12 }, (_, i) => {
          const mStart = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
          const mEnd = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 1)
          const label = `${monthNames[mStart.getMonth()]} ${mStart.getFullYear()}`
          return Promise.all([
            db.order.aggregate({
              _sum: { total: true },
              where: { companyId, createdAt: { gte: mStart, lt: mEnd } },
            }),
            db.order.count({
              where: { companyId, createdAt: { gte: mStart, lt: mEnd } },
            }),
          ]).then(([orders, count]) => ({
            month: label,
            revenue: Math.round(orders._sum.total || 0),
            orderCount: count,
          }))
        })

        const monthlyData = await Promise.all(monthQueries)

        // Compute growth
        const thisMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0
        const lastMonthRevenue = monthlyData[monthlyData.length - 2]?.revenue || 0
        const growthPercent = lastMonthRevenue > 0
          ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 1000) / 10
          : thisMonthRevenue > 0 ? 100 : 0

        const totalPeriodRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0)
        const avgMonthlyRevenue = monthlyData.length > 0
          ? Math.round(totalPeriodRevenue / monthlyData.length)
          : 0

        data = {
          monthly: monthlyData,
          thisMonthRevenue,
          lastMonthRevenue,
          growthPercent,
          avgMonthlyRevenue,
          totalPeriodRevenue,
        }
        break
      }

      default:
        return NextResponse.json({ error: 'Type de rapport invalide' }, { status: 400 })
    }

    const periodLabels: Record<string, string> = {
      week: 'cette semaine',
      month: 'ce mois',
      year: 'cette année',
      '12months': '12 derniers mois',
    }

    return NextResponse.json({
      type,
      period,
      summary: {
        ...summary,
        cards: [
          {
            label: 'Commandes',
            value: new Intl.NumberFormat('fr-FR').format(totalOrders),
            change: periodLabels[period] || period,
            up: totalOrders > 0,
          },
          {
            label: 'Chiffre d\'affaires',
            value: `${new Intl.NumberFormat('fr-FR').format(Math.round(totalRevenue._sum.total || 0))} CFA`,
            change: periodLabels[period] || period,
            up: (totalRevenue._sum.total || 0) > 0,
          },
          {
            label: 'Clients actifs',
            value: new Intl.NumberFormat('fr-FR').format(totalClients),
            change: `${totalClients} total`,
            up: totalClients > 0,
          },
          {
            label: 'Produits actifs',
            value: new Intl.NumberFormat('fr-FR').format(totalProducts),
            change: 'en catalogue',
            up: true,
          },
        ],
      },
      ...data,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
