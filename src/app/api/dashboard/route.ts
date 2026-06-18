import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getCompanyId } from '@/lib/auth'

export async function GET() {
  try {
    const companyId = await getCompanyId()

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    // Previous month for growth comparison
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)

    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    const yesterdayEnd = todayStart

    // ─── Revenue & counts (batched) ───
    const [
      todayOrders,
      yesterdayOrders,
      monthOrders,
      prevMonthOrders,
      orderCount,
      quoteCount,
      clientCount,
      prevMonthOrderCount,
      currentMonthOrderCount,
      prevMonthClientCount,
      currentMonthClientCount,
      leadRougeCount,
      negociationOrangeCount,
      clientVertCount,
    ] = await Promise.all([
      // Revenue today
      db.order.aggregate({
        _sum: { total: true },
        where: { companyId, createdAt: { gte: todayStart, lt: todayEnd } },
      }),
      // Revenue yesterday
      db.order.aggregate({
        _sum: { total: true },
        where: { companyId, createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
      }),
      // Revenue this month
      db.order.aggregate({
        _sum: { total: true },
        where: { companyId, createdAt: { gte: monthStart, lt: monthEnd } },
      }),
      // Revenue prev month
      db.order.aggregate({
        _sum: { total: true },
        where: { companyId, createdAt: { gte: prevMonthStart, lt: prevMonthEnd } },
      }),
      // Counts
      db.order.count({ where: { companyId } }),
      db.quote.count({ where: { companyId } }),
      db.client.count({ where: { companyId } }),
      // Growth counts
      db.order.count({ where: { companyId, createdAt: { gte: prevMonthStart, lt: prevMonthEnd } } }),
      db.order.count({ where: { companyId, createdAt: { gte: monthStart, lt: monthEnd } } }),
      db.client.count({ where: { companyId, createdAt: { gte: prevMonthStart, lt: prevMonthEnd } } }),
      db.client.count({ where: { companyId, createdAt: { gte: monthStart, lt: monthEnd } } }),
      // Client status distribution
      db.client.count({ where: { companyId, status: 'lead_rouge' } }),
      db.client.count({ where: { companyId, status: 'negociation_orange' } }),
      db.client.count({ where: { companyId, status: 'client_vert' } }),
    ])

    const revenueToday = todayOrders._sum.total || 0
    const revenueYesterday = yesterdayOrders._sum.total || 0
    const revenueMonth = monthOrders._sum.total || 0
    const revenuePrevMonth = prevMonthOrders._sum.total || 0

    // ─── Growth percentages ───
    const revenueTodayGrowth =
      revenueYesterday > 0
        ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100
        : revenueToday > 0
          ? 100
          : 0

    const revenueMonthGrowth =
      revenuePrevMonth > 0
        ? ((revenueMonth - revenuePrevMonth) / revenuePrevMonth) * 100
        : revenueMonth > 0
          ? 100
          : 0

    const orderGrowth =
      prevMonthOrderCount > 0
        ? ((currentMonthOrderCount - prevMonthOrderCount) / prevMonthOrderCount) * 100
        : currentMonthOrderCount > 0
          ? 100
          : 0

    const clientGrowth =
      prevMonthClientCount > 0
        ? ((currentMonthClientCount - prevMonthClientCount) / prevMonthClientCount) * 100
        : currentMonthClientCount > 0
          ? 100
          : 0

    const clientStatusDistribution = {
      leadRouge: leadRougeCount,
      negociationOrange: negociationOrangeCount,
      clientVert: clientVertCount,
    }

    // ─── Top 5 products (no N+1: use include) ───
    const topProductsRaw = await db.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { companyId },
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    })

    const productIds = topProductsRaw.map((item) => item.productId)
    const productInfos = productIds.length > 0
      ? await db.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, reference: true, image: true },
        })
      : []
    const productMap = new Map(productInfos.map((p) => [p.id, p]))

    const topProducts = topProductsRaw.map((item) => {
      const product = productMap.get(item.productId)
      return {
        id: item.productId,
        name: product?.name || 'Inconnu',
        reference: product?.reference || '',
        totalSold: item._sum.quantity || 0,
        revenue: item._sum.totalPrice || 0,
        image: product?.image || undefined,
      }
    })

    // ─── Top 5 commercials (batched revenue query) ───
    const commercials = await db.user.findMany({
      where: { companyId, role: { in: ['commercial', 'admin'] } },
      select: {
        id: true,
        name: true,
        avatar: true,
        _count: { select: { clients: true, orders: true } },
        targets: {
          where: { type: 'revenue' },
          select: { value: true, achieved: true, period: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    // Single aggregate query for all commercial revenues
    const commercialIds = commercials.map((u) => u.id)
    const commercialRevenues = commercialIds.length > 0
      ? await db.order.groupBy({
          by: ['commercialId'],
          where: { commercialId: { in: commercialIds }, companyId },
          _sum: { total: true },
        })
      : []
    const revenueByCommercial = new Map(
      commercialRevenues.map((r) => [r.commercialId, r._sum.total || 0])
    )

    const topCommercials = commercials
      .map((user) => {
        const revenue = revenueByCommercial.get(user.id) || 0
        const target = user.targets[0]
        const targetAchieved =
          target && target.value > 0 ? (target.achieved / target.value) * 100 : 0

        return {
          id: user.id,
          name: user.name,
          avatar: user.avatar || undefined,
          revenue,
          clientCount: user._count.clients,
          orderCount: user._count.orders,
          targetAchieved: Math.min(targetAchieved, 100),
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // ─── Revenue chart data (batched 12 months) ───
    const monthNames = [
      'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
      'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
    ]
    const monthlyRevenuePromises: Promise<{ month: string; value: number }>[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      monthlyRevenuePromises.push(
        db.order
          .aggregate({
            _sum: { total: true },
            where: { companyId, createdAt: { gte: d, lt: mEnd } },
          })
          .then((result) => ({
            month: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
            value: Math.round(result._sum.total || 0),
          }))
      )
    }
    const revenueChartData = await Promise.all(monthlyRevenuePromises)

    // ─── Recent orders (last 5) ───
    const recentOrders = await db.order.findMany({
      where: { companyId },
      include: {
        client: { select: { companyName: true } },
        commercial: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const recentOrdersFormatted = recentOrders.map((order) => ({
      id: order.id,
      number: order.number,
      client: order.client.companyName,
      total: order.total,
      status: order.status,
      date: order.createdAt.toISOString(),
      commercial: order.commercial?.name,
    }))

    return NextResponse.json({
      revenueToday: Math.round(revenueToday),
      revenueMonth: Math.round(revenueMonth),
      orderCount,
      quoteCount,
      clientCount,
      revenueTodayGrowth: Math.round(revenueTodayGrowth * 10) / 10,
      revenueMonthGrowth: Math.round(revenueMonthGrowth * 10) / 10,
      orderGrowth: Math.round(orderGrowth * 10) / 10,
      clientGrowth: Math.round(clientGrowth * 10) / 10,
      clientStatusDistribution,
      topProducts,
      topCommercials,
      revenueChartData,
      recentOrders: recentOrdersFormatted,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
