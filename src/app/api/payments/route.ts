import { NextRequest, NextResponse } from 'next/server'
import {
  createPayment,
  listPayments,
  getPaymentStatistics,
  CreatePaymentInput,
  PaymentFilters,
} from '@/lib/payments'

/**
 * GET /api/payments - List payments or get statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stats = searchParams.get('stats') === 'true'

    // Get company ID from header (in a real app, this would come from authentication)
    const companyId = request.headers.get('x-company-id')
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    // Return statistics if requested
    if (stats) {
      const statistics = await getPaymentStatistics(companyId)
      return NextResponse.json({ statistics })
    }

    // Parse filters
    const filters: PaymentFilters = {
      clientId: searchParams.get('clientId') || undefined,
      invoiceId: searchParams.get('invoiceId') || undefined,
      method: (searchParams.get('method') as any) || undefined,
      status: (searchParams.get('status') as any) || undefined,
      search: searchParams.get('search') || undefined,
      dateFrom: searchParams.get('dateFrom')
        ? new Date(searchParams.get('dateFrom')!)
        : undefined,
      dateTo: searchParams.get('dateTo')
        ? new Date(searchParams.get('dateTo')!)
        : undefined,
      minAmount: searchParams.get('minAmount')
        ? parseFloat(searchParams.get('minAmount')!)
        : undefined,
      maxAmount: searchParams.get('maxAmount')
        ? parseFloat(searchParams.get('maxAmount')!)
        : undefined,
    }

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    // Parse sorting
    const sortBy = (searchParams.get('sortBy') as 'createdAt' | 'amount') || 'createdAt'
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'

    const result = await listPayments(companyId, filters, sortBy, sortOrder, page, pageSize)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error listing payments:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list payments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/payments - Create a new payment
 */
export async function POST(request: NextRequest) {
  try {
    // Get company ID from header
    const companyId = request.headers.get('x-company-id')
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.amount || !body.method || !body.clientId) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, method, clientId' },
        { status: 400 }
      )
    }

    const paymentData: CreatePaymentInput = {
      amount: body.amount,
      method: body.method,
      reference: body.reference,
      status: body.status,
      notes: body.notes,
      invoiceId: body.invoiceId,
      clientId: body.clientId,
      companyId,
    }

    const payment = await createPayment(companyId, paymentData)
    return NextResponse.json({ payment }, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment' },
      { status: 500 }
    )
  }
}