import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

// ─── POST: Public registration ──────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const companyId = await getCompanyId()
    const body = await request.json()
    const { name, email, phone, password } = body

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

    // Check if email already exists in the company
    const existing = await db.user.findFirst({
      where: { email, companyId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà.' },
        { status: 409 }
      )
    }

    // Create the user with hashed password
    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        password: await bcrypt.hash(password, 10),
        role: 'commercial',
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
        },
        message: 'Compte créé avec succès.',
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
