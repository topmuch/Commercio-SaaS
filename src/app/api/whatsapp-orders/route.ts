import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// Simple in-memory rate limiter (60 requests per minute per IP)
const rateLimiter = new Map<string, { count: number; resetAt: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimiter.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  entry.count++
  return entry.count > 60
}

// POST /api/whatsapp-orders — Public endpoint (no auth required)
export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, { status: 429 })
    }

    const body = await request.json()
    const { slug, clientName, clientPhone, items, totalAmount } = body

    if (!slug || !clientName || !clientPhone || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Données de commande manquantes' },
        { status: 400 }
      )
    }

    // Find store settings by slug to get companyId
    const settings = await db.storeSettings.findUnique({
      where: { publicSlug: slug },
      select: { id: true, companyId: true, isActive: true },
    })

    if (!settings || !settings.isActive) {
      return NextResponse.json(
        { error: 'Boutique introuvable ou désactivée' },
        { status: 404 }
      )
    }

    // Save the order
    const order = await db.whatsappOrder.create({
      data: {
        companyId: settings.companyId,
        clientName,
        clientPhone,
        items: JSON.stringify(items),
        totalAmount: parseFloat(totalAmount) || 0,
        status: 'en_attente_validation',
      },
    })

    return NextResponse.json({ data: order }, { status: 201 })
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Erreur lors de l'enregistrement de la commande"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
