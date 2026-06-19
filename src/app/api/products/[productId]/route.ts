import { NextRequest, NextResponse } from 'next/server'
import {
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductStock,
} from '@/lib/products'

/**
 * GET /api/products/[productId]
 * Get a product by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
    const result = await getProductById(productId)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 404 })
    }
  } catch (error) {
    console.error('[API] Error in /api/products/[productId] GET:', error)
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
 * PATCH /api/products/[productId]
 * Update a product
 *
 * Request body: Partial<ProductData>
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
    const body = await request.json()
    const result = await updateProduct(productId, body)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/products/[productId] PATCH:', error)
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
 * DELETE /api/products/[productId]
 * Delete a product
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params
    const result = await deleteProduct(productId)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/products/[productId] DELETE:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}