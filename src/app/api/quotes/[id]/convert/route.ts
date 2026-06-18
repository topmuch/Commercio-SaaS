import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/quotes/[id]/convert - Convert a quote into an order
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params

    // Fetch quote with all needed relations
    const quote = await db.quote.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true } } } },
        client: { select: { id: true } },
        commercial: { select: { id: true } },
      },
    })

    if (!quote || quote.companyId !== companyId) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 })
    }

    if (quote.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Seul un devis accepté peut être converti en commande' },
        { status: 400 }
      )
    }

    // Use a transaction for atomicity
    const result = await db.$transaction(async (tx) => {
      // Generate order number
      const count = await tx.order.count({ where: { companyId } })
      const number = `CMD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

      // Create the order
      const order = await tx.order.create({
        data: {
          number,
          status: 'new',
          total: quote.total,
          discount: quote.discount,
          tax: quote.tax,
          notes: `Converti depuis le devis ${quote.number}`,
          clientId: quote.clientId,
          commercialId: quote.commercialId,
          companyId,
        },
        include: {
          client: { select: { companyName: true, contactName: true, phone: true, whatsapp: true, city: true, address: true } },
          commercial: { select: { name: true } },
        },
      })

      // Create order items from quote items
      for (const item of quote.items) {
        await tx.orderItem.create({
          data: {
            productId: item.productId,
            orderId: order.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          },
        })
      }

      // Decrement stock for each product
      for (const item of quote.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // Update quote status
      await tx.quote.update({
        where: { id },
        data: { status: 'sent' }, // Mark as sent/converted
      })

      return order
    })

    return NextResponse.json({
      data: {
        order: result,
        message: `Devis ${quote.number} converti en commande ${result.number}`,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
