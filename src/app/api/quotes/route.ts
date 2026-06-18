import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCompanyId } from '@/lib/auth'

// GET /api/quotes?status=draft&search=&page=1&limit=20
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))

    const where: Record<string, unknown> = { companyId }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { number: { contains: search } },
        { client: { companyName: { contains: search } } },
        { client: { contactName: { contains: search } } },
        { commercial: { name: { contains: search } } },
      ]
    }

    const [quotes, total] = await Promise.all([
      db.quote.findMany({
        where,
        include: {
          client: { select: { companyName: true, contactName: true } },
          commercial: { select: { name: true } },
          items: {
            include: {
              product: { select: { name: true, reference: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.quote.count({ where }),
    ])

    return NextResponse.json({
      data: quotes,
      count: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/quotes — Create quote with items (transactional)
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const body = await request.json()
    const {
      clientId,
      commercialId,
      items,
      discount = 0,
      tax = 18,
      validUntil,
      notes,
    } = body

    if (!clientId) {
      return NextResponse.json({ error: 'Le client est requis' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Au moins un article est requis' }, { status: 400 })
    }

    // Validate commercialId FK — silently ignore invalid references
    let validCommercialId: string | null = commercialId || null
    if (validCommercialId) {
      const commercialExists = await db.user.findFirst({
        where: { id: validCommercialId, companyId },
        select: { id: true },
      })
      if (!commercialExists) validCommercialId = null
    }

    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice) {
        return NextResponse.json(
          { error: 'Chaque article doit avoir un produit, une quantité et un prix unitaire' },
          { status: 400 }
        )
      }
    }

    // Calculate totals
    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    )
    const discountAmount = (subtotal * discount) / 100
    const taxAmount = ((subtotal - discountAmount) * tax) / 100
    const total = subtotal - discountAmount + taxAmount

    // Use transaction for atomic quote creation + numbering
    const quote = await db.$transaction(async (tx) => {
      const count = await tx.quote.count({ where: { companyId } })
      const number = `DEV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

      return tx.quote.create({
        data: {
          number,
          status: 'draft',
          total,
          discount,
          tax: taxAmount,
          validUntil: validUntil ? new Date(validUntil) : null,
          notes,
          clientId,
          commercialId: validCommercialId,
          companyId,
          items: {
            create: items.map(
              (item: { productId: string; quantity: number; unitPrice: number }) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
              })
            ),
          },
        },
        include: {
          client: { select: { companyName: true, contactName: true } },
          commercial: { select: { name: true } },
          items: {
            include: {
              product: { select: { name: true, reference: true } },
            },
          },
        },
      })
    })

    return NextResponse.json({ data: quote }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
