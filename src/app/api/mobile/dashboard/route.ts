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

    // ─── User info ───
    const user = await db.user.findFirst({
      where: { companyId, role: { in: ['commercial', 'admin', 'director'] } },
      select: { id: true, name: true, email: true, phone: true, role: true, avatar: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!user) {
      return NextResponse.json({ error: 'ID utilisateur requis' }, { status: 401 })
    }
    const userId = user.id

    // ─── Today's visits ───
    const todayVisits = await db.visit.findMany({
      where: {
        companyId,
        commercialId: userId,
        createdAt: { gte: todayStart, lt: todayEnd },
      },
      include: {
        client: { select: { companyName: true, contactName: true, status: true, city: true, address: true, latitude: true, longitude: true, phone: true, whatsapp: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // ─── Today's orders ───
    const todayOrders = await db.order.findMany({
      where: {
        companyId,
        commercialId: userId,
        createdAt: { gte: todayStart, lt: todayEnd },
      },
      select: { id: true, number: true, total: true, status: true, createdAt: true, client: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0)

    // ─── Monthly stats ───
    const monthOrders = await db.order.findMany({
      where: { companyId, commercialId: userId, createdAt: { gte: monthStart, lt: monthEnd } },
      select: { total: true },
    })
    const monthRevenue = monthOrders.reduce((sum, o) => sum + o.total, 0)
    const monthOrderCount = monthOrders.length

    const activeClients = await db.client.count({
      where: { companyId, commercialId: userId },
    })

    const totalVisits = await db.visit.count({
      where: { companyId, commercialId: userId, createdAt: { gte: monthStart, lt: monthEnd } },
    })

    // Visit rate: visits this month / total active clients * 100
    const visitRate = activeClients > 0 ? Math.round((totalVisits / activeClients) * 100) : 0

    // ─── Targets ───
    const targets = await db.target.findMany({
      where: {
        userId,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: 'desc' },
    })

    const visitTarget = targets.find(t => t.type === 'visits')
    const revenueTarget = targets.find(t => t.type === 'revenue')

    // ─── Tour clients: clients assigned to this commercial, sorted by most recent visit (least recent first = priority) ───
    const assignedClients = await db.client.findMany({
      where: { companyId, commercialId: userId, status: { in: ['lead_rouge', 'negociation_orange', 'client_vert'] } },
      select: {
        id: true, companyName: true, contactName: true, status: true, city: true,
        address: true, latitude: true, longitude: true, phone: true, whatsapp: true,
        _count: { select: { visits: true } },
      },
      orderBy: { companyName: 'asc' },
    })

    // Find which clients have NOT been visited today
    const visitedClientIds = new Set(todayVisits.map(v => v.clientId))
    const tourClients = assignedClients
      .filter(c => !visitedClientIds.has(c.id))
      .slice(0, 5)

    // ─── Recent activity (last 5 actions) ───
    const recentVisits = await db.visit.findMany({
      where: { companyId, commercialId: userId },
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const recentOrders = await db.order.findMany({
      where: { companyId, commercialId: userId },
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    // Merge and sort recent activity
    const recentActivity = [
      ...recentVisits.map(v => ({
        id: v.id,
        type: 'visit' as const,
        label: `Visite — ${v.client.companyName}`,
        createdAt: v.createdAt.toISOString(),
      })),
      ...recentOrders.map(o => ({
        id: o.id,
        type: 'order' as const,
        label: `Commande ${o.number} — ${o.client.companyName}`,
        createdAt: o.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    return NextResponse.json({
      user: user || { id: userId, name: 'Agent Terrain', email: '', phone: '', role: 'commercial' },
      todayVisits: todayVisits.map(v => ({
        id: v.id,
        type: v.type,
        notes: v.notes,
        status: v.status,
        latitude: v.latitude,
        longitude: v.longitude,
        createdAt: v.createdAt.toISOString(),
        client: v.client,
      })),
      todayOrderCount: todayOrders.length,
      todayRevenue: Math.round(todayRevenue),
      monthlyStats: {
        revenue: Math.round(monthRevenue),
        orderCount: monthOrderCount,
        activeClients,
        visitRate,
        totalVisits,
      },
      targets: {
        visits: visitTarget ? { target: visitTarget.value, achieved: visitTarget.achieved } : null,
        revenue: revenueTarget ? { target: revenueTarget.value, achieved: revenueTarget.achieved } : null,
      },
      tourClients,
      recentActivity,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
