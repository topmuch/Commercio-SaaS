import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getCompanyId, isAdmin } from '@/lib/auth'

// DELETE /api/store/banners/[id] — Delete a banner by ID
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()

    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Accès refusé. Seuls les administrateurs peuvent supprimer les bannières.' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verify banner belongs to this company
    const banner = await db.storeBanner.findFirst({
      where: { id, companyId },
    })

    if (!banner) {
      return NextResponse.json(
        { error: 'Bannière introuvable' },
        { status: 404 }
      )
    }

    await db.storeBanner.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[DELETE /api/store/banners] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur lors de la suppression de la bannière'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
