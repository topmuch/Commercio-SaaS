import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

const VALID_STATUSES = ['new', 'validated', 'preparation', 'shipped', 'delivered']

// GET /api/orders/[id] - Get single order with details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true, contactName: true, phone: true, whatsapp: true, city: true, address: true } },
        commercial: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, reference: true } },
          },
        },
      },
    })

    if (!order || order.companyId !== companyId) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ data: order })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/orders/[id] - Update order notes and/or status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params
    const body = await request.json()
    const { notes, status } = body

    // Check ownership
    const existing = await db.order.findUnique({ where: { id } })
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    // Validate status
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Statut invalide. Valeurs acceptées: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (notes !== undefined) updateData.notes = notes
    if (status !== undefined) updateData.status = status

    const order = await db.order.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({ data: order })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/orders/[id] - Delete order (with ownership check and stock restoration)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params

    // Check ownership
    const existing = await db.order.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    // Delete order items, restore stock, then delete order — all in a transaction
    await db.$transaction(async (tx) => {
      // Restore stock for each order item
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }

      // Delete order items, then the order itself
      await tx.orderItem.deleteMany({ where: { orderId: id } })
      await tx.order.delete({ where: { id } })
    })

    return NextResponse.json({ data: { id } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
