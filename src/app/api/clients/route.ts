import { getCompanyId } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/clients - List clients with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''
    const region = searchParams.get('region') || ''
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const where: Record<string, unknown> = { companyId }

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactName: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

    if (region) {
      where.region = region
    }

    const skip = (page - 1) * limit

    const [clients, total, statusCountsResult] = await Promise.all([
      db.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          sector: true,
          type: true,
          status: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          commercialId: true,
          commercial: {
            select: {
              name: true,
            },
          },
          _count: {
            select: {
              orders: true,
              quotes: true,
              invoices: true,
              visits: true,
            },
          },
        },
      }),
      db.client.count({ where }),
      // Status counts for ALL clients (not just current page)
      db.client.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { status: true },
      }),
    ])

    const statusCounts = Object.fromEntries(
      statusCountsResult.map((r) => [r.status, r._count.status])
    )

    // Calculate revenue (CA) per client from invoices
    const revenues = await db.invoice.groupBy({
      by: ['clientId'],
      where: {
        companyId,
        clientId: { in: clients.map((c) => c.id) },
      },
      _sum: { total: true },
    })

    const revenueMap = new Map(
      revenues.map((r) => [r.clientId, r._sum.total || 0])
    )

    const clientsWithRevenue = clients.map((client) => ({
      ...client,
      revenue: revenueMap.get(client.id) || 0,
    }))

    return NextResponse.json({
      clients: clientsWithRevenue,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/clients - Create a new client
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const body = await request.json()

    const {
      companyName,
      contactName,
      phone,
      whatsapp,
      email,
      address,
      city,
      region,
      sector,
      type,
      status,
      notes,
      commercialId,
    } = body

    if (!companyName || !contactName || !phone) {
      return NextResponse.json(
        { error: 'Les champs société, responsable et téléphone sont requis.' },
        { status: 400 }
      )
    }

    // Validate commercialId FK before creating — silently ignore invalid references
    let validCommercialId: string | null = commercialId || null
    if (validCommercialId) {
      const commercialExists = await db.user.findFirst({
        where: { id: validCommercialId, companyId },
        select: { id: true },
      })
      if (!commercialExists) {
        validCommercialId = null
      }
    }

    const client = await db.client.create({
      data: {
        companyName,
        contactName,
        phone,
        whatsapp: whatsapp || null,
        email: email || null,
        address: address || null,
        city: city || null,
        region: region || null,
        sector: sector || null,
        type: type || 'boutique',
        status: status || 'lead_rouge',
        notes: notes || null,
        commercialId: validCommercialId,
        companyId,
      },
      include: {
        commercial: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/clients?id=... - Delete a client
export async function DELETE(request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    const client = await db.client.findUnique({ where: { id, companyId } })
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

    await db.client.delete({ where: { id } })
    return NextResponse.json({ data: { id } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
