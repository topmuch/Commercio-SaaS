import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/store/[slug] — Public endpoint (no auth required)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug || slug.length < 3) {
      return NextResponse.json(
        { error: 'Identifiant de boutique invalide' },
        { status: 400 }
      )
    }

    // Find store settings by slug
    const settings = await db.storeSettings.findUnique({
      where: { publicSlug: slug },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            address: true,
            phone: true,
          },
        },
      },
    })

    if (!settings || !settings.isActive) {
      return NextResponse.json(
        { error: 'Boutique introuvable ou désactivée' },
        { status: 404 }
      )
    }

    // Fetch active products for this company
    const products = await db.product.findMany({
      where: {
        companyId: settings.companyId,
        status: 'active',
      },
      include: {
        category: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch categories
    const categories = await db.category.findMany({
      where: { companyId: settings.companyId },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      data: {
        store: {
          title: settings.storeTitle,
          description: settings.storeDescription,
          whatsappNumber: settings.whatsappNumber,
          currency: settings.currency,
          logoUrl: settings.logoUrl,
          primaryColor: settings.primaryColor,
          company: settings.company,
        },
        products,
        categories,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors du chargement de la boutique'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
