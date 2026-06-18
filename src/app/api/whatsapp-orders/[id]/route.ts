import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isAdmin } from '@/lib/auth'

// PUT /api/whatsapp-orders/[id] — update status
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await isAdmin()
    if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

    const { id } = await params
    const existing = await db.whatsappOrder.findFirst({ where: { id } })
    if (!existing) return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })

    const body = await request.json()
    const order = await db.whatsappOrder.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    })

    return NextResponse.json({ data: order })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}