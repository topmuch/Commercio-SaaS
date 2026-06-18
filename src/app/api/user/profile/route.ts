import { db } from '@/lib/db'
import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/user/profile — Get the current user's profile
export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        active: true,
        companyId: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: user })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Échec du chargement du profil'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/user/profile — Mettre à jour le profil utilisateur
export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    const body = await request.json()
    const { name, email, phone } = body

    // Vérifier que l'utilisateur existe
    const existing = await db.user.findUnique({
      where: { id: userId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 }
      )
    }

    // Ne mettre à jour que les champs fournis
    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (email !== undefined) data.email = email
    if (phone !== undefined) data.phone = phone

    const user = await db.user.update({
      where: { id: userId },
      data,
    })

    return NextResponse.json({ data: user })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Échec de la mise à jour du profil'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
