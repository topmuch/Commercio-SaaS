import { NextRequest, NextResponse } from 'next/server'
import { getInvoicePaymentHistory } from '@/lib/payments'

/**
 * GET /api/payments/invoice/[invoiceId] - Get payment history for an invoice
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    const { invoiceId } = params

    // Get company ID from header
    const companyId = request.headers.get('x-company-id')
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const result = await getInvoicePaymentHistory(invoiceId, companyId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error getting invoice payment history:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get invoice payment history' },
      { status: error instanceof Error && error.message === 'Invoice not found' ? 404 : 500 }
    )
  }
}