import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// POST /api/saas/admin/companies - Create a new company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, plan, whatsapp } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Nom et email sont obligatoires' }, { status: 400 })
    }

    // Check if email already exists
    const existing = await db.company.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json({ error: 'Une entreprise avec cet email existe déjà' }, { status: 400 })
    }

    // Generate access code
    const accessCode = crypto.randomBytes(6).toString('hex').toUpperCase()

    // Create company
    const company = await db.company.create({
      data: {
        name,
        email,
        phone,
        plan: plan || 'starter',
      },
    })

    // Create admin user with access code
    const tempPassword = crypto.randomBytes(12).toString('hex')
    const user = await db.user.create({
      data: {
        name: `Admin ${name}`,
        email,
        password: tempPassword, // Will be changed on first login
        role: 'admin',
        companyId: company.id,
        active: true,
      },
    })

    // Store access code temporarily (in a real app, use a proper cache)
    // For now, we'll return it
    return NextResponse.json({
      data: {
        company,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        accessCode,
        message: 'Entreprise créée avec succès',
      },
    }, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/saas/admin/companies] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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