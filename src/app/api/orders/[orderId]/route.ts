import { NextRequest, NextResponse } from 'next/server'
import {
  getOrderById,
  updateOrderStatus,
  updateOrderNotes,
} from '@/lib/orders'

/**
 * GET /api/orders/[orderId]
 * Get an order by ID
 */
export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params
    const result = await getOrderById(orderId)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 404 })
    }
  } catch (error) {
    console.error('[API] Error in /api/orders/[orderId] GET:', error)
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
 * PATCH /api/orders/[orderId]
 * Update order status or notes
 *
 * Request body:
 * {
 *   status?: 'new' | 'validated' | 'preparation' | 'shipped' | 'delivered' | 'cancelled'
 *   notes?: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params
    const body = await request.json()
    const { status, notes } = body

    if (status) {
      const validStatuses = ['new', 'validated', 'preparation', 'shipped', 'delivered', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          },
          { status: 400 }
        )
      }

      const result = await updateOrderStatus(orderId, status)

      if (result.success) {
        return NextResponse.json(result, { status: 200 })
      } else {
        return NextResponse.json(result, { status: 400 })
      }
    } else if (notes !== undefined) {
      const result = await updateOrderNotes(orderId, notes)

      if (result.success) {
        return NextResponse.json(result, { status: 200 })
      } else {
        return NextResponse.json(result, { status: 400 })
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          message: 'Either status or notes must be provided',
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[API] Error in /api/orders/[orderId] PATCH:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}