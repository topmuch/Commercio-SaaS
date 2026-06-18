'use server';

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';

// ===== TYPES =====
export type CategoryCreateInput = {
  name: string;
  parentId?: string;
  image?: string;
};

export type CategoryUpdateInput = {
  name?: string;
  parentId?: string;
  image?: string;
};

export type CategoryListOptions = {
  page?: number;
  pageSize?: number;
  parentId?: string;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
};

export interface CategoryWithChildren {
  id: string;
  name: string;
  parentId: string | null;
  image: string | null;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  parent: CategoryWithChildren | null;
  children: CategoryWithChildren[];
  productsCount?: number;
}

// ===== VALIDATION =====
export function validateCategoryData(data: CategoryCreateInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Name validation
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Category name is required');
  } else if (data.name.trim().length > 100) {
    errors.push('Category name must be less than 100 characters');
  }

  // Image validation
  if (data.image && data.image.length > 500) {
    errors.push('Image URL must be less than 500 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ===== CATEGORY CRUD OPERATIONS =====

/**
 * Create a new category
 */
export async function createCategory(companyId: string, data: CategoryCreateInput) {
  try {
    // Validate data
    const validation = validateCategoryData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    // Check if parent category exists and belongs to same company
    if (data.parentId) {
      const parentCategory = await db.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parentCategory) {
        return {
          success: false,
          error: 'Parent category not found',
        };
      }

      if (parentCategory.companyId !== companyId) {
        return {
          success: false,
          error: 'Parent category does not belong to this company',
        };
      }

      // Prevent circular references (parent cannot be a child of this new category)
      // This is handled by not allowing parent to be the category itself (not possible at creation)
    }

    // Check if category name already exists in company
    const existingCategory = await db.category.findFirst({
      where: {
        name: data.name.trim(),
        companyId,
      },
    });

    if (existingCategory) {
      return {
        success: false,
        error: 'Category with this name already exists in your company',
      };
    }

    // Create category
    const category = await db.category.create({
      data: {
        name: data.name.trim(),
        parentId: data.parentId,
        image: data.image,
        companyId,
      },
    });

    return {
      success: true,
      data: category,
    };
  } catch (error) {
    console.error('Error creating category:', error);
    return {
      success: false,
      error: 'Failed to create category',
    };
  }
}

/**
 * Get category by ID with details
 */
export async function getCategoryById(categoryId: string, companyId: string) {
  try {
    const category = await db.category.findUnique({
      where: { id: categoryId },
      include: {
        parent: {
          include: {
            parent: {
              include: {
                parent: true,
              },
            },
          },
        },
        children: {
          include: {
            children: true,
          },
        },
      },
    });

    if (!category) {
      return {
        success: false,
        error: 'Category not found',
      };
    }

    if (category.companyId !== companyId) {
      return {
        success: false,
        error: 'Category does not belong to this company',
      };
    }

    // Count products in this category
    const productsCount = await db.product.count({
      where: {
        categoryId,
        companyId,
      },
    });

    return {
      success: true,
      data: {
        ...category,
        productsCount,
      },
    };
  } catch (error) {
    console.error('Error fetching category:', error);
    return {
      success: false,
      error: 'Failed to fetch category',
    };
  }
}

/**
 * List categories with filtering, pagination, and sorting
 */
export async function listCategories(
  companyId: string,
  options: CategoryListOptions = {}
) {
  try {
    const {
      page = 1,
      pageSize = 20,
      parentId,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    // Build where clause
    const where: Prisma.CategoryWhereInput = {
      companyId,
    };

    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }

    if (search) {
      where.name = {
        contains: search,
        // SQLite doesn't support mode: 'insensitive'
      };
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Count total
    const total = await db.category.count({ where });

    // Fetch categories
    const categories = await db.category.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        parent: true,
        children: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: categories,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error('Error listing categories:', error);
    return {
      success: false,
      error: 'Failed to list categories',
    };
  }
}

/**
 * Get category tree (all categories with hierarchy)
 */
export async function getCategoryTree(companyId: string): Promise<{
  success: boolean;
  data?: CategoryWithChildren[];
  error?: string;
}> {
  try {
    // Fetch all categories for the company
    const categories = await db.category.findMany({
      where: {
        companyId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Build tree structure
    const categoryMap = new Map<string, CategoryWithChildren>();
    const rootCategories: CategoryWithChildren[] = [];

    // First pass: create map
    categories.forEach((category) => {
      categoryMap.set(category.id, {
        ...category,
        parent: null,
        children: [],
      });
    });

    // Second pass: build hierarchy
    categories.forEach((category) => {
      const categoryNode = categoryMap.get(category.id)!;

      if (category.parentId && categoryMap.has(category.parentId)) {
        const parent = categoryMap.get(category.parentId)!;
        parent.children.push(categoryNode);
        categoryNode.parent = parent;
      } else {
        rootCategories.push(categoryNode);
      }
    });

    return {
      success: true,
      data: rootCategories,
    };
  } catch (error) {
    console.error('Error fetching category tree:', error);
    return {
      success: false,
      error: 'Failed to fetch category tree',
    };
  }
}

/**
 * Update category
 */
export async function updateCategory(
  categoryId: string,
  companyId: string,
  data: CategoryUpdateInput
) {
  try {
    // Validate data if name is provided
    if (data.name !== undefined) {
      const validation = validateCategoryData({
        name: data.name,
        parentId: data.parentId,
        image: data.image,
      });
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }
    }

    // Check if category exists and belongs to company
    const existingCategory = await db.category.findUnique({
      where: { id: categoryId },
    });

    if (!existingCategory) {
      return {
        success: false,
        error: 'Category not found',
      };
    }

    if (existingCategory.companyId !== companyId) {
      return {
        success: false,
        error: 'Category does not belong to this company',
      };
    }

    // Check for parent category changes
    if (data.parentId !== undefined) {
      // If setting to null, that's fine
      if (data.parentId === null) {
        // OK - removing parent
      } else {
        // Check if parent exists and belongs to same company
        const parentCategory = await db.category.findUnique({
          where: { id: data.parentId },
        });

        if (!parentCategory) {
          return {
            success: false,
            error: 'Parent category not found',
          };
        }

        if (parentCategory.companyId !== companyId) {
          return {
            success: false,
            error: 'Parent category does not belong to this company',
          };
        }

        // Prevent circular reference (can't set parent to itself)
        if (data.parentId === categoryId) {
          return {
            success: false,
            error: 'Category cannot be its own parent',
          };
        }

        // Prevent circular reference (can't set parent to a child)
        const isDescendant = await checkIsDescendant(categoryId, data.parentId);
        if (isDescendant) {
          return {
            success: false,
            error: 'Cannot create circular reference in category hierarchy',
          };
        }
      }
    }

    // Check if category name already exists (if name is being changed)
    if (data.name && data.name !== existingCategory.name) {
      const duplicateCategory = await db.category.findFirst({
        where: {
          name: data.name.trim(),
          companyId,
          id: { not: categoryId },
        },
      });

      if (duplicateCategory) {
        return {
          success: false,
          error: 'Category with this name already exists in your company',
        };
      }
    }

    // Update category
    const category = await db.category.update({
      where: { id: categoryId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.image !== undefined && { image: data.image }),
      },
    });

    return {
      success: true,
      data: category,
    };
  } catch (error) {
    console.error('Error updating category:', error);
    return {
      success: false,
      error: 'Failed to update category',
    };
  }
}

/**
 * Delete category
 */
export async function deleteCategory(categoryId: string, companyId: string) {
  try {
    // Check if category exists and belongs to company
    const category = await db.category.findUnique({
      where: { id: categoryId },
      include: {
        children: true,
        products: true,
      },
    });

    if (!category) {
      return {
        success: false,
        error: 'Category not found',
      };
    }

    if (category.companyId !== companyId) {
      return {
        success: false,
        error: 'Category does not belong to this company',
      };
    }

    // Check if category has children
    if (category.children.length > 0) {
      return {
        success: false,
        error: 'Cannot delete category with child categories. Please delete or move child categories first.',
      };
    }

    // Check if category has products
    if (category.products.length > 0) {
      return {
        success: false,
        error: `Cannot delete category with ${category.products.length} product(s). Please reassign or delete products first.`,
      };
    }

    // Delete category
    await db.category.delete({
      where: { id: categoryId },
    });

    return {
      success: true,
      data: { id: categoryId },
    };
  } catch (error) {
    console.error('Error deleting category:', error);
    return {
      success: false,
      error: 'Failed to delete category',
    };
  }
}

/**
 * Move category to a new parent
 */
export async function moveCategory(
  categoryId: string,
  companyId: string,
  newParentId: string | null
) {
  return updateCategory(categoryId, companyId, { parentId: newParentId });
}

// ===== CATEGORY STATISTICS =====

/**
 * Get category statistics
 */
export async function getCategoryStatistics(companyId: string) {
  try {
    // Total categories
    const totalCategories = await db.category.count({
      where: { companyId },
    });

    // Root categories (no parent)
    const rootCategories = await db.category.count({
      where: {
        companyId,
        parentId: null,
      },
    });

    // Categories with children
    const categoriesWithChildren = await db.category.count({
      where: {
        companyId,
        children: {
          some: {},
        },
      },
    });

    // Categories with products
    const categoriesWithProducts = await db.category.count({
      where: {
        companyId,
        products: {
          some: {},
        },
      },
    });

    // Products count per category (top 5)
    const topCategories = await db.category.findMany({
      where: { companyId },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        products: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    // Empty categories (no products and no children)
    const emptyCategories = await db.category.count({
      where: {
        companyId,
        products: {
          none: {},
        },
        children: {
          none: {},
        },
      },
    });

    return {
      success: true,
      data: {
        totalCategories,
        rootCategories,
        categoriesWithChildren,
        categoriesWithProducts,
        emptyCategories,
        topCategories: topCategories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          productsCount: cat._count.products,
        })),
      },
    };
  } catch (error) {
    console.error('Error fetching category statistics:', error);
    return {
      success: false,
      error: 'Failed to fetch category statistics',
    };
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Check if targetId is a descendant of sourceId (to prevent circular references)
 */
async function checkIsDescendant(sourceId: string, targetId: string): Promise<boolean> {
  // Get all descendants of sourceId
  const descendants = await db.category.findMany({
    where: {
      parentId: sourceId,
    },
  });

  // Check if any descendant matches targetId
  if (descendants.some((cat) => cat.id === targetId)) {
    return true;
  }

  // Recursively check children
  for (const descendant of descendants) {
    if (await checkIsDescendant(descendant.id, targetId)) {
      return true;
    }
  }

  return false;
}

/**
 * Get breadcrumb path for a category
 */
export async function getCategoryBreadcrumb(categoryId: string) {
  try {
    const breadcrumb: { id: string; name: string }[] = [];
    let currentCategory = await db.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        parentId: true,
      },
    });

    if (!currentCategory) {
      return {
        success: false,
        error: 'Category not found',
      };
    }

    // Build breadcrumb path from child to parent
    while (currentCategory) {
      breadcrumb.unshift({
        id: currentCategory.id,
        name: currentCategory.name,
      });

      if (currentCategory.parentId) {
        currentCategory = await db.category.findUnique({
          where: { id: currentCategory.parentId },
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        });
      } else {
        currentCategory = null;
      }
    }

    return {
      success: true,
      data: breadcrumb,
    };
  } catch (error) {
    console.error('Error fetching category breadcrumb:', error);
    return {
      success: false,
      error: 'Failed to fetch category breadcrumb',
    };
  }
}

/**
 * Search categories by name
 */
export async function searchCategories(
  companyId: string,
  query: string,
  limit: number = 10
) {
  try {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        error: 'Search query is required',
      };
    }

    const categories = await db.category.findMany({
      where: {
        companyId,
        name: {
          contains: query.trim(),
          // SQLite doesn't support mode: 'insensitive'
        },
      },
      take: limit,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      data: categories,
    };
  } catch (error) {
    console.error('Error searching categories:', error);
    return {
      success: false,
      error: 'Failed to search categories',
    };
  }
}