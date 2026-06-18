import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/clients/[id]/notes - Get all notes for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()

    const { id } = await params

    const notes = await db.discussion.findMany({
      where: { clientId: id, companyId, type: 'note' },
      orderBy: { createdAt: 'desc' },
      include: {
        commercial: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({ notes })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/clients/[id]/notes - Create a new note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()

    const { id } = await params
    const body = await request.json()

    const { content, commercialId } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Le contenu de la note est requis.' },
        { status: 400 }
      )
    }

    // Check client exists
    const client = await db.client.findUnique({ where: { id, companyId } })
    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé.' }, { status: 404 })
    }

    // Validate commercialId FK — silently ignore invalid references
    let validCommercialId: string | null = commercialId || null
    if (validCommercialId) {
      const commercialExists = await db.user.findFirst({
        where: { id: validCommercialId, companyId },
        select: { id: true },
      })
      if (!commercialExists) validCommercialId = null
    }

    const note = await db.discussion.create({
      data: {
        type: 'note',
        content: content.trim(),
        direction: 'outgoing',
        clientId: id,
        commercialId: validCommercialId,
        companyId,
      },
      include: {
        commercial: {
          select: { name: true },
        },
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
