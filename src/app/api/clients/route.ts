import { NextRequest, NextResponse } from 'next/server'
import { createClient, listClients, getClientStatistics } from '@/lib/clients'

/**
 * GET /api/clients
 * List clients with filtering and pagination
 * Query params: search, status, type, commercialId, sector, city, region, sortBy, sortOrder, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const options = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') as any || undefined,
      type: searchParams.get('type') as any || undefined,
      commercialId: searchParams.get('commercialId') || undefined,
      sector: searchParams.get('sector') || undefined,
      city: searchParams.get('city') || undefined,
      region: searchParams.get('region') || undefined,
      sortBy: searchParams.get('sortBy') as any || undefined,
      sortOrder: searchParams.get('sortOrder') as any || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    }

    // Check if statistics are requested
    if (searchParams.get('stats') === 'true') {
      const result = await getClientStatistics()
      if (result.success) {
        return NextResponse.json(result, { status: 200 })
      } else {
        return NextResponse.json(result, { status: 400 })
      }
    }

    const result = await listClients(options)

    if (result.success) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/clients GET:', error)
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
 * POST /api/clients
 * Create a new client
 *
 * Request body:
 * {
 *   companyName: string
 *   contactName: string
 *   phone: string
 *   whatsapp?: string
 *   email?: string
 *   address?: string
 *   city?: string
 *   region?: string
 *   latitude?: number
 *   longitude?: number
 *   sector?: string
 *   type?: 'boutique' | 'revendeur' | 'supermarche' | 'grossiste'
 *   status?: 'lead_rouge' | 'negotiation_orange' | 'client_vert'
 *   notes?: string
 *   commercialId?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await createClient(body)

    if (result.success) {
      return NextResponse.json(result, { status: 201 })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Error in /api/clients POST:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'An unexpected error occurred.',
      },
      { status: 500 }
    )
  }
}