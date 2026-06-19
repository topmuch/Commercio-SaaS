
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ===== TYPES =====
export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue';

export interface InvoiceItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export type InvoiceCreateInput = {
  clientId: string;
  commercialId?: string;
  orderId?: string;
  items: InvoiceItemInput[];
  discount?: number;
  tax?: number;
  dueDate?: Date;
  notes?: string;
};

export type InvoiceUpdateInput = {
  status?: InvoiceStatus;
  notes?: string;
  dueDate?: Date;
};

export type InvoiceListOptions = {
  page?: number;
  pageSize?: number;
  clientId?: string;
  commercialId?: string;
  status?: InvoiceStatus;
  minDate?: Date;
  maxDate?: Date;
  minTotal?: number;
  maxTotal?: number;
  isOverdue?: boolean;
  search?: string;
  sortBy?: 'number' | 'total' | 'createdAt' | 'updatedAt' | 'status' | 'dueDate';
  sortOrder?: 'asc' | 'desc';
};

// ===== VALIDATION =====

export function validateInvoiceItem(item: InvoiceItemInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Product ID
  if (!item.productId || item.productId.trim().length === 0) {
    errors.push('Product ID is required');
  }

  // Quantity
  if (!item.quantity || item.quantity <= 0) {
    errors.push('Quantity must be positive');
  } else if (item.quantity > 1000000) {
    errors.push('Quantity cannot exceed 1,000,000');
  }

  // Unit price
  if (item.unitPrice === undefined || item.unitPrice === null) {
    errors.push('Unit price is required');
  } else if (item.unitPrice < 0) {
    errors.push('Unit price cannot be negative');
  } else if (item.unitPrice > 1000000000) {
    errors.push('Unit price cannot exceed 1,000,000,000');
  }

  // Discount
  if (item.discount !== undefined && item.discount < 0) {
    errors.push('Discount cannot be negative');
  } else if (item.discount !== undefined && item.discount > 1000000) {
    errors.push('Discount cannot exceed 1,000,000');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateInvoiceData(data: InvoiceCreateInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Client ID
  if (!data.clientId || data.clientId.trim().length === 0) {
    errors.push('Client ID is required');
  }

  // Items
  if (!data.items || data.items.length === 0) {
    errors.push('At least one item is required');
  } else {
    data.items.forEach((item, index) => {
      const itemValidation = validateInvoiceItem(item);
      if (!itemValidation.valid) {
        errors.push(`Item ${index + 1}: ${itemValidation.errors.join(', ')}`);
      }
    });
  }

  // Discount
  if (data.discount !== undefined && data.discount < 0) {
    errors.push('Discount cannot be negative');
  } else if (data.discount !== undefined && data.discount > 1000000) {
    errors.push('Discount cannot exceed 1,000,000');
  }

  // Tax
  if (data.tax !== undefined && data.tax < 0) {
    errors.push('Tax cannot be negative');
  } else if (data.tax !== undefined && data.tax > 1000000) {
    errors.push('Tax cannot exceed 1,000,000');
  }

  // Notes
  if (data.notes && data.notes.length > 2000) {
    errors.push('Notes cannot exceed 2000 characters');
  }

  // Due Date (optional) - can be any date, past dates will mark invoice as overdue

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ===== HELPER FUNCTIONS =====

/**
 * Generate unique invoice number
 * Format: INV-YYYYMMDD-XXXX
 */
async function generateInvoiceNumber(companyId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Find the last invoice number for today
  const lastInvoice = await db.invoice.findFirst({
    where: {
      number: {
        startsWith: `INV-${dateStr}`,
      },
      companyId,
    },
    orderBy: {
      number: 'desc',
    },
    select: {
      number: true,
    },
  });

  let sequence = 1;
  if (lastInvoice) {
    const parts = lastInvoice.number.split('-');
    const lastSequence = parseInt(parts[2], 10);
    sequence = lastSequence + 1;
  }

  const sequenceStr = sequence.toString().padStart(4, '0');
  return `INV-${dateStr}-${sequenceStr}`;
}

/**
 * Calculate invoice totals
 */
export async function calculateInvoiceTotals(
  items: InvoiceItemInput[],
  discount?: number,
  tax?: number
): Promise<{ subtotal: number; total: number }> {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice - (item.discount || 0),
    0
  );
  const total = subtotal - (discount || 0) + (tax || 0);
  return { subtotal, total };
}

/**
 * Check and update invoice status based on payments
 */
async function updateInvoicePaymentStatus(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: true,
    },
  });

  if (!invoice) return;

  const totalPaid = invoice.payments.reduce((sum, payment) => {
    if (payment.status === 'completed') {
      return sum + payment.amount;
    }
    return sum;
  }, 0);

  let newStatus: InvoiceStatus;

  if (totalPaid >= invoice.total) {
    newStatus = 'paid';
  } else if (totalPaid > 0) {
    newStatus = 'partially_paid';
  } else {
    newStatus = 'unpaid';
  }

  // Check if overdue
  if (invoice.dueDate && newStatus !== 'paid' && new Date() > invoice.dueDate) {
    newStatus = 'overdue';
  }

  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      status: newStatus,
      paid: totalPaid,
    },
  });
}

// ===== INVOICE CRUD OPERATIONS =====

/**
 * Create a new invoice
 */
export async function createInvoice(companyId: string, data: InvoiceCreateInput) {
  try {
    // Validate data
    const validation = validateInvoiceData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    // Check if client exists and belongs to company
    const client = await db.client.findUnique({
      where: { id: data.clientId },
    });

    if (!client) {
      return {
        success: false,
        error: 'Client not found',
      };
    }

    if (client.companyId !== companyId) {
      return {
        success: false,
        error: 'Client does not belong to this company',
      };
    }

    // Check if order exists (if provided) and belongs to company
    if (data.orderId) {
      const order = await db.order.findUnique({
        where: { id: data.orderId },
      });

      if (!order) {
        return {
          success: false,
          error: 'Order not found',
        };
      }

      if (order.companyId !== companyId) {
        return {
          success: false,
          error: 'Order does not belong to this company',
        };
      }

      if (order.clientId !== data.clientId) {
        return {
          success: false,
          error: 'Order does not belong to the specified client',
        };
      }
    }

    // Check if commercial exists (if provided) and belongs to company
    let commercialId = data.commercialId;
    if (data.commercialId) {
      const commercial = await db.user.findUnique({
        where: { id: data.commercialId },
      });

      if (!commercial) {
        return {
          success: false,
          error: 'Commercial not found',
        };
      }

      if (commercial.companyId !== companyId) {
        return {
          success: false,
          error: 'Commercial does not belong to this company',
        };
      }
    }

    // Validate all products
    const productIds = data.items.map((item) => item.productId);
    const products = await db.product.findMany({
      where: {
        id: { in: productIds },
        companyId,
      },
    });

    if (products.length !== productIds.length) {
      return {
        success: false,
        error: 'One or more products not found or do not belong to this company',
      };
    }

    // Calculate totals
    const { subtotal, total } = await calculateInvoiceTotals(data.items, data.discount, data.tax);

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(companyId);

    // Create invoice with items in a transaction
    const invoice = await db.invoice.create({
      data: {
        number: invoiceNumber,
        clientId: data.clientId,
        commercialId: commercialId || null,
        orderId: data.orderId || null,
        discount: data.discount || 0,
        tax: data.tax || 0,
        total,
        dueDate: data.dueDate,
        notes: data.notes,
        companyId,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice - (item.discount || 0),
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        client: true,
        commercial: true,
      },
    });

    return {
      success: true,
      data: {
        ...invoice,
        subtotal,
      },
    };
  } catch (error) {
    console.error('Error creating invoice:', error);
    return {
      success: false,
      error: 'Failed to create invoice',
    };
  }
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(invoiceId: string, companyId: string) {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        client: true,
        commercial: true,
        payments: true,
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (invoice.companyId !== companyId) {
      return {
        success: false,
        error: 'Invoice does not belong to this company',
      };
    }

    // Calculate subtotal
    const subtotal = invoice.items.reduce((sum, item) => sum + item.totalPrice, 0);

    // Calculate remaining amount
    const remaining = invoice.total - invoice.paid;

    return {
      success: true,
      data: {
        ...invoice,
        subtotal,
        remaining,
      },
    };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return {
      success: false,
      error: 'Failed to fetch invoice',
    };
  }
}

/**
 * List invoices with filtering, pagination, and sorting
 */
export async function listInvoices(
  companyId: string,
  userRole?: string,
  userId?: string,
  options: InvoiceListOptions = {}
) {
  try {
    const {
      page = 1,
      pageSize = 20,
      clientId,
      commercialId,
      status,
      minDate,
      maxDate,
      minTotal,
      maxTotal,
      isOverdue,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Build where clause
    const where: Prisma.InvoiceWhereInput = {
      companyId,
    };

    // Role-based filtering: commercials only see their invoices
    if (userRole === 'commercial' && userId) {
      where.commercialId = userId;
    } else if (commercialId && ['admin', 'director', 'super_admin'].includes(userRole || '')) {
      // Managers can filter by commercial
      where.commercialId = commercialId;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (status) {
      where.status = status;
    }

    if (isOverdue) {
      where.dueDate = {
        lt: new Date(),
      };
      where.status = {
        not: 'paid',
      };
    }

    if (minDate || maxDate) {
      where.createdAt = {};
      if (minDate) {
        where.createdAt.gte = minDate;
      }
      if (maxDate) {
        where.createdAt.lte = maxDate;
      }
    }

    if (minTotal !== undefined || maxTotal !== undefined) {
      where.total = {};
      if (minTotal !== undefined) {
        where.total.gte = minTotal;
      }
      if (maxTotal !== undefined) {
        where.total.lte = maxTotal;
      }
    }

    if (search) {
      where.OR = [
        { number: { contains: search } },
        { client: { companyName: { contains: search } } },
        { client: { contactName: { contains: search } } },
        { commercial: { name: { contains: search } } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Count total
    const total = await db.invoice.count({ where });

    // Fetch invoices
    const invoices = await db.invoice.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        client: true,
        commercial: true,
        payments: true,
      },
    });

    // Calculate subtotal and remaining for each invoice
    const invoicesWithDetails = invoices.map((invoice) => {
      const subtotal = invoice.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const remaining = invoice.total - invoice.paid;
      return {
        ...invoice,
        subtotal,
        remaining,
      };
    });

    return {
      success: true,
      data: invoicesWithDetails,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error('Error listing invoices:', error);
    return {
      success: false,
      error: 'Failed to list invoices',
    };
  }
}

/**
 * Update invoice notes or due date
 */
export async function updateInvoiceDetails(
  invoiceId: string,
  companyId: string,
  data: { notes?: string; dueDate?: Date }
) {
  try {
    const currentInvoice = await db.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!currentInvoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (currentInvoice.companyId !== companyId) {
      return {
        success: false,
        error: 'Invoice does not belong to this company',
      };
    }

    if (data.notes !== undefined && data.notes.length > 2000) {
      return {
        success: false,
        error: 'Notes cannot exceed 2000 characters',
      };
    }

    const invoice = await db.invoice.update({
      where: { id: invoiceId },
      data: {
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      },
    });

    // Recalculate status (especially if due date changed)
    await updateInvoicePaymentStatus(invoiceId);

    return {
      success: true,
      data: invoice,
    };
  } catch (error) {
    console.error('Error updating invoice details:', error);
    return {
      success: false,
      error: 'Failed to update invoice details',
    };
  }
}

/**
 * Delete invoice
 */
export async function deleteInvoice(invoiceId: string, companyId: string) {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
      },
    });

    if (!invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }

    if (invoice.companyId !== companyId) {
      return {
        success: false,
        error: 'Invoice does not belong to this company',
      };
    }

    // Prevent deleting invoices with payments
    if (invoice.payments.length > 0) {
      return {
        success: false,
        error: `Cannot delete invoice with ${invoice.payments.length} payment(s). Please delete payments first.`,
      };
    }

    // Delete invoice (items will be cascade deleted)
    await db.invoice.delete({
      where: { id: invoiceId },
    });

    return {
      success: true,
      data: { id: invoiceId },
    };
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return {
      success: false,
      error: 'Failed to delete invoice',
    };
  }
}

/**
 * Get overdue invoices
 */
export async function getOverdueInvoices(companyId: string) {
  try {
    const now = new Date();
    const overdueInvoices = await db.invoice.findMany({
      where: {
        companyId,
        dueDate: {
          lt: now,
        },
        status: {
          not: 'paid',
        },
      },
      include: {
        client: true,
        commercial: true,
        payments: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Calculate remaining for each
    const withRemaining = overdueInvoices.map((invoice) => ({
      ...invoice,
      remaining: invoice.total - invoice.paid,
    }));

    return {
      success: true,
      data: withRemaining,
    };
  } catch (error) {
    console.error('Error fetching overdue invoices:', error);
    return {
      success: false,
      error: 'Failed to fetch overdue invoices',
    };
  }
}

// ===== INVOICE STATISTICS =====

/**
 * Get invoice statistics
 */
export async function getInvoiceStatistics(companyId: string) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total invoices
    const totalInvoices = await db.invoice.count({
      where: { companyId },
    });

    // Recent invoices (last 30 days)
    const recentInvoices = await db.invoice.count({
      where: {
        companyId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Paid invoices
    const paidInvoices = await db.invoice.count({
      where: {
        companyId,
        status: 'paid',
      },
    });

    // Unpaid invoices
    const unpaidInvoices = await db.invoice.count({
      where: {
        companyId,
        status: 'unpaid',
      },
    });

    // Overdue invoices
    const overdueInvoices = await db.invoice.count({
      where: {
        companyId,
        status: 'overdue',
      },
    });

    // Partially paid invoices
    const partiallyPaidInvoices = await db.invoice.count({
      where: {
        companyId,
        status: 'partially_paid',
      },
    });

    // Total invoiced
    const totalInvoiced = await db.invoice.aggregate({
      where: { companyId },
      _sum: {
        total: true,
      },
    });

    // Total paid
    const totalPaid = await db.invoice.aggregate({
      where: { companyId },
      _sum: {
        paid: true,
      },
    });

    // Total outstanding (unpaid + partially paid + overdue)
    const outstandingInvoices = await db.invoice.findMany({
      where: {
        companyId,
        status: {
          in: ['unpaid', 'partially_paid', 'overdue'],
        },
      },
      select: {
        total: true,
        paid: true,
      },
    });

    const totalOutstanding = outstandingInvoices.reduce(
      (sum, invoice) => sum + (invoice.total - invoice.paid),
      0
    );

    // Average invoice value
    const avgInvoiceValue = await db.invoice.aggregate({
      where: { companyId },
      _avg: {
        total: true,
      },
    });

    // Invoices by status
    const invoicesByStatus = await db.invoice.groupBy({
      by: ['status'],
      where: { companyId },
      _count: {
        status: true,
      },
      _sum: {
        total: true,
      },
    });

    return {
      success: true,
      data: {
        totalInvoices,
        recentInvoices,
        paidInvoices,
        unpaidInvoices,
        overdueInvoices,
        partiallyPaidInvoices,
        totalInvoiced: totalInvoiced._sum.total || 0,
        totalPaid: totalPaid._sum.paid || 0,
        totalOutstanding,
        averageInvoiceValue: avgInvoiceValue._avg.total || 0,
        invoicesByStatus: invoicesByStatus.map((group) => ({
          status: group.status,
          count: group._count.status,
          total: group._sum.total || 0,
        })),
      },
    };
  } catch (error) {
    console.error('Error fetching invoice statistics:', error);
    return {
      success: false,
      error: 'Failed to fetch invoice statistics',
    };
  }
}

// Export payment status update helper
export { updateInvoicePaymentStatus };