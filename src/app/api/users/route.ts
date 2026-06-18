import { db } from '@/lib/db'
import { getCompanyId, getAuthSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

// ─── GET: List all users ──────────────────────────────────────────────────
export async function GET() {
  try {
    const companyId = await getCompanyId()

    const users = await db.user.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            clients: true,
            orders: true,
            visits: true,
            posts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        avatar: u.avatar,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt,
        counts: u._count,
      })),
      count: users.length,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST: Create a new user ──────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId()
    const session = await getAuthSession()

    // Only admin/super_admin/director can create users
    const callerRole = (session?.user as { role: string }).role
    if (!['admin', 'super_admin', 'director'].includes(callerRole)) {
      return NextResponse.json({ error: 'Accès refusé. Seuls les administrateurs peuvent gérer les utilisateurs.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, phone, password, role } = body

    // Prevent privilege escalation: cannot assign roles higher than caller
    const allowedRoles: Record<string, string[]> = {
      'super_admin': ['super_admin', 'admin', 'director', 'commercial'],
      'admin': ['admin', 'director', 'commercial'],
      'director': ['commercial'],
    }
    const permittedRoles = allowedRoles[callerRole] || []
    if (body.role && !permittedRoles.includes(body.role)) {
      return NextResponse.json({ error: 'Rôle non autorisé' }, { status: 403 })
    }

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Le nom, l\'email et le mot de passe sont obligatoires.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 }
      )
    }

    const validRoles = ['super_admin', 'admin', 'director', 'commercial', 'accountant']
    const userRole = role && validRoles.includes(role) ? role : 'commercial'

    // Check if email already exists in the company
    const existing = await db.user.findFirst({
      where: { email, companyId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cet email existe déjà.' },
        { status: 409 }
      )
    }

    // Create the user (password is hashed)
    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: await bcrypt.hash(password, 10),
        role: userRole,
        active: true,
        companyId,
      },
    })

    return NextResponse.json(
      {
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          active: user.active,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
