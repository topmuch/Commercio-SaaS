import { getCompanyId } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/clients/[id] - Get a single client with all related data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()

    const { id } = await params

    const client = await db.client.findUnique({
      where: { id, companyId },
      include: {
        commercial: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            commercial: {
              select: { name: true },
            },
          },
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            commercial: {
              select: { name: true },
            },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          include: {
            commercial: {
              select: { name: true },
            },
          },
        },
        visits: {
          orderBy: { createdAt: 'desc' },
          include: {
            commercial: {
              select: { name: true },
            },
          },
        },
        discussions: {
          orderBy: { createdAt: 'desc' },
          include: {
            commercial: {
              select: { name: true },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé.' }, { status: 404 })
    }

    // Calculate totals
    const totalRevenue = client.invoices.reduce((sum, inv) => sum + inv.total, 0)
    const totalPaid = client.invoices.reduce((sum, inv) => sum + inv.paid, 0)
    const totalOrdersRevenue = client.orders.reduce((sum, ord) => sum + ord.total, 0)
    const totalQuotesValue = client.quotes.reduce((sum, q) => sum + q.total, 0)
    const totalPayments = client.payments.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      client: {
        ...client,
        stats: {
          totalRevenue,
          totalPaid,
          totalOrdersRevenue,
          totalQuotesValue,
          totalPayments,
          ordersCount: client.orders.length,
          quotesCount: client.quotes.length,
          invoicesCount: client.invoices.length,
          visitsCount: client.visits.length,
          discussionsCount: client.discussions.length,
          paymentsCount: client.payments.length,
        },
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()

    const { id } = await params
    const body = await request.json()

    const client = await db.client.findUnique({ where: { id, companyId } })
    if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 })

    const { companyName, contactName, phone, whatsapp, email, address, city, region, sector, type, status, notes, commercialId } = body
    const updateData: Record<string, unknown> = {}
    if (companyName !== undefined) updateData.companyName = companyName
    if (contactName !== undefined) updateData.contactName = contactName
    if (phone !== undefined) updateData.phone = phone
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp || null
    if (email !== undefined) updateData.email = email || null
    if (address !== undefined) updateData.address = address || null
    if (city !== undefined) updateData.city = city || null
    if (region !== undefined) updateData.region = region || null
    if (sector !== undefined) updateData.sector = sector || null
    if (type !== undefined) updateData.type = type
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes || null

    // Validate commercialId FK before updating — silently ignore invalid references
    if (commercialId !== undefined) {
      if (commercialId) {
        const commercialExists = await db.user.findFirst({
          where: { id: commercialId, companyId },
          select: { id: true },
        })
        updateData.commercialId = commercialExists ? commercialId : null
      } else {
        updateData.commercialId = null
      }
    }

    const updated = await db.client.update({
      where: { id },
      data: updateData,
      include: { commercial: { select: { name: true } } },
    })
    return NextResponse.json({ client: updated })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
