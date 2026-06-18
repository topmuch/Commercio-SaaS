import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import {
  createQuote,
  listQuotes,
  getQuoteStatistics,
  getExpiredQuotes,
} from '@/lib/quotes';

/**
 * GET /api/quotes - List quotes or get statistics
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
 * - search: search term
 * - sortBy: number|total|createdAt|updatedAt|status|validUntil (default: createdAt)
 * - sortOrder: asc|desc (default: desc)
 * - stats: "true" to get statistics
 * - expired: "true" to get expired quotes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Check if statistics requested
    if (searchParams.get('stats') === 'true') {
      const result = await getQuoteStatistics(session.user.companyId);
      return NextResponse.json(result);
    }

    // Check if expired quotes requested
    if (searchParams.get('expired') === 'true') {
      const result = await getExpiredQuotes(session.user.companyId);
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
      ? parseFloat(searchParams.get('minDate')!)
      : undefined;
    const maxTotal = searchParams.get('maxTotal')
      ? parseFloat(searchParams.get('maxTotal')!)
      : undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy =
      (searchParams.get('sortBy') as 'number' | 'total' | 'createdAt' | 'updatedAt' | 'status' | 'validUntil') ||
      'createdAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const minDate = minDateStr ? new Date(minDateStr) : undefined;
    const maxDate = maxDateStr ? new Date(maxDateStr) : undefined;

    const result = await listQuotes(session.user.companyId, session.user.role, session.user.id, {
      page,
      pageSize,
      clientId,
      commercialId,
      status,
      minDate,
      maxDate,
      minTotal,
      maxTotal,
      search,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/quotes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quotes - Create a new quote
 * Body: {
 *   clientId: string,
 *   commercialId?: string,
 *   items: [{ productId, quantity, unitPrice, discount? }],
 *   discount?: number,
 *   tax?: number,
 *   notes?: string,
 *   validUntil?: Date
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { clientId, commercialId, items, discount, tax, notes, validUntil } = body;

    const result = await createQuote(session.user.companyId, {
      clientId,
      commercialId: commercialId || session.user.id,
      items,
      discount,
      tax,
      notes,
      validUntil: validUntil ? new Date(validUntil) : undefined,
    });

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/quotes:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}