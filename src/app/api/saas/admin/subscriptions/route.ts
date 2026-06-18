import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/saas/admin/subscriptions - Get all subscriptions
export async function GET() {
  try {
    const subscriptions = await db.subscription.findMany({
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: subscriptions })
  } catch (error: unknown) {
    console.error('[GET /api/saas/admin/subscriptions] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}