import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/clients/[id]/interactions - Create a new interaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()

    const { id } = await params
    const body = await request.json()

    const { type, content, direction, commercialId, latitude, longitude } = body

    if (!type || !content) {
      return NextResponse.json(
        { error: 'Le type et le contenu sont requis.' },
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

    let interaction

    // Visit types (visit, field_visit) go to Visit model
    // Note: Visit.commercialId is required, so we must find a valid user if none provided
    if (type === 'visit') {
      let visitCommercialId = validCommercialId
      if (!visitCommercialId) {
        // Visit requires a commercial — try to find any user in the company
        const anyUser = await db.user.findFirst({
          where: { companyId },
          select: { id: true },
        })
        visitCommercialId = anyUser ? anyUser.id : null
      }
      if (!visitCommercialId) {
        return NextResponse.json(
          { error: 'Aucun commercial trouvé pour cette entreprise. Créez d\'abord un utilisateur.' },
          { status: 400 }
        )
      }
      interaction = await db.visit.create({
        data: {
          type: 'visit',
          notes: content,
          status: 'completed',
          latitude: latitude || null,
          longitude: longitude || null,
          clientId: id,
          commercialId: visitCommercialId,
          companyId,
        },
        include: {
          commercial: { select: { name: true } },
        },
      })
      // Return in unified format
      return NextResponse.json({
        interaction: {
          id: interaction.id,
          type: 'visit',
          content: interaction.notes,
          direction: null,
          createdAt: interaction.createdAt,
          clientId: interaction.clientId,
          commercial: interaction.commercial,
          source: 'visit',
        },
      })
    }

    // All other types go to Discussion model
    interaction = await db.discussion.create({
      data: {
        type: type || 'note', // call, whatsapp, email, message, note
        content,
        direction: direction || 'outgoing',
        clientId: id,
        commercialId: validCommercialId,
        companyId,
      },
      include: {
        commercial: { select: { name: true } },
      },
    })

    return NextResponse.json({
      interaction: {
        id: interaction.id,
        type: interaction.type,
        content: interaction.content,
        direction: interaction.direction,
        createdAt: interaction.createdAt,
        clientId: interaction.clientId,
        commercial: interaction.commercial,
        source: 'discussion',
      },
    }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
