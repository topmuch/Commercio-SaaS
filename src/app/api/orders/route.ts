import { NextRequest, NextResponse } from 'next/server'
import {
  createOrder,
  listOrders,
  getOrderStatistics,
} from '@/lib/orders'

/**
 * GET /api/orders
 * List orders with filtering and pagination
 * Query params: search, clientId, commercialId, status, minDate, maxDate, minTotal, maxTotal, sortBy, sortOrder, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const options = {
      search: searchParams.get('search') || undefined,
      clientId: searchParams.get('clientId') || undefined,
      commercialId: searchParams.get('commercialId') || undefined,
      status: searchParams.get('status') as any || undefined,
      minDate: searchParams.get('minDate') ? new Date(searchParams.get('minDate')!) : undefined,
      maxDate: searchParams.get('maxDate') ? new Date(searchParams.get('maxDate')!) : undefined,
      minTotal: searchParams.get('minTotal') ? parseFloat(searchParams.get('minTotal')!) : undefined,
      maxTotal: searchParams.get('maxTotal') ? parseFloat(searchParams.get('maxTotal')!) : undefined,
      sortBy: searchParams.get('sortBy') as any || undefined,
      sortOrder: searchParams.get('sortOrder') as any || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    }

    // Check if statistics are requested
    if (searchParams.get('stats') === 'true') {
      const result = await getOrderStatistics()
      if (result.success) {
        return NextResponse.json(result, { status: 200 })
      } else {
        return NextResponse.json(result, { status: 400 })
      }
    }

    const result = await listOrders(options)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/orders GET:', error)
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
 * POST /api/orders
 * Create a new order
 *
 * Request body:
 * {
 *   clientId: string
 *   commercialId?: string
 *   status?: 'new' | 'validated' | 'preparation' | 'shipped' | 'delivered' | 'cancelled'
 *   items: Array<{
 *     productId: string
 *     quantity: number
 *     unitPrice: number
 *   }>
 *   discount?: number
 *   tax?: number
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await createOrder(body)

    if (result.success) {
      return NextResponse.json(result, { status: 201 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/orders POST:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while creating the order',
      },
      { status: 500 }
    )
  }
}