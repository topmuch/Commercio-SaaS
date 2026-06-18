import { db } from '@/lib/db'
import { getAuthSession, isAdmin, getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const VALID_SCOPES = [
  'clients:read',
  'clients:write',
  'products:read',
  'products:write',
  'orders:read',
  'orders:write',
  'quotes:read',
  'quotes:write',
  'invoices:read',
  'invoices:write',
  'reports:read',
]

// POST /api/api-keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const userId = (session.user as { id: string; role: string }).id
    const userRole = (session.user as { id: string; role: string }).role
    const companyId = await getCompanyId()

    // Vérifier que le plan est Enterprise
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    })

    if (company?.plan !== 'enterprise') {
      return NextResponse.json(
        { error: 'L\'accès API est disponible uniquement avec le plan Enterprise' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, scopes, expiresAt } = body

    if (!name) {
      return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 })
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json({ error: 'Les scopes sont obligatoires' }, { status: 400 })
    }

    // Valider les scopes
    const invalidScopes = scopes.filter((scope: string) => !VALID_SCOPES.includes(scope))
    if (invalidScopes.length > 0) {
      return NextResponse.json(
        { error: `Scopes invalides: ${invalidScopes.join(', ')}` },
        { status: 400 }
      )
    }

    // Générer une API key
    const apiKey = `cp_${crypto.randomBytes(32).toString('hex')}`

    const newKey = await db.apiKey.create({
      data: {
        companyId,
        userId,
        name,
        key: apiKey,
        scopes: JSON.stringify(scopes),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
    })

    return NextResponse.json({
      data: {
        id: newKey.id,
        name: newKey.name,
        key: newKey.key, // Only shown once
        scopes: JSON.parse(newKey.scopes),
        expiresAt: newKey.expiresAt,
        createdAt: newKey.createdAt,
      },
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/api-keys] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/api-keys - List API keys
export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    const companyId = await getCompanyId()

    // Vérifier que le plan est Enterprise
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    })

    if (company?.plan !== 'enterprise') {
      return NextResponse.json(
        { error: 'L\'accès API est disponible uniquement avec le plan Enterprise' },
        { status: 403 }
      )
    }

    const keys = await db.apiKey.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        key: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const keysWithParsedScopes = keys.map(key => ({
      ...key,
      scopes: JSON.parse(key.scopes),
      key: key.key.substring(0, 20) + '...', // Cacher la clé
    }))

    return NextResponse.json({ data: keysWithParsedScopes })
  } catch (error: unknown) {
    console.error('[GET /api/api-keys] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}