import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCompanyId } from '@/lib/auth'

// Haversine formula to calculate distance between two GPS coordinates (in km)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const { searchParams } = request.nextUrl
    const lat = parseFloat(searchParams.get('lat') || '14.6937')
    const lng = parseFloat(searchParams.get('lng') || '-17.4441')
    const radius = parseFloat(searchParams.get('radius') || '50') // km
    const status = searchParams.get('status') || ''
    const city = searchParams.get('city') || ''
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    const where: Record<string, unknown> = { companyId }

    if (status) {
      where.status = status
    }

    if (city) {
      where.city = city
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactName: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const clients = await db.client.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        contactName: true,
        phone: true,
        whatsapp: true,
        email: true,
        address: true,
        city: true,
        region: true,
        latitude: true,
        longitude: true,
        sector: true,
        type: true,
        status: true,
        commercialId: true,
        _count: {
          select: { visits: true, orders: true },
        },
      },
      orderBy: { companyName: 'asc' },
      take: limit,
    })

    // Calculate distance and filter by radius
    const clientsWithDistance = clients
      .map(client => {
        const clientLat = client.latitude
        const clientLng = client.longitude
        let distance: number | null = null

        if (clientLat !== null && clientLng !== null) {
          distance = haversineDistance(lat, lng, clientLat, clientLng)
        }

        return {
          ...client,
          distance: distance ? Math.round(distance * 10) / 10 : null,
        }
      })
      .filter(client => client.distance === null || client.distance <= radius)

    // Sort: clients with known distance first, then alphabetical
    clientsWithDistance.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance
      if (a.distance !== null) return -1
      if (b.distance !== null) return 1
      return a.companyName.localeCompare(b.companyName)
    })

    // Get last visit date per client
    const clientIds = clientsWithDistance.map(c => c.id)
    const lastVisits = await db.visit.groupBy({
      by: ['clientId'],
      where: { clientId: { in: clientIds } },
      _max: { createdAt: true },
    })

    const lastVisitMap = new Map(
      lastVisits.map(v => [v.clientId, v._max.createdAt?.toISOString() || null])
    )

    const result = clientsWithDistance.map(c => ({
      ...c,
      lastVisit: lastVisitMap.get(c.id) || null,
    }))

    // Get unique cities for filter
    const cities = await db.client.findMany({
      where: { companyId, city: { not: null } },
      select: { city: true },
      distinct: ['city'],
      orderBy: { city: 'asc' },
    })

    return NextResponse.json({
      clients: result,
      filters: {
        cities: cities.map(c => c.city).filter(Boolean),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
