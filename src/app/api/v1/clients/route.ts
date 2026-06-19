import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// Middleware pour vérifier l'API key
async function verifyApiKey(request: NextRequest, requiredScope: string) {
  const apiKey = request.headers.get('x-api-key')

  if (!apiKey) {
    return { valid: false, error: 'API key manquante', companyId: null, keyId: null }
  }

  const key = await db.apiKey.findUnique({
    where: { key: apiKey, isActive: true },
    include: { company: true },
  })

  if (!key) {
    return { valid: false, error: 'API key invalide ou inactive', companyId: null, keyId: null }
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    return { valid: false, error: 'API key expirée', companyId: null, keyId: null }
  }

  // Vérifier les scopes
  const scopes = JSON.parse(key.scopes)
  if (!scopes.includes(requiredScope)) {
    return { valid: false, error: `Scope '${requiredScope}' non autorisé`, companyId: null, keyId: null }
  }

  // Mettre à jour lastUsedAt
  await db.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  })

  return { valid: true, error: null, companyId: key.companyId, keyId: key.id }
}

// GET /api/v1/clients - List clients (clients:read required)
export async function GET(request: NextRequest) {
  try {
    const verification = await verifyApiKey(request, 'clients:read')

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error },
        { status: 401 }
      )
    }

    const { searchParams } = request.nextUrl
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = { companyId: verification.companyId }

    if (search) {
      where.OR = [
        { companyName: { contains: search } },
        { contactName: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    const skip = (page - 1) * limit

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          phone: true,
          whatsapp: true,
          email: true,
          city: true,
          region: true,
          sector: true,
          type: true,
          status: true,
          latitude: true,
          longitude: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.client.count({ where }),
    ])

    return NextResponse.json({
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: unknown) {
    console.error('[GET /api/v1/clients] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/v1/clients - Create client (clients:write required)
export async function POST(request: NextRequest) {
  try {
    const verification = await verifyApiKey(request, 'clients:write')

    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error },
        { status: 401 }
      )
    }

    if (!verification.companyId) {
      return NextResponse.json(
        { error: 'Company ID introuvable' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      companyName,
      contactName,
      phone,
      whatsapp,
      email,
      address,
      city,
      region,
      sector,
      type,
      latitude,
      longitude,
      notes,
    } = body

    if (!companyName || !contactName || !phone) {
      return NextResponse.json(
        { error: 'companyName, contactName et phone sont obligatoires' },
        { status: 400 }
      )
    }

    const client = await db.client.create({
      data: {
        companyId: verification.companyId,
        companyName,
        contactName,
        phone,
        whatsapp: whatsapp || null,
        email: email || null,
        address: address || null,
        city: city || null,
        region: region || null,
        sector: sector || null,
        type: type || 'boutique',
        latitude,
        longitude,
        notes: notes || null,
      },
    })

    return NextResponse.json({ data: client }, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/v1/clients] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}