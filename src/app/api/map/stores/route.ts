import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// ─── Senegal Region Geographic Centers ────────────────────────────────────
// Approximate lat/lng for each of Senegal's 14 administrative regions.
// Used for rendering density circles (region overlays) on the strategic map.

interface RegionCenter {
  name: string
  lat: number
  lng: number
}

const SENEGAL_REGION_CENTERS: RegionCenter[] = [
  { name: 'Dakar',        lat: 14.6937, lng: -17.4441 },
  { name: 'Thiès',        lat: 14.7936, lng: -16.9371 },
  { name: 'Saint-Louis',  lat: 16.4581, lng: -16.4530 },
  { name: 'Louga',        lat: 15.6139, lng: -16.2181 },
  { name: 'Diourbel',     lat: 14.6500, lng: -16.2364 },
  { name: 'Fatick',       lat: 13.9094, lng: -16.4131 },
  { name: 'Kaolack',      lat: 14.1755, lng: -16.0797 },
  { name: 'Kaffrine',     lat: 14.1069, lng: -15.5414 },
  { name: 'Tambacounda',  lat: 13.7708, lng: -13.1942 },
  { name: 'Kolda',        lat: 12.8894, lng: -14.9447 },
  { name: 'Ziguinchor',   lat: 12.5833, lng: -16.2244 },
  { name: 'Sédhiou',      lat: 12.7078, lng: -15.5589 },
  { name: 'Kédougou',     lat: 12.5564, lng: -12.1733 },
  { name: 'Matam',        lat: 15.6581, lng: -13.2978 },
]

// ─── Client Type Labels ───────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  boutique: 'Boutique',
  revendeur: 'Revendeur',
  supermarche: 'Supermarché',
  grossiste: 'Grossiste',
}

// ─── Status Color Mapping ────────────────────────────────────────────────
// Colors match the strategic lead-rouge / negociation-orange / client-vert system

const STATUS_COLORS: Record<string, string> = {
  lead_rouge: '#ef4444',
  negociation_orange: '#f97316',
  client_vert: '#22c55e',
}

const STATUS_LABELS: Record<string, string> = {
  lead_rouge: 'Lead Rouge',
  negociation_orange: 'Négociation Orange',
  client_vert: 'Client Vert',
}

// ─── Region Overlay Color by Density ──────────────────────────────────────
// green = low density, yellow = medium, orange = high, red = very high

function getDensityColor(clientCount: number, maxCount: number): string {
  if (maxCount === 0) return '#22c55e'
  const ratio = clientCount / maxCount
  if (ratio <= 0.25) return '#22c55e'   // green  — low
  if (ratio <= 0.50) return '#eab308'   // yellow — medium
  if (ratio <= 0.75) return '#f97316'   // orange — high
  return '#ef4444'                       // red    — very high
}

// ─── GET Handler ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const { getCompanyId } = await import('@/lib/auth')
    const companyId = await getCompanyId()

    // ── Fetch all clients with orders and commercial data ──
    const clients = await db.client.findMany({
      where: { companyId },
      include: {
        commercial: {
          select: { name: true },
        },
        _count: {
          select: { orders: true },
        },
        orders: {
          select: { total: true },
        },
      },
    })

    // ── Enrich clients with calculated revenue ──
    const clientsWithRevenue = clients.map((c) => ({
      id: c.id,
      companyName: c.companyName,
      contactName: c.contactName,
      phone: c.phone,
      whatsapp: c.whatsapp,
      address: c.address,
      city: c.city,
      region: c.region,
      latitude: c.latitude,
      longitude: c.longitude,
      sector: c.sector,
      type: c.type,
      status: c.status,
      commercialName: c.commercial?.name ?? null,
      commercialId: c.commercialId ?? null,
      orderCount: c._count.orders,
      _revenue:
        Math.round(c.orders.reduce((sum, o) => sum + o.total, 0) * 100) / 100,
    }))

    // ── Group by region ──
    const regionMap = new Map<string, typeof clientsWithRevenue>()
    clientsWithRevenue.forEach((c) => {
      const region = c.region || 'Non défini'
      if (!regionMap.has(region)) regionMap.set(region, [])
      regionMap.get(region)!.push(c)
    })

    const regions = Array.from(regionMap.entries()).map(([name, stores]) => ({
      name,
      clientCount: stores.length,
      revenue:
        Math.round(stores.reduce((sum, s) => sum + s._revenue, 0) * 100) / 100,
      stores,
    }))

    // ── Group by type (enhanced with labels) ──
    const typeMap = new Map<string, number>()
    clientsWithRevenue.forEach((c) => {
      typeMap.set(c.type, (typeMap.get(c.type) || 0) + 1)
    })

    const byType = Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      label: TYPE_LABELS[type] || type,
      count,
    }))

    // ── Group by city ──
    const cityMap = new Map<string, number>()
    clientsWithRevenue.forEach((c) => {
      const city = c.city || 'Non défini'
      cityMap.set(city, (cityMap.get(city) || 0) + 1)
    })

    const cities = Array.from(cityMap.entries()).map(([name, count]) => ({
      name,
      count,
    }))

    // ── Status distribution ──
    const statusMap = new Map<string, number>()
    clientsWithRevenue.forEach((c) => {
      statusMap.set(c.status, (statusMap.get(c.status) || 0) + 1)
    })

    const total = clientsWithRevenue.length

    const statusDistribution = Array.from(statusMap.entries()).map(
      ([status, count]) => ({
        status,
        label: STATUS_LABELS[status] || status,
        count,
        percentage:
          total > 0
            ? Math.round((count / total) * 100)
            : 0,
        color: STATUS_COLORS[status] || '#6b7280',
      })
    )

    // ── Region overlays (density circles for all 14 Senegal regions) ──
    // Build a lookup of client counts and revenue per region from DB data
    const regionClientCountMap = new Map<string, number>()
    const regionRevenueMap = new Map<string, number>()
    regions.forEach((r) => {
      regionClientCountMap.set(r.name, r.clientCount)
      regionRevenueMap.set(r.name, r.revenue)
    })

    const maxRegionClientCount = Math.max(
      ...Array.from(regionClientCountMap.values()),
      1
    )

    const regionOverlays = SENEGAL_REGION_CENTERS.map((rc) => {
      const clientCount = regionClientCountMap.get(rc.name) || 0
      const revenue =
        Math.round((regionRevenueMap.get(rc.name) || 0) * 100) / 100

      return {
        name: rc.name,
        center: { lat: rc.lat, lng: rc.lng },
        radius: Math.max(15000, clientCount * 8000),
        clientCount,
        revenue,
        color: clientCount > 0
          ? getDensityColor(clientCount, maxRegionClientCount)
          : '#22c55e',
      }
    })

    // ── Top 5 performing clients by revenue ──
    const topClients = [...clientsWithRevenue]
      .sort((a, b) => b._revenue - a._revenue)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        companyName: c.companyName,
        contactName: c.contactName,
        phone: c.phone,
        whatsapp: c.whatsapp,
        address: c.address,
        city: c.city,
        region: c.region,
        latitude: c.latitude,
        longitude: c.longitude,
        sector: c.sector,
        type: c.type,
        status: c.status,
        commercialName: c.commercialName,
        commercialId: c.commercialId,
        orderCount: c.orderCount,
        _revenue: c._revenue,
      }))

    // ── Coverage stats ──
    const regionsWithClients = regions.filter(
      (r) => r.clientCount > 0
    ).length
    const totalRegions = SENEGAL_REGION_CENTERS.length // 14
    const geoLocatedCount = clientsWithRevenue.filter(
      (c) => c.latitude != null && c.longitude != null
    ).length

    const coverage = {
      regionsCovered: regionsWithClients,
      totalRegions,
      coveragePercent:
        Math.round((regionsWithClients / totalRegions) * 100),
      geoLocatedCount,
      geoLocatedPercent:
        total > 0
          ? Math.round((geoLocatedCount / total) * 100)
          : 0,
    }

    // ── Commercials for filter dropdown ──
    const commercials = await db.user.findMany({
      where: { role: 'commercial', companyId, active: true },
      select: { id: true, name: true },
    })

    // ── Aggregate totals ──
    const totalRevenue =
      Math.round(
        clientsWithRevenue.reduce((sum, c) => sum + c._revenue, 0) * 100
      ) / 100

    return NextResponse.json({
      data: {
        clients: clientsWithRevenue,
        regions,
        byType,
        cities,
        commercials,
        totalClients: total,
        totalRevenue,
        regionOverlays,
        statusDistribution,
        topClients,
        coverage,
      },
      count: total,
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Erreur serveur interne'
    console.error('Map Stores API error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
