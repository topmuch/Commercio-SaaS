import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  createInvoice,
  listInvoices,
  getInvoiceStatistics,
  getOverdueInvoices,
} from '@/lib/invoices';

/**
 * GET /api/invoices - List invoices or get statistics
 * Query params:
 * - page: page number (default: 1)
 * - pageSize: items per page (default: 20)
 * - clientId: filter by client
 * - commercialId: filter by commercial
 * - status: filter by status
 * - minDate: filter by minimum date
 * - maxDate: filter by maximum date
 * - minTotal: filter by minimum total
 * - maxTotal: filter by maximum total
 * - isOverdue: "true" to get overdue only
 * - search: search term
 * - sortBy: number|total|createdAt|updatedAt|status|dueDate (default: createdAt)
 * - sortOrder: asc|desc (default: desc)
 * - stats: "true" to get statistics
 * - overdue: "true" to get overdue invoices
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
      const result = await getInvoiceStatistics(session.user.companyId);
      return NextResponse.json(result);
    }

    // Check if overdue invoices requested
    if (searchParams.get('overdue') === 'true') {
      const result = await getOverdueInvoices(session.user.companyId);
      return NextResponse.json(result);
    }

    // Parse list options
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const clientId = searchParams.get('clientId') || undefined;
    const commercialId = searchParams.get('commercialId') || undefined;
    const status = searchParams.get('status') || undefined;
    const minDateStr = searchParams.get('minDate');
    const maxDateStr = searchParams.get('maxDate');
    const minTotal = searchParams.get('minTotal')
      ? parseFloat(searchParams.get('minTotal')!)
      : undefined;
    const maxTotal = searchParams.get('maxTotal')
      ? parseFloat(searchParams.get('maxTotal')!)
      : undefined;
    const isOverdue = searchParams.get('isOverdue') === 'true';
    const search = searchParams.get('search') || undefined;
    const sortBy =
      (searchParams.get('sortBy') as 'number' | 'total' | 'createdAt' | 'updatedAt' | 'status' | 'dueDate') ||
      'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const minDate = minDateStr ? new Date(minDateStr) : undefined;
    const maxDate = maxDateStr ? new Date(maxDateStr) : undefined;

    const result = await listInvoices(session.user.companyId, session.user.role, session.user.id, {
      page,
      pageSize,
      clientId,
      commercialId,
      status,
      minDate,
      maxDate,
      minTotal,
      maxTotal,
      isOverdue,
      search,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/invoices:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices - Create a new invoice
 * Body: {
 *   clientId: string,
 *   commercialId?: string,
 *   orderId?: string,
 *   items: [{ productId, quantity, unitPrice, discount? }],
 *   discount?: number,
 *   tax?: number,
 *   dueDate?: Date,
 *   notes?: string
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
    const { clientId, commercialId, orderId, items, discount, tax, dueDate, notes } = body;

    const result = await createInvoice(session.user.companyId, {
      clientId,
      commercialId: commercialId || session.user.id,
      orderId,
      items,
      discount,
      tax,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
    });

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/invoices:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}