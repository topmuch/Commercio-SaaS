import { NextRequest, NextResponse } from 'next/server'
import {
  getPaymentById,
  updatePayment,
  updatePaymentStatus,
  deletePayment,
  UpdatePaymentInput,
} from '@/lib/payments'

/**
 * GET /api/payments/[paymentId] - Get payment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { paymentId } = params

    // Get company ID from header
    const companyId = request.headers.get('x-company-id')
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const payment = await getPaymentById(paymentId, companyId)
    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Error getting payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get payment' },
      { status: error instanceof Error && error.message === 'Payment not found' ? 404 : 500 }
    )
  }
}

/**
 * PATCH /api/payments/[paymentId] - Update payment
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { paymentId } = params

    // Get company ID from header
    const companyId = request.headers.get('x-company-id')
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Check if updating status only
    if (body.status !== undefined && Object.keys(body).length === 1) {
      const payment = await updatePaymentStatus(paymentId, companyId, body.status)
      return NextResponse.json({ payment })
    }

    // Otherwise, update payment details
    const updateData: UpdatePaymentInput = {
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.method !== undefined && { method: body.method }),
      ...(body.reference !== undefined && { reference: body.reference }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.invoiceId !== undefined && { invoiceId: body.invoiceId }),
    }

    const payment = await updatePayment(paymentId, companyId, updateData)
    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update payment' },
      { status: error instanceof Error && error.message === 'Payment not found' ? 404 : 500 }
    )
  }
}

/**
 * DELETE /api/payments/[paymentId] - Delete payment
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { paymentId } = params

    // Get company ID from header
    const companyId = request.headers.get('x-company-id')
    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      )
    }

    const result = await deletePayment(paymentId, companyId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete payment' },
      { status: error instanceof Error && error.message === 'Payment not found' ? 404 : 500 }
    )
  }
}