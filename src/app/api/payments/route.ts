import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  createPayment,
  listPayments,
  getPaymentStatistics,
} from '@/lib/payments';

/**
 * GET /api/payments - List payments or get statistics
 * Query params:
 * - page: page number (default: 1)
 * - pageSize: items per page (default: 20)
 * - clientId: filter by client
 * - invoiceId: filter by invoice
 * - method: filter by method
 * - status: filter by status
 * - minDate: filter by minimum date
 * - maxDate: filter by maximum date
 * - minAmount: filter by minimum amount
 * - maxAmount: filter by maximum amount
 * - search: search term
 * - sortBy: amount|createdAt|updatedAt|method|status (default: createdAt)
 * - sortOrder: asc|desc (default: desc)
 * - stats: "true" to get statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Check if statistics requested
    if (searchParams.get('stats') === 'true') {
      const result = await getPaymentStatistics(session.user.companyId);
      return NextResponse.json(result);
    }

    // Parse list options
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const clientId = searchParams.get('clientId') || undefined;
    const invoiceId = searchParams.get('invoiceId') || undefined;
    const method = searchParams.get('method') || undefined;
    const status = searchParams.get('status') || undefined;
    const minDateStr = searchParams.get('minDate');
    const maxDateStr = searchParams.get('maxDate');
    const minAmount = searchParams.get('minAmount')
      ? parseFloat(searchParams.get('minAmount')!)
      : undefined;
    const maxAmount = searchParams.get('maxAmount')
      ? parseFloat(searchParams.get('maxAmount')!)
      : undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy =
      (searchParams.get('sortBy') as 'amount' | 'createdAt' | 'updatedAt' | 'method' | 'status') ||
      'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const minDate = minDateStr ? new Date(minDateStr) : undefined;
    const maxDate = maxDateStr ? new Date(maxDateStr) : undefined;

    const result = await listPayments(session.user.companyId, {
      page,
      pageSize,
      clientId,
      invoiceId,
      method,
      status,
      minDate,
      maxDate,
      minAmount,
      maxAmount,
      search,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/payments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments - Create a new payment
 * Body: {
 *   clientId: string,
 *   amount: number,
 *   method: 'cash'|'bank_transfer'|'check'|'mobile_payment',
 *   reference?: string,
 *   notes?: string,
 *   invoiceId?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { clientId, amount, method, reference, notes, invoiceId } = body;

    const result = await createPayment(session.user.companyId, {
      clientId,
      amount,
      method,
      reference,
      notes,
      invoiceId,
    });

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/payments:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}