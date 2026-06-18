import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/invoices/[id] - Get single invoice with details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true, contactName: true, phone: true, whatsapp: true, city: true, address: true, email: true } },
        commercial: { select: { name: true } },
        items: {
          include: {
            product: { select: { name: true, reference: true } },
          },
        },
        payments: {
          select: { id: true, amount: true, method: true, reference: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!invoice || invoice.companyId !== companyId) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    return NextResponse.json({ data: invoice })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/invoices/[id] - Update invoice or record payment
// If body contains `amount`, it records a payment; otherwise it updates notes/dueDate.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params
    const body = await request.json()

    // Check ownership
    const existing = await db.invoice.findUnique({ where: { id } })
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    // ── Payment recording (body has `amount`) ──
    if (body.amount !== undefined) {
      const { amount, method = 'cash', reference, notes } = body

      if (!amount || amount <= 0) {
        return NextResponse.json(
          { error: 'Un montant valide est requis' },
          { status: 400 }
        )
      }

      const newPaid = existing.paid + amount

      // Create payment record
      const payment = await db.payment.create({
        data: {
          amount,
          method,
          reference,
          notes,
          status: 'completed',
          invoiceId: id,
          clientId: existing.clientId,
          companyId,
        },
      })

      // Determine new status
      let newStatus = 'partially_paid'
      if (newPaid >= existing.total) {
        newStatus = 'paid'
      }

      // Update invoice
      const updated = await db.invoice.update({
        where: { id },
        data: { paid: Math.min(newPaid, existing.total), status: newStatus },
        include: {
          client: { select: { companyName: true, contactName: true } },
          commercial: { select: { name: true } },
          payments: {
            select: { id: true, amount: true, method: true, reference: true, createdAt: true },
          },
        },
      })

      return NextResponse.json({ data: { invoice: updated, payment } })
    }

    // ── Invoice update (notes / dueDate) ──
    const { notes, dueDate } = body
    const data: Record<string, unknown> = {}
    if (notes !== undefined) data.notes = notes
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null

    const invoice = await db.invoice.update({
      where: { id },
      data,
      include: {
        client: { select: { companyName: true, contactName: true } },
        commercial: { select: { name: true } },
        payments: {
          select: { id: true, amount: true, method: true, reference: true, createdAt: true },
        },
      },
    })

    return NextResponse.json({ data: invoice })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/invoices/[id] - Delete invoice with ownership check
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params

    // Check ownership
    const existing = await db.invoice.findUnique({ where: { id } })
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 })
    }

    // Delete associated payments first
    await db.payment.deleteMany({ where: { invoiceId: id } })

    // Delete invoice items, then invoice
    await db.invoiceItem.deleteMany({ where: { invoiceId: id } })
    await db.invoice.delete({ where: { id } })

    return NextResponse.json({ data: { id } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
