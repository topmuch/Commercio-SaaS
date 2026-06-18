'use server'

import { db } from '@/lib/db'
import { getCompanyId, getAuthSession } from '@/lib/auth'

export type OrderStatus = 'new' | 'validated' | 'preparation' | 'shipped' | 'delivered' | 'cancelled'

export type OrderItemData = {
  productId: string
  quantity: number
  unitPrice: number
}

export type OrderData = {
  clientId: string
  commercialId?: string
  status?: OrderStatus
  items: OrderItemData[]
  discount?: number
  tax?: number
  notes?: string
}

export type OrderFilterOptions = {
  search?: string
  clientId?: string
  commercialId?: string
  status?: OrderStatus
  minDate?: Date
  maxDate?: Date
  minTotal?: number
  maxTotal?: number
  sortBy?: 'number' | 'total' | 'createdAt' | 'updatedAt' | 'status'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export type OrderResult<T = any> = {
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
 * Validate order item data
 */
export async function validateOrderItem(item: OrderItemData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!item.productId || typeof item.productId !== 'string') {
    errors.push('Product ID is required and must be a string')
  }

  if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
    errors.push('Quantity must be a positive number')
  }

  if (!item.unitPrice || typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
    errors.push('Unit price must be a positive number')
  }

  if (item.quantity > 1000000) {
    errors.push('Quantity is too high')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate order data
 */
export async function validateOrderData(data: OrderData, companyId?: string): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  const effectiveCompanyId = companyId || await getCompanyId()

  // Validate client
  if (!data.clientId || typeof data.clientId !== 'string') {
    errors.push('Client ID is required')
  } else {
    const client = await db.client.findFirst({
      where: {
        id: data.clientId,
        companyId: effectiveCompanyId,
      },
      select: { id: true },
    })

    if (!client) {
      errors.push('Client not found or does not belong to your company')
    }
  }

  // Validate commercial if provided
  if (data.commercialId) {
    const commercial = await db.user.findFirst({
      where: {
        id: data.commercialId,
        companyId: effectiveCompanyId,
        role: { in: ['commercial', 'admin', 'super_admin', 'director'] },
        active: true,
      },
      select: { id: true },
    })

    if (!commercial) {
      errors.push('Commercial not found or does not belong to your company')
    }
  }

  // Validate status if provided
  const validStatuses: OrderStatus[] = ['new', 'validated', 'preparation', 'shipped', 'delivered', 'cancelled']
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
  }

  // Validate items
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Order must have at least one item')
  } else {
    for (let i = 0; i < data.items.length; i++) {
      const itemValidation = validateOrderItem(data.items[i])
      if (!itemValidation.valid) {
        errors.push(`Item ${i + 1}: ${itemValidation.errors.join(', ')}`)
      } else {
        // Verify product exists and belongs to company
        const product = await db.product.findFirst({
          where: {
            id: data.items[i]!.productId,
            companyId: effectiveCompanyId,
            status: 'active',
          },
          select: { id: true, stock: true },
        })

        if (!product) {
          errors.push(`Item ${i + 1}: Product not found or inactive`)
        } else if (product.stock < data.items[i]!.quantity) {
          errors.push(`Item ${i + 1}: Insufficient stock. Available: ${product.stock}, Requested: ${data.items[i]!.quantity}`)
        }
      }
    }
  }

  // Validate discount
  if (data.discount !== undefined) {
    if (typeof data.discount !== 'number' || data.discount < 0) {
      errors.push('Discount must be a positive number')
    }
    if (data.discount > 1000000) {
      errors.push('Discount is too high')
    }
  }

  // Validate tax
  if (data.tax !== undefined) {
    if (typeof data.tax !== 'number' || data.tax < 0) {
      errors.push('Tax must be a positive number')
    }
    if (data.tax > 1000000) {
      errors.push('Tax is too high')
    }
  }

  // Validate notes
  if (data.notes && data.notes.length > 2000) {
    errors.push('Notes must be less than 2000 characters')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Generate unique order number
 */
export async function generateOrderNumber(): Promise<string> {
  const companyId = await getCompanyId()

  // Get the count of orders for this company
  const count = await db.order.count({
    where: { companyId },
  })

  // Generate a unique order number with format: ORD-YYYYMMDD-XXXX
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const sequence = (count + 1).toString().padStart(4, '0')

  return `ORD-${dateStr}-${sequence}`
}

/**
 * Create a new order
 */
export async function createOrder(data: OrderData): Promise<OrderResult> {
  try {
    // Validate order data
    const validation = await validateOrderData(data)
    if (!validation.valid) {
      return {
        success: false,
        message: validation.errors.join('. '),
      }
    }

    const companyId = await getCompanyId()
    const session = await getAuthSession()
    const currentUserId = (session?.user as { id: string })?.id

    // Calculate totals
    let subtotal = 0
    const itemsWithTotals = data.items.map(item => {
      const total = item.quantity * item.unitPrice
      subtotal += total
      return {
        ...item,
        totalPrice: total,
      }
    })

    const discount = data.discount || 0
    const tax = data.tax || 0
    const total = subtotal - discount + tax

    // Generate order number
    const orderNumber = await generateOrderNumber()

    // Create the order with items
    const newOrder = await db.order.create({
      data: {
        number: orderNumber,
        clientId: data.clientId,
        commercialId: data.commercialId || currentUserId,
        total,
        discount,
        tax,
        notes: data.notes?.trim() || null,
        status: data.status || 'new',
        companyId,
        items: {
          create: itemsWithTotals.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
        },
      },
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        discount: true,
        tax: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            phone: true,
          },
        },
        commercial: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            product: {
              select: {
                id: true,
                name: true,
                reference: true,
                stock: true,
              },
            },
          },
        },
      },
    })

    // Update stock for each product
    for (const item of newOrder.items) {
      await db.product.update({
        where: { id: item.product.id },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      })

      // Record stock movement
      await db.stockMovement.create({
        data: {
          type: 'exit',
          quantity: -item.quantity,
          reason: `Order ${orderNumber}`,
          productId: item.product.id,
          companyId,
        },
      })
    }

    console.log(`[Order] Created new order: ${newOrder.number}`)

    return {
      success: true,
      message: 'Order created successfully',
      data: newOrder,
    }
  } catch (error) {
    console.error('[Order] Error creating order:', error)
    return {
      success: false,
      message: 'An error occurred while creating the order',
    }
  }
}

/**
 * Get an order by ID
 */
export async function getOrderById(orderId: string): Promise<OrderResult> {
  try {
    const companyId = await getCompanyId()

    const order = await db.order.findFirst({
      where: {
        id: orderId,
        companyId,
      },
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        discount: true,
        tax: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
            phone: true,
            email: true,
            address: true,
            city: true,
          },
        },
        commercial: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            product: {
              select: {
                id: true,
                name: true,
                reference: true,
                description: true,
                image: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    })

    if (!order) {
      return {
        success: false,
        message: 'Order not found',
      }
    }

    // Calculate subtotal
    const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0)
    const orderWithSubtotal = {
      ...order,
      subtotal,
    }

    return {
      success: true,
      message: 'Order retrieved successfully',
      data: orderWithSubtotal,
    }
  } catch (error) {
    console.error('[Order] Error getting order by ID:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving the order',
    }
  }
}

/**
 * List orders with filtering and pagination
 */
export async function listOrders(options: OrderFilterOptions = {}): Promise<OrderResult> {
  try {
    const companyId = await getCompanyId()
    const session = await getAuthSession()
    const currentUserRole = (session?.user as { role: string })?.role
    const currentUserId = (session?.user as { id: string })?.id

    const {
      search,
      clientId,
      commercialId,
      status,
      minDate,
      maxDate,
      minTotal,
      maxTotal,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = options

    // Build where clause
    const where: any = { companyId }

    // Search in order number, client name, or commercial name
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { client: { companyName: { contains: search, mode: 'insensitive' } } },
        { commercial: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Filter by client
    if (clientId) {
      where.clientId = clientId
    }

    // Filter by commercial
    if (commercialId) {
      if (['admin', 'super_admin', 'director'].includes(currentUserRole)) {
        where.commercialId = commercialId
      } else if (commercialId !== currentUserId) {
        return {
          success: false,
          message: 'Access denied. You can only view your own orders.',
        }
      }
    } else if (!['admin', 'super_admin', 'director'].includes(currentUserRole)) {
      // Non-admins can only see their own orders
      where.commercialId = currentUserId
    }

    // Filter by status
    if (status) {
      where.status = status
    }

    // Filter by date range
    if (minDate || maxDate) {
      where.createdAt = {}
      if (minDate) where.createdAt.gte = minDate
      if (maxDate) where.createdAt.lte = maxDate
    }

    // Filter by total amount
    if (minTotal !== undefined || maxTotal !== undefined) {
      where.total = {}
      if (minTotal !== undefined) where.total.gte = minTotal
      if (maxTotal !== undefined) where.total.lte = maxTotal
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get total count
    const total = await db.order.count({ where })

    // Get orders
    const orders = await db.order.findMany({
      where,
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        discount: true,
        tax: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            id: true,
            companyName: true,
            contactName: true,
          },
        },
        commercial: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { items: true },
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
      message: 'Orders retrieved successfully',
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    }
  } catch (error) {
    console.error('[Order] Error listing orders:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving orders',
    }
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<OrderResult> {
  try {
    const companyId = await getCompanyId()

    // Check if order exists and belongs to the company
    const existingOrder = await db.order.findFirst({
      where: {
        id: orderId,
        companyId,
      },
      select: {
        id: true,
        number: true,
        status: true,
      },
    })

    if (!existingOrder) {
      return {
        success: false,
        message: 'Order not found',
      }
    }

    // Validate status transition
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      new: ['validated', 'cancelled'],
      validated: ['preparation', 'cancelled'],
      preparation: ['shipped', 'cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    }

    const allowedTransitions = validTransitions[existingOrder.status]

    if (!allowedTransitions.includes(newStatus)) {
      return {
        success: false,
        message: `Invalid status transition. Cannot move from ${existingOrder.status} to ${newStatus}. Allowed: ${allowedTransitions.join(', ')}`,
      }
    }

    // If cancelling, restore stock
    if (newStatus === 'cancelled') {
      const orderItems = await db.orderItem.findMany({
        where: { orderId },
        select: {
          productId: true,
          quantity: true,
          product: {
            select: {
              stock: true,
            },
          },
        },
      })

      for (const item of orderItems) {
        await db.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        })

        // Record stock movement
        await db.stockMovement.create({
          data: {
            type: 'entry',
            quantity: item.quantity,
            reason: `Order ${existingOrder.number} cancelled`,
            productId: item.productId,
            companyId,
          },
        })
      }
    }

    // Update the order status
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { status: newStatus },
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        updatedAt: true,
      },
    })

    console.log(`[Order] Status updated for ${updatedOrder.number}: ${existingOrder.status} → ${newStatus}`)

    return {
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder,
    }
  } catch (error) {
    console.error('[Order] Error updating order status:', error)
    return {
      success: false,
      message: 'An error occurred while updating order status',
    }
  }
}

/**
 * Update order notes
 */
export async function updateOrderNotes(orderId: string, notes: string): Promise<OrderResult> {
  try {
    const companyId = await getCompanyId()

    // Validate notes
    if (notes.length > 2000) {
      return {
        success: false,
        message: 'Notes must be less than 2000 characters',
      }
    }

    // Check if order exists and belongs to the company
    const existingOrder = await db.order.findFirst({
      where: {
        id: orderId,
        companyId,
      },
      select: { id: true, number: true },
    })

    if (!existingOrder) {
      return {
        success: false,
        message: 'Order not found',
      }
    }

    // Update the order notes
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { notes: notes.trim() || null },
      select: {
        id: true,
        number: true,
        notes: true,
        updatedAt: true,
      },
    })

    return {
      success: true,
      message: 'Order notes updated successfully',
      data: updatedOrder,
    }
  } catch (error) {
    console.error('[Order] Error updating order notes:', error)
    return {
      success: false,
      message: 'An error occurred while updating order notes',
    }
  }
}

/**
 * Get order statistics
 */
export async function getOrderStatistics(): Promise<OrderResult> {
  try {
    const companyId = await getCompanyId()

    // Get total orders
    const totalOrders = await db.order.count({
      where: { companyId },
    })

    // Get counts by status
    const statusCounts = await db.order.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { id: true },
      _sum: { total: true },
    })

    // Get recent orders (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentOrders = await db.order.count({
      where: {
        companyId,
        createdAt: { gte: thirtyDaysAgo },
      },
    })

    // Get total revenue (from delivered orders)
    const revenueResult = await db.order.aggregate({
      where: {
        companyId,
        status: 'delivered',
      },
      _sum: {
        total: true,
      },
    })

    const totalRevenue = revenueResult._sum.total || 0

    // Get average order value
    const avgOrderResult = await db.order.aggregate({
      where: {
        companyId,
        status: { not: 'cancelled' },
      },
      _avg: {
        total: true,
      },
    })

    const avgOrderValue = avgOrderResult._avg.total || 0

    const statusMap: any = {}
    statusCounts.forEach(item => {
      statusMap[item.status] = {
        count: item._count.id,
        total: item._sum.total || 0,
      }
    })

    return {
      success: true,
      message: 'Order statistics retrieved successfully',
      data: {
        total: totalOrders,
        recent: recentOrders,
        totalRevenue,
        avgOrderValue,
        byStatus: statusMap,
      },
    }
  } catch (error) {
    console.error('[Order] Error getting order statistics:', error)
    return {
      success: false,
      message: 'An error occurred while retrieving order statistics',
    }
  }
}