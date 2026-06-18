'use server'

import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'

export type ProductStatus = 'active' | 'inactive' | 'archived'

export type ProductData = {
  name: string
  reference: string
  description?: string
  price: number
  resellerPrice?: number
  image?: string
  categoryId?: string
  brand?: string
  stock?: number
  minStock?: number
  status?: ProductStatus
}

export type ProductFilterOptions = {
  search?: string
  categoryId?: string
  brand?: string
  status?: ProductStatus
  minPrice?: number
  maxPrice?: number
  lowStock?: boolean
  outOfStock?: boolean
  sortBy?: 'name' | 'price' | 'stock' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export type StockMovementType = 'entry' | 'exit' | 'adjustment' | 'inventory'

export type ProductResult<T = any> = {
  success: boolean
  message: string
  data?: T
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

/**
 * Validate product data
 */
export function validateProductData(data: ProductData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Product name must be at least 2 characters long')
  }
  if (data.name && data.name.trim().length > 200) {
    errors.push('Product name must be less than 200 characters')
  }

  // Reference validation
  if (!data.reference || data.reference.trim().length < 2) {
    errors.push('Product reference must be at least 2 characters long')
  }
  if (data.reference && data.reference.length > 50) {
    errors.push('Product reference must be less than 50 characters')
  }

  // Price validation
  if (typeof data.price !== 'number' || data.price < 0) {
    errors.push('Price must be a positive number')
  }
  if (data.price > 1000000000) {
    errors.push('Price is too high')
  }

  // Reseller price validation (optional)
  if (data.resellerPrice !== undefined) {
    if (typeof data.resellerPrice !== 'number' || data.resellerPrice < 0) {
      errors.push('Reseller price must be a positive number')
    }
    if (data.resellerPrice > data.price) {
      errors.push('Reseller price cannot be higher than regular price')
    }
  }

  // Description validation (optional)
  if (data.description && data.description.length > 2000) {
    errors.push('Description must be less than 2000 characters')
  }

  // Image URL validation (optional)
  if (data.image && data.image.length > 500) {
    errors.push('Image URL must be less than 500 characters')
  }

  // Brand validation (optional)
  if (data.brand && data.brand.length > 100) {
    errors.push('Brand must be less than 100 characters')
  }

  // Stock validation (optional)
  if (data.stock !== undefined && typeof data.stock !== 'number') {
    errors.push('Stock must be a number')
  }
  if (data.stock !== undefined && data.stock < 0) {
    errors.push('Stock cannot be negative')
  }

  // Minimum stock validation (optional)
  if (data.minStock !== undefined && typeof data.minStock !== 'number') {
    errors.push('Minimum stock must be a number')
  }
  if (data.minStock !== undefined && data.minStock < 0) {
    errors.push('Minimum stock cannot be negative')
  }

  // Status validation (optional)
  const validStatuses: ProductStatus[] = ['active', 'inactive', 'archived']
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push('Invalid product status. Must be: active, inactive, or archived')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Create a new product
 */
export async function createProduct(data: ProductData): Promise<ProductResult> {
  try {
    const companyId = await getCompanyId()

    // Validate product data
    const validation = validateProductData(data)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errors.join(', '),
      }
    }

    // Check if reference already exists in the company
    const existingProduct = await db.product.findFirst({
      where: {
        reference: data.reference.trim(),
        companyId,
      },
      select: { id: true },
    })

    if (existingProduct) {
      return {
        success: false,
        message: 'A product with this reference already exists',
      }
    }

    // If categoryId is provided, verify it exists and belongs to the same company
    if (data.categoryId) {
      const category = await db.category.findFirst({
        where: {
          id: data.categoryId,
          companyId,
        },
        select: { id: true },
      })

      if (!category) {
        return {
          success: false,
          message: 'Category not found or does not belong to your company',
        }
      }
    }

    // Create the product
    const newProduct = await db.product.create({
      data: {
        name: data.name.trim(),
        reference: data.reference.trim(),
        description: data.description?.trim() || null,
        price: data.price,
        resellerPrice: data.resellerPrice || null,
        image: data.image?.trim() || null,
        categoryId: data.categoryId || null,
        brand: data.brand?.trim() || null,
        stock: data.stock ?? 0,
        minStock: data.minStock ?? 5,
        status: data.status || 'active',
        companyId,
      },
      select: {
        id: true,
        name: true,
        reference: true,
        description: true,
        price: true,
        resellerPrice: true,
        image: true,
        categoryId: true,
        brand: true,
        stock: true,
        minStock: true,
        status: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    console.log(`[Product] Created new product: ${newProduct.name} (${newProduct.reference})`)

    return {
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    }
  } catch (error) {
    console.error('[Product] Error creating product:', error)
    return {
      success: false,
      message: 'An error occurred while creating the product',
    }
  }
}

/**
 * Get a product by ID
 */
export async function getProductById(productId: string): Promise<ProductResult> {
  try {
    const companyId = await getCompanyId()

    const product = await db.product.findFirst({
      where: {
        id: productId,
        companyId,
      },
      select: {
        id: true,
        name: true,
        reference: true,
        description: true,
        price: true,
        resellerPrice: true,
        image: true,
        categoryId: true,
        brand: true,
        stock: true,
        minStock: true,
        status: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!product) {
      return {
        success: false,
        message: 'Product not found',
      }
    }

    return {
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    }
  } catch (error) {
    console.error('[Product] Error getting product by ID:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving the product',
    }
  }
}

/**
 * List products with filtering and pagination
 */
export async function listProducts(options: ProductFilterOptions = {}): Promise<ProductResult> {
  try {
    const companyId = await getCompanyId()

    const {
      search,
      categoryId,
      brand,
      status,
      minPrice,
      maxPrice,
      lowStock,
      outOfStock,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = options

    // Build where clause
    const where: any = { companyId }

    // Search in name, reference, or description
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filter by category
    if (categoryId) {
      where.categoryId = categoryId
    }

    // Filter by brand
    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' }
    }

    // Filter by status
    if (status) {
      where.status = status
    }

    // Filter by price range
    if (minPrice !== undefined) {
      where.price = { ...where.price, gte: minPrice }
    }
    if (maxPrice !== undefined) {
      where.price = { ...where.price, lte: maxPrice }
    }

    // Filter by low stock
    if (lowStock) {
      where.stock = { lte: db.product.fields.minStock }
    }

    // Filter by out of stock
    if (outOfStock) {
      where.stock = 0
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get total count
    const total = await db.product.count({ where })

    // Get products
    const products = await db.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        reference: true,
        description: true,
        price: true,
        resellerPrice: true,
        image: true,
        categoryId: true,
        brand: true,
        stock: true,
        minStock: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(total / limit)

    return {
      success: true,
      message: 'Products retrieved successfully',
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error) {
    console.error('[Product] Error listing products:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving products',
    }
  }
}

/**
 * Update a product
 */
export async function updateProduct(productId: string, data: Partial<ProductData>): Promise<ProductResult> {
  try {
    const companyId = await getCompanyId()

    // Validate product data
    const validation = validateProductData(data as ProductData)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errors.join(', '),
      }
    }

    // Check if product exists and belongs to the company
    const existingProduct = await db.product.findFirst({
      where: {
        id: productId,
        companyId,
      },
      select: { id: true, reference: true },
    })

    if (!existingProduct) {
      return {
        success: false,
        message: 'Product not found',
      }
    }

    // If reference is being changed, check it's not already used
    if (data.reference && data.reference !== existingProduct.reference) {
      const duplicateProduct = await db.product.findFirst({
        where: {
          reference: data.reference.trim(),
          companyId,
          id: { not: productId },
        },
        select: { id: true },
      })

      if (duplicateProduct) {
        return {
          success: false,
          message: 'A product with this reference already exists',
        }
      }
    }

    // If categoryId is provided, verify it exists and belongs to the same company
    if (data.categoryId) {
      const category = await db.category.findFirst({
        where: {
          id: data.categoryId,
          companyId,
        },
        select: { id: true },
      })

      if (!category) {
        return {
          success: false,
          message: 'Category not found or does not belong to your company',
        }
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name.trim()
    if (data.reference !== undefined) updateData.reference = data.reference.trim()
    if (data.description !== undefined) updateData.description = data.description?.trim() || null
    if (data.price !== undefined) updateData.price = data.price
    if (data.resellerPrice !== undefined) updateData.resellerPrice = data.resellerPrice || null
    if (data.image !== undefined) updateData.image = data.image?.trim() || null
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId || null
    if (data.brand !== undefined) updateData.brand = data.brand?.trim() || null
    if (data.stock !== undefined) updateData.stock = data.stock
    if (data.minStock !== undefined) updateData.minStock = data.minStock
    if (data.status !== undefined) updateData.status = data.status

    // Update the product
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: updateData,
      select: {
        id: true,
        name: true,
        reference: true,
        description: true,
        price: true,
        resellerPrice: true,
        image: true,
        categoryId: true,
        brand: true,
        stock: true,
        minStock: true,
        status: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    console.log(`[Product] Updated product: ${updatedProduct.name} (${updatedProduct.reference})`)

    return {
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    }
  } catch (error) {
    console.error('[Product] Error updating product:', error)
    return {
      success: false,
      message: 'An error occurred while updating the product',
    }
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<ProductResult> {
  try {
    const companyId = await getCompanyId()

    // Check if product exists and belongs to the company
    const product = await db.product.findFirst({
      where: {
        id: productId,
        companyId,
      },
      select: {
        id: true,
        name: true,
        reference: true,
      },
    })

    if (!product) {
      return {
        success: false,
        message: 'Product not found',
      }
    }

    // Check if product is used in any orders or quotes
    const orderItems = await db.orderItem.count({
      where: { productId },
    })

    const quoteItems = await db.quoteItem.count({
      where: { productId },
    })

    if (orderItems > 0 || quoteItems > 0) {
      return {
        success: false,
        message: 'Cannot delete product. It is used in orders or quotes. Please archive it instead.',
      }
    }

    // Delete the product
    await db.product.delete({
      where: { id: productId },
    })

    console.log(`[Product] Deleted product: ${product.name} (${product.reference})`)

    return {
      success: true,
      message: 'Product deleted successfully',
    }
  } catch (error) {
    console.error('[Product] Error deleting product:', error)
    return {
      success: false,
      message: 'An error occurred while deleting the product',
    }
  }
}

/**
 * Update product stock
 */
export async function updateProductStock(
  productId: string,
  quantity: number,
  movementType: StockMovementType,
  reason?: string
): Promise<ProductResult> {
  try {
    const companyId = await getCompanyId()

    // Get the product
    const product = await db.product.findFirst({
      where: {
        id: productId,
        companyId,
      },
      select: {
        id: true,
        name: true,
        reference: true,
        stock: true,
      },
    })

    if (!product) {
      return {
        success: false,
        message: 'Product not found',
      }
    }

    // Validate movement type
    const validMovementTypes: StockMovementType[] = ['entry', 'exit', 'adjustment', 'inventory']
    if (!validMovementTypes.includes(movementType)) {
      return {
        success: false,
        message: 'Invalid movement type',
      }
    }

    // Calculate new stock
    let newStock = product.stock
    if (movementType === 'entry') {
      newStock += quantity
    } else if (movementType === 'exit') {
      newStock -= quantity
      if (newStock < 0) {
        return {
          success: false,
          message: 'Insufficient stock',
        }
      }
    } else if (movementType === 'adjustment' || movementType === 'inventory') {
      newStock = quantity
      if (newStock < 0) {
        return {
          success: false,
          message: 'Stock cannot be negative',
        }
      }
    }

    // Update product stock
    await db.product.update({
      where: { id: productId },
      data: { stock: newStock },
    })

    // Record stock movement
    await db.stockMovement.create({
      data: {
        type: movementType,
        quantity: movementType === 'exit' ? -quantity : quantity,
        reason: reason || null,
        productId,
        companyId,
      },
    })

    console.log(`[Product] Stock updated for ${product.name}: ${product.stock} → ${newStock}`)

    return {
      success: true,
      message: 'Stock updated successfully',
    }
  } catch (error) {
    console.error('[Product] Error updating stock:', error)
    return {
      success: false,
      message: 'An error occurred while updating stock',
    }
  }
}

/**
 * Get product statistics
 */
export async function getProductStatistics(): Promise<ProductResult> {
  try {
    const companyId = await getCompanyId()

    // Get total products
    const totalProducts = await db.product.count({
      where: { companyId },
    })

    // Get counts by status
    const statusCounts = await db.product.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { id: true },
      _sum: { stock: true },
      _avg: { price: true },
    })

    // Get low stock products
    const lowStockProducts = await db.product.count({
      where: {
        companyId,
        stock: { lte: db.product.fields.minStock },
        status: 'active',
      },
    })

    // Get out of stock products
    const outOfStockProducts = await db.product.count({
      where: {
        companyId,
        stock: 0,
        status: 'active',
      },
    })

    // Get total stock value
    const productsWithStock = await db.product.findMany({
      where: { companyId, status: 'active' },
      select: { stock: true, price: true },
    })

    const totalStockValue = productsWithStock.reduce(
      (sum, p) => sum + p.stock * p.price,
      0
    )

    const statusMap: any = {}
    statusCounts.forEach(item => {
      statusMap[item.status] = {
        count: item._count.id,
        stock: item._sum.stock || 0,
        avgPrice: item._avg.price || 0,
      }
    })

    return {
      success: true,
      message: 'Product statistics retrieved successfully',
      data: {
        total: totalProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        totalStockValue,
        byStatus: statusMap,
      },
    }
  } catch (error) {
    console.error('[Product] Error getting product statistics:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving product statistics',
    }
  }
}

/**
 * Get low stock products
 */
export async function getLowStockProducts(): Promise<ProductResult> {
  try {
    const companyId = await getCompanyId()

    const products = await db.product.findMany({
      where: {
        companyId,
        status: 'active',
        stock: { lte: db.product.fields.minStock },
      },
      select: {
        id: true,
        name: true,
        reference: true,
        stock: true,
        minStock: true,
        brand: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        stock: 'asc',
      },
    })

    return {
      success: true,
      message: 'Low stock products retrieved successfully',
      data: products,
    }
  } catch (error) {
    console.error('[Product] Error getting low stock products:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving low stock products',
    }
  }
}