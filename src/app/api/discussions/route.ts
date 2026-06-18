import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getCompanyId } from '@/lib/auth'

// GET /api/discussions?clientId=...&page=1&limit=20
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))

    const where: Record<string, unknown> = { companyId }
    if (clientId) {
      where.clientId = clientId
    }

    // Get clients with their latest discussion and counts
    const clients = await db.client.findMany({
      where,
      include: {
        discussions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        commercial: {
          select: { name: true },
        },
        _count: {
          select: { discussions: true },
        },
      },
      orderBy: {
        discussions: {
          _count: 'desc',
        },
      },
      take: limit,
      skip: (page - 1) * limit,
    })

    // Get discussions with pagination
    const [discussions, discussionTotal] = await Promise.all([
      db.discussion.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              type: true,
            },
          },
          commercial: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.discussion.count({ where }),
    ])

    return NextResponse.json({
      data: {
        clients: clients.map((c) => ({
          id: c.id,
          companyName: c.companyName,
          contactName: c.contactName,
          phone: c.phone,
          whatsapp: c.whatsapp,
          type: c.type,
          status: c.status,
          city: c.city,
          region: c.region,
          commercialName: c.commercial?.name,
          discussionCount: c._count.discussions,
          lastMessage: c.discussions[0]?.content || null,
          lastMessageAt: c.discussions[0]?.createdAt || null,
          lastMessageType: c.discussions[0]?.type || null,
        })),
        discussions,
        pagination: {
          page,
          limit,
          total: discussionTotal,
          totalPages: Math.ceil(discussionTotal / limit),
        },
      },
      count: clients.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
