import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/categories/[id] - Update category (name, description, parentId)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params
    const body = await request.json()
    const { name, description, parentId } = body

    // Check ownership
    const existing = await db.category.findUnique({
      where: { id },
      include: { products: { take: 1 } },
    })
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
    }

    // Prevent setting self as parent
    if (parentId === id) {
      return NextResponse.json(
        { error: 'Une catégorie ne peut pas être son propre parent' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (parentId !== undefined) updateData.parentId = parentId

    // Note: Category model doesn't have description field, but we handle it gracefully
    // If description is sent, we ignore it (not in schema)

    const category = await db.category.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { products: true, children: true } },
        parent: { select: { name: true, id: true } },
      },
    })

    return NextResponse.json({ data: category })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId()
    const { id } = await params

    // Check ownership and relations
    const existing = await db.category.findUnique({
      where: { id },
      include: {
        products: { select: { id: true } },
        children: { select: { id: true } },
      },
    })
    if (!existing || existing.companyId !== companyId) {
      return NextResponse.json({ error: 'Catégorie non trouvée' }, { status: 404 })
    }

    // Check if any products are linked
    if (existing.products.length > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer cette catégorie : ${existing.products.length} produit(s) y sont lié(s). Veuillez les déplacer d'abord.` },
        { status: 400 }
      )
    }

    // Reassign children to parent
    if (existing.children.length > 0) {
      await db.category.updateMany({
        where: { parentId: id },
        data: { parentId: existing.parentId },
      })
    }

    await db.category.delete({ where: { id } })

    return NextResponse.json({ data: { id }, reassignedChildren: existing.children.length })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
