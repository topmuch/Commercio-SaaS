import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCompanyId } from '@/lib/auth'

// GET /api/invoices?status=unpaid&search=&page=1&limit=20
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

    const [invoices, total, statusCountsResult] = await Promise.all([
      db.invoice.findMany({
        where,
        include: {
          client: { select: { companyName: true, contactName: true } },
          commercial: { select: { name: true } },
          payments: {
            select: { id: true, amount: true, method: true, reference: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.invoice.count({ where }),
      // Status counts for ALL invoices
      db.invoice.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { status: true },
      }),
    ])

    const statusCounts = Object.fromEntries(
      statusCountsResult.map((r) => [r.status, r._count.status])
    )
    statusCounts['all'] = total

    // Compute KPIs
    const [totalBilled, totalPaid, unpaidTotal, overdueCount] = await Promise.all([
      db.invoice.aggregate({ _sum: { total: true }, where: { companyId } }),
      db.invoice.aggregate({ _sum: { paid: true }, where: { companyId } }),
      db.invoice.aggregate({
        _sum: { total: true, paid: true },
        where: { companyId, status: { in: ['unpaid', 'partially_paid'] } },
      }),
      db.invoice.count({ where: { companyId, status: 'overdue' } }),
    ])

    const totalBilledAmount = totalBilled._sum.total || 0
    const totalPaidAmount = totalPaid._sum.paid || 0
    const unpaidAmount = (unpaidTotal._sum.total || 0) - (unpaidTotal._sum.paid || 0)

    return NextResponse.json({
      data: invoices,
      count: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts,
      kpi: {
        totalBilled: totalBilledAmount,
        totalPaid: totalPaidAmount,
        totalUnpaid: unpaidAmount,
        overdueCount,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/invoices — Create invoice
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const body = await request.json()
    const {
      clientId,
      commercialId,
      orderId,
      items,
      discount = 0,
      tax = 18,
      dueDate,
      notes,
    } = body

    if (!clientId) {
      return NextResponse.json({ error: 'Le client est requis' }, { status: 400 })
    }

    let subtotal = 0
    const orderItems: { productId: string; quantity: number; unitPrice: number; totalPrice: number }[] = []

    // If no items provided but orderId is given, derive from order
    if ((!items || items.length === 0) && orderId) {
      const order = await db.order.findFirst({
        where: { id: orderId, companyId },
        include: { items: { include: { product: true } } },
      })
      if (!order) {
        return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
      }
      for (const oi of order.items) {
        orderItems.push({
          productId: oi.productId,
          quantity: oi.quantity,
          unitPrice: oi.unitPrice,
          totalPrice: oi.totalPrice,
        })
        subtotal += oi.totalPrice
      }
    } else if (items && items.length > 0) {
      for (const item of items) {
        if (!item.productId || !item.quantity || !item.unitPrice) {
          return NextResponse.json(
            { error: 'Chaque article doit avoir un produit, une quantité et un prix unitaire' },
            { status: 400 }
          )
        }
        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice,
        })
        subtotal += item.quantity * item.unitPrice
      }
    } else {
      return NextResponse.json({ error: 'Au moins un article est requis' }, { status: 400 })
    }

    const discountAmount = (subtotal * discount) / 100
    const taxAmount = ((subtotal - discountAmount) * tax) / 100
    const total = subtotal - discountAmount + taxAmount

    // Use transaction for atomic invoice creation + numbering
    const invoice = await db.$transaction(async (tx) => {
      const count = await tx.invoice.count({ where: { companyId } })
      const number = `FAC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

      return tx.invoice.create({
        data: {
          number,
          status: 'unpaid',
          total,
          paid: 0,
          discount,
          tax: taxAmount,
          dueDate: dueDate ? new Date(dueDate) : null,
          notes,
          orderId,
          clientId,
          commercialId,
          companyId,
          items: {
            create: orderItems,
          },
        },
        include: {
          client: { select: { companyName: true, contactName: true } },
          commercial: { select: { name: true } },
          payments: true,
        },
      })
    })

    return NextResponse.json({ data: invoice }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


