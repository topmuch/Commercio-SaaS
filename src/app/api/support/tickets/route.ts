import { db } from '@/lib/db'
import { getCompanyId, getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/support/tickets - Create a new support ticket
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const companyId = await getCompanyId()
    const body = await request.json()
    const { subject, description, priority, category } = body

    if (!subject || !description || !category) {
      return NextResponse.json(
        { error: 'Le sujet, la description et la catégorie sont obligatoires' },
        { status: 400 }
      )
    }

    const validPriorities = ['low', 'normal', 'high', 'urgent']
    const validCategories = ['technical', 'billing', 'feature', 'bug', 'question']

    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json({ error: 'Priorité invalide' }, { status: 400 })
    }

    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 })
    }

    // Vérifier si le plan inclut le support prioritaire
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    })

    const hasPrioritySupport = company?.plan === 'pro' || company?.plan === 'enterprise'

    // Si plan starter, limiter à normal ou low
    if (!hasPrioritySupport && (priority === 'high' || priority === 'urgent')) {
      return NextResponse.json(
        { error: 'Le support prioritaire est disponible avec les plans Pro et Enterprise' },
        { status: 403 }
      )
    }

    const ticket = await db.supportTicket.create({
      data: {
        companyId,
        userId,
        subject,
        description,
        priority: priority || 'normal',
        category,
        status: 'open',
      },
    })

    // Envoyer une notification (simulée)
    await sendSupportNotification(ticket, 'created')

    return NextResponse.json({
      data: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        createdAt: ticket.createdAt,
        message: 'Ticket créé avec succès',
      },
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/support/tickets] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/support/tickets - List support tickets
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const companyId = await getCompanyId()
    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const category = searchParams.get('category')

    const where: Record<string, unknown> = { companyId }
    if (status) where.status = status
    if (priority) where.priority = priority
    if (category) where.category = category

    const tickets = await db.supportTicket.findMany({
      where,
      include: {
        user: {
          select: { name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ data: tickets })
  } catch (error: unknown) {
    console.error('[GET /api/support/tickets] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Helper: Envoyer une notification de support
async function sendSupportNotification(ticket: any, type: string) {
  // Pour un vrai système, utiliser un service de notifications (email, SMS, push)
  console.log(`[Support Notification] ${type}: Ticket ${ticket.id} created by user ${ticket.userId}`)

  // Envoyer un email à l'équipe support
  // await sendEmail({
  //   to: 'support@commercio.com',
  //   subject: `Nouveau ticket #${ticket.id} - ${ticket.subject}`,
  //   body: `Un nouveau ticket a été créé.`,
  // })
}