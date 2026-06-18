import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/categories
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId()
    const categories = await db.category.findMany({
      where: { companyId },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ data: categories })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la récupération des catégories'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/categories
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    // Verify the company exists
    const company = await db.company.findUnique({ where: { id: companyId } })
    if (!company) {
      return NextResponse.json(
        { error: 'Entreprise introuvable. Veuillez contacter l\'administrateur.' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, parentId } = body

    if (!name) {
      return NextResponse.json({ error: 'Le nom de la catégorie est requis' }, { status: 400 })
    }

    // Validate parentId if provided
    if (parentId) {
      const parentExists = await db.category.findUnique({
        where: { id: parentId },
      })
      if (!parentExists) {
        return NextResponse.json(
          { error: 'Catégorie parente introuvable' },
          { status: 400 }
        )
      }
    }

    const category = await db.category.create({
      data: { name, parentId: parentId || null, companyId },
    })
    return NextResponse.json(category)
  } catch (error: unknown) {
    console.error('[POST /api/categories] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
