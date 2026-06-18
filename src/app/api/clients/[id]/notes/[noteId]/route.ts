import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// DELETE /api/clients/[id]/notes/[noteId] - Delete a specific note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const companyId = await getCompanyId()

    const { id, noteId } = await params

    const note = await db.discussion.findFirst({
      where: { id: noteId, clientId: id, companyId, type: 'note' },
    })

    if (!note) {
      return NextResponse.json({ error: 'Note non trouvée.' }, { status: 404 })
    }

    await db.discussion.delete({
      where: { id: noteId },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
