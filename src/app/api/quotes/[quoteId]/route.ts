import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import {
  getQuoteById,
  updateQuoteStatus,
  updateQuoteNotes,
  deleteQuote,
} from '@/lib/quotes';

/**
 * GET /api/quotes/[quoteId] - Get quote by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { quoteId } = await params;

    const result = await getQuoteById(quoteId, session.user.companyId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 404 });
    }
  } catch (error) {
    console.error('Error in GET /api/quotes/[quoteId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/quotes/[quoteId] - Update quote
 * Body: { status?: 'draft'|'sent'|'accepted'|'refused', notes?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { quoteId } = await params;
    const body = await request.json();
    const { status, notes } = body;

    // Update status if provided
    if (status) {
      const result = await updateQuoteStatus(
        quoteId,
        session.user.companyId,
        status
      );

      if (result.success) {
        return NextResponse.json(result);
      } else {
        return NextResponse.json(result, { status: 400 });
      }
    }

    // Update notes if provided
    if (notes !== undefined) {
      const result = await updateQuoteNotes(quoteId, session.user.companyId, notes);

      if (result.success) {
        return NextResponse.json(result);
      } else {
        return NextResponse.json(result, { status: 400 });
      }
    }

    // Nothing to update
    return NextResponse.json(
      { success: false, error: 'No valid fields to update' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in PATCH /api/quotes/[quoteId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/quotes/[quoteId] - Delete quote
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { quoteId } = await params;

    const result = await deleteQuote(quoteId, session.user.companyId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in DELETE /api/quotes/[quoteId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}