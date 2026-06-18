import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/store/[slug]/product/[id] — Public endpoint (no auth required)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params

    if (!slug || slug.length < 3) {
      return NextResponse.json(
        { error: 'Identifiant de boutique invalide' },
        { status: 400 }
      )
    }

    // Find store settings by slug
    const settings = await db.storeSettings.findUnique({
      where: { publicSlug: slug },
      select: { id: true, companyId: true, isActive: true },
    })

    if (!settings || !settings.isActive) {
      return NextResponse.json(
        { error: 'Boutique introuvable ou désactivée' },
        { status: 404 }
      )
    }

    // Fetch product (must belong to this company and be active)
    const product = await db.product.findFirst({
      where: {
        id,
        companyId: settings.companyId,
        status: 'active',
      },
      include: {
        category: {
          select: { name: true, id: true },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Produit introuvable' },
        { status: 404 }
      )
    }

    // Fetch related products (same category, different id, limit 4)
    const relatedProducts = await db.product.findMany({
      where: {
        companyId: settings.companyId,
        status: 'active',
        id: { not: id },
        ...(product.categoryId ? { categoryId: product.categoryId } : {}),
      },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { name: true } },
      },
    })

    return NextResponse.json({
      data: {
        product,
        relatedProducts,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors du chargement du produit'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}