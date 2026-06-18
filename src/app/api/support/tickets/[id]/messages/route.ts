import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/support/tickets/[id]/messages - Add message to ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getAuthSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const userId = (session.user as { id: string; role: string }).id
    const userRole = (session.user as { id: string; role: string }).role

    const body = await request.json()
    const { content, attachments, isInternal } = body

    if (!content) {
      return NextResponse.json({ error: 'Le contenu est obligatoire' }, { status: 400 })
    }

    // Vérifier si le ticket existe
    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
    }

    // Vérifier les permissions
    const isSupportTeam = userRole === 'super_admin' || userRole === 'admin'
    const isTicketOwner = ticket.userId === userId

    if (!isSupportTeam && !isTicketOwner) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Si message interne, vérifier que c'est un support team
    if (isInternal && !isSupportTeam) {
      return NextResponse.json({ error: 'Seuls les membres du support peuvent envoyer des messages internes' }, { status: 403 })
    }

    const message = await db.supportMessage.create({
      data: {
        ticketId: id,
        senderId: userId,
        senderType: isSupportTeam ? 'support' : 'user',
        content,
        attachments: attachments ? JSON.stringify(attachments) : null,
        isInternal: isInternal || false,
      },
    })

    // Mettre à jour le ticket
    await db.supportTicket.update({
      where: { id },
      data: {
        updatedAt: new Date(),
      },
    })

    // Si réponse de support, mettre à jour le statut
    if (isSupportTeam && ticket.status === 'open') {
      await db.supportTicket.update({
        where: { id },
        data: { status: 'in_progress' },
      })
    }

    return NextResponse.json({
      data: message,
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/support/tickets/[id]/messages] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/support/tickets/[id]/messages - Get ticket messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getAuthSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const userId = (session.user as { id: string; role: string }).id
    const userRole = (session.user as { id: string; role: string }).role

    // Vérifier si le ticket existe
    const ticket = await db.supportTicket.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
    }

    const isSupportTeam = userRole === 'super_admin' || userRole === 'admin'
    const isTicketOwner = ticket.userId === userId

    if (!isSupportTeam && !isTicketOwner) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const messages = await db.supportMessage.findMany({
      where: {
        ticketId: id,
        isInternal: isSupportTeam ? undefined : false, // Cacher les messages internes pour les utilisateurs
      },
      include: {
        // Inclure les infos du sender
      },
      orderBy: { createdAt: 'asc' },
    })

    // Enrichir avec les infos des senders
    const messagesWithSenders = await Promise.all(
      messages.map(async (msg) => {
        const sender = await db.user.findUnique({
          where: { id: msg.senderId },
          select: { name: true, email: true, avatar: true },
        })
        return {
          ...msg,
          sender,
        }
      })
    )

    return NextResponse.json({ data: messagesWithSenders })
  } catch (error: unknown) {
    console.error('[GET /api/support/tickets/[id]/messages] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}