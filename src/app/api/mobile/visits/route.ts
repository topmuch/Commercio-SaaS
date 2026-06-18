import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCompanyId } from '@/lib/auth'

// POST /api/mobile/visits — Create a new visit with GPS coordinates
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const body = await request.json()
    const { clientId, commercialId, notes, latitude, longitude, status, type } = body

    if (!clientId) {
      return NextResponse.json({ error: 'Le client est requis.' }, { status: 400 })
    }

    // Validate commercialId FK — if invalid, try to find any user in the company
    let validCommercialId: string | null = commercialId || null
    if (validCommercialId) {
      const commercialExists = await db.user.findFirst({
        where: { id: validCommercialId, companyId },
        select: { id: true },
      })
      if (!commercialExists) validCommercialId = null
    }
    if (!validCommercialId) {
      const anyUser = await db.user.findFirst({
        where: { companyId },
        select: { id: true },
      })
      validCommercialId = anyUser ? anyUser.id : null
    }
    if (!validCommercialId) {
      return NextResponse.json(
        { error: 'Aucun commercial trouvé. Créez d\'abord un utilisateur.' },
        { status: 400 }
      )
    }

    // Check client exists
    const client = await db.client.findUnique({ where: { id: clientId, companyId } })
    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé.' }, { status: 404 })
    }

    const visit = await db.visit.create({
      data: {
        type: type || 'visit',
        notes: notes || null,
        status: status || 'completed',
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        clientId,
        commercialId: validCommercialId,
        companyId,
      },
      include: {
        client: {
          select: { id: true, companyName: true, contactName: true, phone: true, whatsapp: true, address: true, city: true, status: true, latitude: true, longitude: true },
        },
        commercial: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({ visit }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/mobile/visits — List visits for current commercial
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const { searchParams } = request.nextUrl
    const clientId = searchParams.get('clientId') || ''
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const page = parseInt(searchParams.get('page') || '1', 10)

    const where: Record<string, unknown> = { companyId }

    if (clientId) {
      where.clientId = clientId
    }

    const [visits, total] = await Promise.all([
      db.visit.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { companyName: true, contactName: true, city: true, status: true } },
          commercial: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.visit.count({ where }),
    ])

    return NextResponse.json({
      visits: visits.map(v => ({
        id: v.id,
        type: v.type,
        notes: v.notes,
        status: v.status,
        latitude: v.latitude,
        longitude: v.longitude,
        createdAt: v.createdAt.toISOString(),
        client: v.client,
        commercial: v.commercial,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH /api/mobile/visits — Update a visit
export async function PATCH(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const body = await request.json()
    const { id, notes, status } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requis.' }, { status: 400 })
    }

    const visit = await db.visit.findUnique({ where: { id, companyId } })
    if (!visit) {
      return NextResponse.json({ error: 'Visite non trouvée.' }, { status: 404 })
    }

    const updated = await db.visit.update({
      where: { id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
      },
      include: {
        client: { select: { companyName: true, contactName: true, phone: true, whatsapp: true, address: true, city: true, status: true, latitude: true, longitude: true } },
        commercial: { select: { name: true } },
      },
    })

    return NextResponse.json({ visit: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
