import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getCompanyId } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// ─── PUT: Update a commercial ──────────────────────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params
    const body = await request.json()
    const { name, email, phone, active, password } = body

    // Check the commercial belongs to this company
    const existing = await db.user.findFirst({
      where: { id, companyId, role: 'commercial' },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Commercial non trouvé.' }, { status: 404 })
    }

    // Check email uniqueness if changed
    if (email && email !== existing.email) {
      const duplicate = await db.user.findFirst({
        where: { email, companyId, id: { not: id } },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'Un utilisateur avec cet email existe déjà.' },
          { status: 409 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (phone !== undefined) updateData.phone = phone || null
    if (active !== undefined) updateData.active = active
    if (password && password.length >= 6) updateData.password = await bcrypt.hash(password, 10)

    const updated = await db.user.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      data: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        active: updated.active,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── DELETE: Deactivate a commercial (soft delete) ─────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params

    // Check the commercial belongs to this company
    const existing = await db.user.findFirst({
      where: { id, companyId, role: 'commercial' },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Commercial non trouvé.' }, { status: 404 })
    }

    // Soft delete: deactivate instead of removing
    await db.user.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
