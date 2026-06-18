import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/reports/advanced - Get advanced reports data
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    const { searchParams } = request.nextUrl
    const period = searchParams.get('period') || '30' // days

    const days = parseInt(period, 10)
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // KPIs de base
    const [
      totalClients,
      totalProducts,
      totalOrders,
      totalRevenue,
      avgOrderValue,
      ordersByStatus,
      visitsCount,
      quotesCount,
      invoicesByStatus,
    ] = await Promise.all([
      db.client.count({ where: { companyId } }),
      db.product.count({ where: { companyId } }),
      db.order.count({ where: { companyId } }),
      db.invoice.aggregate({
        where: {
          companyId,
          status: 'paid',
        },
        _sum: { total: true },
      }),
      db.order.aggregate({
        where: { companyId },
        _avg: { total: true },
      }),
      // Commandes par statut
      db.order.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { status: true },
      }),
      db.visit.count({ where: { companyId } }),
      db.quote.count({ where: { companyId } }),
      db.invoice.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { status: true },
        _sum: { total: true },
      }),
    ])

    // Top 5 produits par ventes
    const topProducts = await db.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { companyId },
      },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    })

    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await db.product.findUnique({
          where: { id: item.productId },
          select: { name: true, reference: true, price: true },
        })
        return {
          ...product,
          totalQuantity: item._sum.quantity,
          totalRevenue: item._sum.totalPrice,
        }
      })
    )

    // Top 5 clients par CA
    const topClients = await db.invoice.groupBy({
      by: ['clientId'],
      where: {
        companyId,
        status: 'paid',
      },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    })

    const topClientsWithDetails = await Promise.all(
      topClients.map(async (item) => {
        const client = await db.client.findUnique({
          where: { id: item.clientId },
          select: { companyName: true, contactName: true, city: true },
        })
        return {
          ...client,
          totalRevenue: item._sum.total,
        }
      })
    )

    // Revenus par mois (6 derniers mois)
    const revenueByMonth = await db.$queryRaw`
      SELECT
        strftime('%Y-%m', createdAt) as month,
        SUM(total) as revenue
      FROM Invoice
      WHERE companyId = ${companyId}
        AND status = 'paid'
        AND createdAt >= datetime('now', '-6 months')
      GROUP BY month
      ORDER BY month DESC
    `

    // Commandes par jour (30 derniers jours)
    const ordersByDay = await db.$queryRaw`
      SELECT
        date(createdAt) as day,
        COUNT(*) as orders,
        SUM(total) as revenue
      FROM "Order"
      WHERE companyId = ${companyId}
        AND createdAt >= datetime('now', '-30 days')
      GROUP BY day
      ORDER BY day DESC
    `

    // KPIs période
    const periodRevenue = await db.invoice.aggregate({
      where: {
        companyId,
        status: 'paid',
        createdAt: { gte: startDate },
      },
      _sum: { total: true },
    })

    const periodNewClients = await db.client.count({
      where: {
        companyId,
        createdAt: { gte: startDate },
      },
    })

    const periodOrders = await db.order.count({
      where: {
        companyId,
        createdAt: { gte: startDate },
      },
    })

    // Taux de conversion
    const conversionRate = totalClients > 0
      ? ((totalOrders / totalClients) * 100).toFixed(2)
      : '0'

    const conversionRateQuotes = quotesCount > 0
      ? ((totalOrders / quotesCount) * 100).toFixed(2)
      : '0'

    // Moyenne des paiements
    const avgPaymentDays = await db.invoice.aggregate({
      where: {
        companyId,
        status: 'paid',
        paidAt: { not: null },
      },
      _avg: {
        // Calculer la différence entre paidAt et createdAt (en jours)
        // Pour SQLite, on utilise une requête brute
      },
    })

    return NextResponse.json({
      data: {
        kpis: {
          totalClients,
          totalProducts,
          totalOrders,
          totalRevenue: totalRevenue._sum.total || 0,
          avgOrderValue: avgOrderValue._avg.total || 0,
          visitsCount,
          quotesCount,
          conversionRate: parseFloat(conversionRate),
          conversionRateQuotes: parseFloat(conversionRateQuotes),
        },
        period: {
          days,
          startDate,
          endDate: now,
          orders: periodOrders,
          revenue: periodRevenue._sum.total || 0,
          newClients: periodNewClients,
        },
        topProducts: topProductsWithDetails,
        topClients: topClientsWithDetails,
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count.status,
        })),
        invoicesByStatus: invoicesByStatus.map(item => ({
          status: item.status,
          count: item._count.status,
          total: item._sum.total,
        })),
        revenueByMonth: Array.isArray(revenueByMonth)
          ? revenueByMonth.map((row: any) => ({
              month: row.month,
              revenue: row.revenue,
            }))
          : [],
        ordersByDay: Array.isArray(ordersByDay)
          ? ordersByDay.map((row: any) => ({
              day: row.day,
              orders: row.orders,
              revenue: row.revenue,
            }))
          : [],
      },
    })
  } catch (error: unknown) {
    console.error('[GET /api/reports/advanced] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}