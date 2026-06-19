import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/saas/admin/companies/[id] - Suspend/Activate/Delete company
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { action } = body
    const { id } = await params

    if (!action) {
      return NextResponse.json({ error: 'Action requise' }, { status: 400 })
    }

    const company = await db.company.findUnique({
      where: { id },
    })

    if (!company) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 })
    }

    if (action === 'suspend') {
      // Deactivate all users
      await db.user.updateMany({
        where: { companyId: id },
        data: { active: false },
      })

      return NextResponse.json({
        data: { message: 'Entreprise suspendue avec succès' },
      })
    }

    if (action === 'activate') {
      // Reactivate all users
      await db.user.updateMany({
        where: { companyId: id },
        data: { active: true },
      })

      return NextResponse.json({
        data: { message: 'Entreprise activée avec succès' },
      })
    }

    return NextResponse.json({ error: 'Action non valide' }, { status: 400 })
  } catch (error: unknown) {
    console.error('[PATCH /api/saas/admin/companies/:id] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/saas/admin/companies/[id] - Delete a company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const company = await db.company.findUnique({
      where: { id },
    })

    if (!company) {
      return NextResponse.json({ error: 'Entreprise non trouvée' }, { status: 404 })
    }

    // Delete all related data (cascade will handle this)
    await db.company.delete({
      where: { id },
    })

    return NextResponse.json({
      data: { message: 'Entreprise supprimée avec succès' },
    })
  } catch (error: unknown) {
    console.error('[DELETE /api/saas/admin/companies/:id] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}