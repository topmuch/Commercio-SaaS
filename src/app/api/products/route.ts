import { getCompanyId } from '@/lib/auth'
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/products?search=...&category=...&status=...&page=1&limit=20
export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      companyId,
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { reference: { contains: search } },
      ]
    }

    if (category) {
      where.categoryId = category
    }

    if (status) {
      where.status = status
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ])

    return NextResponse.json({
      data: products,
      count: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors du chargement des produits'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/products - Create product
export async function POST(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const body = await request.json()
    const {
      name,
      reference,
      description,
      price,
      resellerPrice,
      image,
      categoryId,
      brand,
      stock,
      minStock,
      status,
    } = body

    if (!name || !reference || price === undefined) {
      return NextResponse.json(
        { error: 'Nom, référence et prix sont requis' },
        { status: 400 }
      )
    }

    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Prix invalide' }, { status: 400 })
    }

    const parsedMinStock = minStock ? parseInt(minStock) : 5
    if (isNaN(parsedMinStock) || parsedMinStock < 0) {
      return NextResponse.json({ error: 'Stock minimum invalide' }, { status: 400 })
    }

    // Check unique reference (per-company)
    const existing = await db.product.findFirst({
      where: { reference, companyId },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Un produit avec cette référence existe déjà' },
        { status: 400 }
      )
    }

    const product = await db.product.create({
      data: {
        name,
        reference,
        description,
        price: parsedPrice,
        resellerPrice: resellerPrice ? parseFloat(resellerPrice) : null,
        image: image || null,
        categoryId: categoryId || null,
        brand: brand || null,
        stock: stock !== undefined ? parseInt(stock) || 0 : 0,
        minStock: parsedMinStock,
        status: status || 'active',
        companyId,
      },
      include: {
        category: { select: { name: true } },
      },
    })

    return NextResponse.json({ data: product }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la création du produit'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/products - Update product
export async function PUT(request: NextRequest) {
  try {
    const companyId = await getCompanyId()

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: "L'identifiant du produit est requis" }, { status: 400 })
    }

    // Verify product belongs to the current company
    const existing = await db.product.findFirst({
      where: { id, companyId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Produit non trouvé' }, { status: 404 })
    }

    // Check unique reference if being updated (per-company), exclude self
    if (updateData.reference) {
      const refExists = await db.product.findFirst({
        where: { reference: updateData.reference, companyId, id: { not: id } },
      })
      if (refExists) {
        return NextResponse.json(
          { error: 'Un produit avec cette référence existe déjà' },
          { status: 400 }
        )
      }
    }

    // Validate numeric fields
    if (updateData.price !== undefined) {
      const parsedPrice = parseFloat(updateData.price)
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ error: 'Prix invalide' }, { status: 400 })
      }
    }
    if (updateData.minStock !== undefined) {
      const parsedMinStock = parseInt(updateData.minStock)
      if (isNaN(parsedMinStock) || parsedMinStock < 0) {
        return NextResponse.json({ error: 'Stock minimum invalide' }, { status: 400 })
      }
    }
    if (updateData.stock !== undefined) {
      const parsedStock = parseInt(updateData.stock)
      if (isNaN(parsedStock) || parsedStock < 0) {
        return NextResponse.json({ error: 'Stock invalide' }, { status: 400 })
      }
    }

    const data: Record<string, unknown> = {}
    if (updateData.name !== undefined) data.name = updateData.name
    if (updateData.reference !== undefined) data.reference = updateData.reference
    if (updateData.description !== undefined) data.description = updateData.description
    if (updateData.price !== undefined) data.price = parseFloat(updateData.price)
    if (updateData.resellerPrice !== undefined)
      data.resellerPrice = updateData.resellerPrice ? parseFloat(updateData.resellerPrice) : null
    if (updateData.image !== undefined) data.image = updateData.image || null
    if (updateData.categoryId !== undefined) data.categoryId = updateData.categoryId || null
    if (updateData.brand !== undefined) data.brand = updateData.brand || null
    if (updateData.minStock !== undefined) data.minStock = parseInt(updateData.minStock)
    if (updateData.stock !== undefined) data.stock = parseInt(updateData.stock)
    if (updateData.status !== undefined) data.status = updateData.status

    const product = await db.product.update({
      where: { id },
      data,
      include: {
        category: { select: { name: true } },
      },
    })

    return NextResponse.json({ data: product })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du produit'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
