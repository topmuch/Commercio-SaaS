import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getCategoryBreadcrumb } from '@/lib/categories';

/**
 * GET /api/categories/[categoryId]/breadcrumb - Get category breadcrumb path
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getAuthSession();

    // Extract companyId from session (depending on auth implementation)
    const companyId = (session as any)?.user?.companyId || request.headers.get('x-company-id');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No company found' },
        { status: 401 }
      );
    }

    const { categoryId } = await params;

    const result = await getCategoryBreadcrumb(categoryId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 404 });
    }
  } catch (error) {
    console.error('Error in GET /api/categories/[categoryId]/breadcrumb:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}