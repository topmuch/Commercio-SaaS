import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/saas/admin/companies - Get all companies
export async function GET() {
  try {
    const companies = await db.company.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        plan: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            clients: true,
            products: true,
            orders: true,
            subscriptions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: companies })
  } catch (error: unknown) {
    console.error('[GET /api/saas/admin/companies] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}