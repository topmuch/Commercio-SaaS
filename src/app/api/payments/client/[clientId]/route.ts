import { NextRequest, NextResponse } from 'next/server'
import { getClientPaymentHistory } from '@/lib/payments'

/**
 * GET /api/payments/client/[clientId] - Get payment history for a client
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params

    // Get company ID from header
    const companyId = request.headers.get('x-company-id')
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Parse pagination
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    const result = await getClientPaymentHistory(clientId, companyId, page, pageSize)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error getting client payment history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get client payment history' },
      { status: error instanceof Error && error.message === 'Client not found' ? 404 : 500 }
    )
  }
}