import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import {
  getInvoiceById,
  updateInvoiceDetails,
  deleteInvoice,
} from '@/lib/invoices';

/**
 * GET /api/invoices/[invoiceId] - Get invoice by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { invoiceId } = await params;

    const result = await getInvoiceById(invoiceId, session.user.companyId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 404 });
    }
  } catch (error) {
    console.error('Error in GET /api/invoices/[invoiceId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/invoices/[invoiceId] - Update invoice
 * Body: { notes?: string, dueDate?: Date }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { invoiceId } = await params;
    const body = await request.json();
    const { notes, dueDate } = body;

    const result = await updateInvoiceDetails(invoiceId, session.user.companyId, {
      notes,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in PATCH /api/invoices/[invoiceId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invoices/[invoiceId] - Delete invoice
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { invoiceId } = await params;

    const result = await deleteInvoice(invoiceId, session.user.companyId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in DELETE /api/invoices/[invoiceId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}