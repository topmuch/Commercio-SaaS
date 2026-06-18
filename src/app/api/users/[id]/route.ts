import { db } from '@/lib/db'
import { getCompanyId, hashPassword, isHashedPassword } from '@/lib/auth'
import { NextResponse } from 'next/server'

// ─── PUT: Update a user ────────────────────────────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params
    const body = await request.json()
    const { name, email, phone, role, active, password } = body

    // Check user exists in this company
    const existing = await db.user.findFirst({
      where: { id, companyId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Utilisateur non trouvé.' }, { status: 404 })
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

    // Validate role if provided
    const validRoles = ['super_admin', 'admin', 'director', 'commercial', 'accountant']
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Rôle invalide.' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (phone !== undefined) updateData.phone = phone || null
    if (role) updateData.role = role
    if (active !== undefined) updateData.active = active
    if (password && password.length >= 6) {
      // Only hash if not already hashed
      if (!isHashedPassword(password)) {
        updateData.password = await hashPassword(password)
      } else {
        updateData.password = password
      }
    }

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

// ─── DELETE: Deactivate a user (soft delete) ─────────────────────────────
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params

    // Check user exists in this company
    const existing = await db.user.findFirst({
      where: { id, companyId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Utilisateur non trouvé.' }, { status: 404 })
    }

    // Prevent deactivating the last admin
    if (existing.role === 'admin' || existing.role === 'super_admin') {
      const adminCount = await db.user.count({
        where: { companyId, role: { in: ['admin', 'super_admin'] }, active: true, id: { not: id } },
      })
      if (adminCount === 0) {
        return NextResponse.json(
          { error: 'Impossible de désactiver le dernier administrateur.' },
          { status: 400 }
        )
      }
    }

    // Soft delete
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
