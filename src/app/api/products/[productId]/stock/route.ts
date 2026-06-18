import { NextRequest, NextResponse } from 'next/server'
import { updateProductStock } from '@/lib/products'

/**
 * POST /api/products/[productId]/stock
 * Update product stock
 *
 * Request body:
 * {
 *   quantity: number
 *   movementType: 'entry' | 'exit' | 'adjustment' | 'inventory'
 *   reason?: string
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params
    const body = await request.json()
    const { quantity, movementType, reason } = body

    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Quantity must be a positive number',
        },
        { status: 400 }
      )
    }

    const validMovementTypes = ['entry', 'exit', 'adjustment', 'inventory']
    if (!validMovementTypes.includes(movementType)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid movement type. Must be: entry, exit, adjustment, or inventory',
        },
        { status: 400 }
      )
    }

    const result = await updateProductStock(productId, quantity, movementType, reason)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/products/[productId]/stock:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}