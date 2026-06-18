import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCompanyId } from '@/lib/auth'

// GET /api/mobile/orders?limit=20&status=new
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const { searchParams } = request.nextUrl
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)

    const where: Record<string, unknown> = { companyId }
    if (status) {
      where.status = status
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: {
            select: { companyName: true, contactName: true, phone: true, whatsapp: true, city: true },
          },
          commercial: {
            select: { name: true },
          },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.order.count({ where }),
    ])

    return NextResponse.json({
      orders: orders.map(o => ({
        id: o.id,
        number: o.number,
        status: o.status,
        total: o.total,
        discount: o.discount,
        tax: o.tax,
        notes: o.notes,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
        client: o.client,
        commercial: o.commercial,
        itemCount: o._count.items,
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

// POST /api/mobile/orders — Create order with items (mobile-specific)
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const body = await request.json()
    const {
      clientId,
      commercialId,
      items,
      discount = 0,
      tax = 0,
      notes,
    } = body

    if (!clientId) {
      return NextResponse.json({ error: 'Le client est requis.' }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Au moins un article est requis.' }, { status: 400 })
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
      if (!item.productId || !item.quantity || item.unitPrice === undefined) {
        return NextResponse.json(
          { error: 'Chaque article doit avoir un produit, une quantité et un prix unitaire.' },
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

    // Use transaction for atomic order creation + stock decrement
    const order = await db.$transaction(async (tx) => {
      // Generate order number using transaction-safe count
      const count = await tx.order.count({ where: { companyId } })
      const number = `CMD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

      const created = await tx.order.create({
        data: {
          number,
          status: 'new',
          total: Math.round(total),
          discount,
          tax: Math.round(taxAmount),
          notes: notes || null,
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
          client: { select: { companyName: true, contactName: true, phone: true, whatsapp: true, city: true } },
          commercial: { select: { name: true } },
          items: {
            include: {
              product: { select: { name: true, reference: true, image: true } },
            },
          },
        },
      })

      // Decrement stock for each ordered product (in same transaction)
      await Promise.all(
        items.map((item: { productId: string; quantity: number }) =>
          tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        )
      )

      return created
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
