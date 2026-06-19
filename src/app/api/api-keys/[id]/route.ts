import { db } from '@/lib/db'
import { getAuthSession, getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/api-keys/[id] - Update an API key
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const companyId = await getCompanyId()
    const { id } = await params
    const body = await request.json()

    // Verify the key belongs to the company
    const existingKey = await db.apiKey.findFirst({
      where: {
        id,
        companyId,
      },
    })

    if (!existingKey) {
      return NextResponse.json({ error: 'Clé API non trouvée' }, { status: 404 })
    }

    // Update only allowed fields
    const allowedUpdates: Record<string, unknown> = {}
    if (typeof body.isActive === 'boolean') {
      allowedUpdates.isActive = body.isActive
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'Aucun champ valide à mettre à jour' },
        { status: 400 }
      )
    }

    const updatedKey = await db.apiKey.update({
      where: { id },
      data: allowedUpdates,
      select: {
        id: true,
        name: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ data: updatedKey })
  } catch (error: unknown) {
    console.error('[PATCH /api/api-keys/:id] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/api-keys/[id] - Delete an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const companyId = await getCompanyId()
    const { id } = await params

    // Verify the key belongs to the company
    const existingKey = await db.apiKey.findFirst({
      where: {
        id,
        companyId,
      },
    })

    if (!existingKey) {
      return NextResponse.json({ error: 'Clé API non trouvée' }, { status: 404 })
    }

    // Delete the key
    await db.apiKey.delete({
      where: { id },
    })

    return NextResponse.json({
      data: {
        id,
        message: 'Clé API supprimée avec succès',
      },
    })
  } catch (error: unknown) {
    console.error('[DELETE /api/api-keys/:id] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}