import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '@/lib/categories';

/**
 * GET /api/categories/[categoryId] - Get category by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { categoryId } = await params;

    const result = await getCategoryById(categoryId, session.user.companyId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 404 });
    }
  } catch (error) {
    console.error('Error in GET /api/categories/[categoryId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/categories/[categoryId] - Update category
 * Body: { name?: string, parentId?: string, image?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { categoryId } = await params;
    const body = await request.json();
    const { name, parentId, image } = body;

    const result = await updateCategory(categoryId, session.user.companyId, {
      name,
      parentId,
      image,
    });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in PATCH /api/categories/[categoryId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories/[categoryId] - Delete category
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { categoryId } = await params;

    const result = await deleteCategory(categoryId, session.user.companyId);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in DELETE /api/categories/[categoryId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}