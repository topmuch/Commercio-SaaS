import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// DELETE /api/posts/[id] - Delete a post (ownership + role check)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const session = await getAuthSession()
    const { id } = await params

    // Verify the post exists and belongs to the same company
    const post = await db.post.findUnique({
      where: { id },
      select: { id: true, authorId: true, companyId: true },
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Publication non trouvée.' },
        { status: 404 }
      )
    }

    // Check company ownership
    if (post.companyId !== companyId) {
      return NextResponse.json(
        { error: 'Non autorisé.' },
        { status: 403 }
      )
    }

    // Only the author or an admin can delete
    const userId = (session?.user as { id?: string })?.id
    const userRole = (session?.user as { role?: string })?.role
    if (post.authorId !== userId && userRole !== 'company_admin' && userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Seul l\'auteur ou un administrateur peut supprimer cette publication.' },
        { status: 403 }
      )
    }

    // Delete the post (attachments and reactions are cascade deleted via schema)
    await db.post.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      data: { id },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
