import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import {
  createCategory,
  listCategories,
  getCategoryTree,
  getCategoryStatistics,
  searchCategories,
} from '@/lib/categories';

/**
 * GET /api/categories - List categories or get category tree/stats
 * Query params:
 * - page: page number (default: 1)
 * - pageSize: items per page (default: 20)
 * - parentId: filter by parent category (null for root)
 * - search: search by name
 * - sortBy: name|createdAt|updatedAt (default: name)
 * - sortOrder: asc|desc (default: asc)
 * - tree: "true" to get category tree
 * - stats: "true" to get statistics
 * - q: search query
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
      const result = await getCategoryStatistics(session.user.companyId);
      return NextResponse.json(result);
    }

    // Check if tree requested
    if (searchParams.get('tree') === 'true') {
      const result = await getCategoryTree(session.user.companyId);
      return NextResponse.json(result);
    }

    // Check if search query provided
    const searchQuery = searchParams.get('q');
    if (searchQuery) {
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const result = await searchCategories(
        session.user.companyId,
        searchQuery,
        limit
      );
      return NextResponse.json(result);
    }

    // Parse list options
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const parentId = searchParams.get('parentId') || undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy =
      (searchParams.get('sortBy') as 'name' | 'createdAt' | 'updatedAt') ||
      'name';
    const sortOrder =
      (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc';

    const result = await listCategories(session.user.companyId, {
      page,
      pageSize,
      parentId,
      search,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/categories:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories - Create a new category
 * Body: { name: string, parentId?: string, image?: string }
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
    const { name, parentId, image } = body;

    const result = await createCategory(session.user.companyId, {
      name,
      parentId,
      image,
    });

    if (result.success) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/categories:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}