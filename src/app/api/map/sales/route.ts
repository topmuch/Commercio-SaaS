import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getCompanyId } from '@/lib/auth'

export async function GET() {
  try {
    const companyId = await getCompanyId()

    // Get all orders with client region info
    const orders = await db.order.findMany({
      where: { companyId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            city: true,
            region: true,
          },
        },
      },
    })

    // Get all clients grouped by region
    const clients = await db.client.findMany({
      where: { companyId },
      include: {
        commercial: {
          select: { name: true },
        },
        orders: {
          select: { total: true },
        },
      },
    })

    // Calculate revenue by region
    const regionRevenueMap = new Map<string, { revenue: number; clientCount: number; orderCount: number }>()

    clients.forEach((c) => {
      const region = c.region || 'Non défini'
      const revenue = c.orders.reduce((sum, o) => sum + o.total, 0)

      const existing = regionRevenueMap.get(region) || { revenue: 0, clientCount: 0, orderCount: 0 }
      existing.revenue += revenue
      existing.clientCount += 1
      existing.orderCount += c.orders.length
      regionRevenueMap.set(region, existing)
    })

    const regionSales = Array.from(regionRevenueMap.entries())
      .map(([name, data]) => ({
        name,
        revenue: Math.round(data.revenue * 100) / 100,
        clientCount: data.clientCount,
        orderCount: data.orderCount,
        avgRevenue: data.clientCount > 0 ? Math.round((data.revenue / data.clientCount) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)

    const totalRevenue = regionSales.reduce((sum, r) => sum + r.revenue, 0)
    const avgRevenuePerZone =
      regionSales.length > 0
        ? Math.round((totalRevenue / regionSales.length) * 100) / 100
        : 0

    // Calculate by commercial
    const commercialRevenueMap = new Map<string, { name: string; revenue: number; orderCount: number }>()
    orders.forEach((o) => {
      if (o.commercialId) {
        const existing = commercialRevenueMap.get(o.commercialId) || { name: '', revenue: 0, orderCount: 0 }
        existing.revenue += o.total
        existing.orderCount += 1
        commercialRevenueMap.set(o.commercialId, existing)
      }
    })

    // Enrich commercial names
    const commercialNames = await db.user.findMany({
      where: { role: 'commercial', companyId },
      select: { id: true, name: true },
    })
    const commercialSales = commercialNames
      .map((c) => {
        const data = commercialRevenueMap.get(c.id) || { revenue: 0, orderCount: 0 }
        return {
          name: c.name,
          revenue: Math.round(data.revenue * 100) / 100,
          orderCount: data.orderCount,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyOrders = await db.order.findMany({
      where: {
        companyId,
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        total: true,
        createdAt: true,
        client: {
          select: { region: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const monthlyRevenueMap = new Map<string, number>()
    monthlyOrders.forEach((o) => {
      const monthKey = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`
      monthlyRevenueMap.set(monthKey, (monthlyRevenueMap.get(monthKey) || 0) + o.total)
    })

    const monthlyTrend = Array.from(monthlyRevenueMap.entries())
      .map(([month, revenue]) => ({
        month,
        revenue: Math.round(revenue * 100) / 100,
        label: new Date(month + '-01').toLocaleDateString('fr-FR', {
          month: 'short',
          year: '2-digit',
        }),
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return NextResponse.json({
      data: {
        regionSales,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        avgRevenuePerZone,
        bestZone: regionSales[0] || null,
        worstZone: regionSales[regionSales.length - 1] || null,
        commercialSales,
        monthlyTrend,
        totalOrders: orders.length,
      },
      count: regionSales.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
