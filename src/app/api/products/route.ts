import { NextRequest, NextResponse } from 'next/server'
import {
  createProduct,
  listProducts,
  getProductStatistics,
  getLowStockProducts,
} from '@/lib/products'

/**
 * GET /api/products
 * List products with filtering and pagination
 * Query params: search, categoryId, brand, status, minPrice, maxPrice, lowStock, outOfStock, sortBy, sortOrder, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const options = {
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      brand: searchParams.get('brand') || undefined,
      status: searchParams.get('status') as any || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      lowStock: searchParams.get('lowStock') === 'true',
      outOfStock: searchParams.get('outOfStock') === 'true',
      sortBy: searchParams.get('sortBy') as any || undefined,
      sortOrder: searchParams.get('sortOrder') as any || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    }

    // Check if statistics are requested
    if (searchParams.get('stats') === 'true') {
      const result = await getProductStatistics()
      if (result.success) {
        return NextResponse.json(result, { status: 200 })
      } else {
        return NextResponse.json(result, { status: 400 })
      }
    }

    // Check if low stock products are requested
    if (searchParams.get('lowStockList') === 'true') {
      const result = await getLowStockProducts()
      if (result.success) {
        return NextResponse.json(result, { status: 200 })
      } else {
        return NextResponse.json(result, { status: 400 })
      }
    }

    const result = await listProducts(options)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/products GET:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/products
 * Create a new product
 *
 * Request body:
 * {
 *   name: string
 *   reference: string
 *   description?: string
 *   price: number
 *   resellerPrice?: number
 *   image?: string
 *   categoryId?: string
 *   brand?: string
 *   stock?: number
 *   minStock?: number
 *   status?: 'active' | 'inactive' | 'archived'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await createProduct(body)

    if (result.success) {
      return NextResponse.json(result, { status: 201 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/products POST:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}