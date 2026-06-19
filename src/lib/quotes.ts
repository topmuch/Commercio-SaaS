
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ===== TYPES =====
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused';

export interface QuoteItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export type QuoteCreateInput = {
  clientId: string;
  commercialId?: string;
  items: QuoteItemInput[];
  discount?: number;
  tax?: number;
  notes?: string;
  validUntil?: Date;
};

export type QuoteUpdateInput = {
  status?: QuoteStatus;
  discount?: number;
  tax?: number;
  notes?: string;
  validUntil?: Date;
};

export type QuoteListOptions = {
  page?: number;
  pageSize?: number;
  clientId?: string;
  commercialId?: string;
  status?: QuoteStatus;
  minDate?: Date;
  maxDate?: Date;
  minTotal?: number;
  maxTotal?: number;
  search?: string;
  sortBy?: 'number' | 'total' | 'createdAt' | 'updatedAt' | 'status' | 'validUntil';
  sortOrder?: 'asc' | 'desc';
};

// ===== VALIDATION =====

export function validateQuoteItem(item: QuoteItemInput): { valid: boolean; errors: string[] } {
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

export function validateQuoteData(data: QuoteCreateInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Client ID
  if (!data.clientId || data.clientId.trim().length === 0) {
    errors.push('Client ID is required');
  }

  // Items
  if (!data.items || data.items.length === 0) {
    errors.push('At least one item is required');
  } else {
    for (const [index, item] of data.items.entries()) {
      const itemValidation = validateQuoteItem(item);
      if (!itemValidation.valid) {
        errors.push(`Item ${index + 1}: ${itemValidation.errors.join(', ')}`);
      }
    }
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

  // Valid Until
  if (data.validUntil && data.validUntil <= new Date()) {
    errors.push('Valid until date must be in the future');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ===== HELPER FUNCTIONS =====

/**
 * Generate unique quote number
 * Format: QT-YYYYMMDD-XXXX
 */
async function generateQuoteNumber(companyId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Find the last quote number for today
  const lastQuote = await db.quote.findFirst({
    where: {
      number: {
        startsWith: `QT-${dateStr}`,
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
  if (lastQuote) {
    const parts = lastQuote.number.split('-');
    const lastSequence = parseInt(parts[2], 10);
    sequence = lastSequence + 1;
  }

  const sequenceStr = sequence.toString().padStart(4, '0');
  return `QT-${dateStr}-${sequenceStr}`;
}

/**
 * Calculate quote totals
 */
export async function calculateQuoteTotals(
  items: QuoteItemInput[],
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

// ===== QUOTE CRUD OPERATIONS =====

/**
 * Create a new quote
 */
export async function createQuote(companyId: string, data: QuoteCreateInput) {
  try {
    // Validate data
    const validation = validateQuoteData(data);
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

    // Check if products are active
    const inactiveProducts = products.filter((p) => p.status !== 'active');
    if (inactiveProducts.length > 0) {
      return {
        success: false,
        error: `Cannot create quote with inactive products: ${inactiveProducts.map((p) => p.name).join(', ')}`,
      };
    }

    // Calculate totals
    const { subtotal, total } = await calculateQuoteTotals(data.items, data.discount, data.tax);

    // Generate quote number
    const quoteNumber = await generateQuoteNumber(companyId);

    // Create quote with items in a transaction
    const quote = await db.quote.create({
      data: {
        number: quoteNumber,
        clientId: data.clientId,
        commercialId: commercialId || null,
        discount: data.discount || 0,
        tax: data.tax || 0,
        total,
        notes: data.notes,
        validUntil: data.validUntil,
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
        ...quote,
        subtotal,
      },
    };
  } catch (error) {
    console.error('Error creating quote:', error);
    return {
      success: false,
      error: 'Failed to create quote',
    };
  }
}

/**
 * Get quote by ID
 */
export async function getQuoteById(quoteId: string, companyId: string) {
  try {
    const quote = await db.quote.findUnique({
      where: { id: quoteId },
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

    if (!quote) {
      return {
        success: false,
        error: 'Quote not found',
      };
    }

    if (quote.companyId !== companyId) {
      return {
        success: false,
        error: 'Quote does not belong to this company',
      };
    }

    // Calculate subtotal
    const subtotal = quote.items.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      success: true,
      data: {
        ...quote,
        subtotal,
      },
    };
  } catch (error) {
    console.error('Error fetching quote:', error);
    return {
      success: false,
      error: 'Failed to fetch quote',
    };
  }
}

/**
 * List quotes with filtering, pagination, and sorting
 */
export async function listQuotes(companyId: string, userRole?: string, userId?: string, options: QuoteListOptions = {}) {
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
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Build where clause
    const where: Prisma.QuoteWhereInput = {
      companyId,
    };

    // Role-based filtering: commercials only see their quotes
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
    const total = await db.quote.count({ where });

    // Fetch quotes
    const quotes = await db.quote.findMany({
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
      },
    });

    // Calculate subtotal for each quote
    const quotesWithSubtotal = quotes.map((quote) => ({
      ...quote,
      subtotal: quote.items.reduce((sum, item) => sum + item.totalPrice, 0),
    }));

    return {
      success: true,
      data: quotesWithSubtotal,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error('Error listing quotes:', error);
    return {
      success: false,
      error: 'Failed to list quotes',
    };
  }
}

/**
 * Update quote status
 */
export async function updateQuoteStatus(
  quoteId: string,
  companyId: string,
  status: QuoteStatus
) {
  try {
    // Get current quote
    const currentQuote = await db.quote.findUnique({
      where: { id: quoteId },
    });

    if (!currentQuote) {
      return {
        success: false,
        error: 'Quote not found',
      };
    }

    if (currentQuote.companyId !== companyId) {
      return {
        success: false,
        error: 'Quote does not belong to this company',
      };
    }

    // Validate status transition
    const validTransitions: Record<QuoteStatus, QuoteStatus[]> = {
      draft: ['sent', 'accepted', 'refused'],
      sent: ['accepted', 'refused'],
      accepted: [],
      refused: [],
    };

    if (!validTransitions[currentQuote.status as QuoteStatus].includes(status)) {
      return {
        success: false,
        error: `Invalid status transition from ${currentQuote.status} to ${status}`,
      };
    }

    // Check if quote is expired when trying to send
    if (status === 'sent' && currentQuote.validUntil && currentQuote.validUntil < new Date()) {
      return {
        success: false,
        error: 'Cannot send an expired quote',
      };
    }

    // Update quote
    const quote = await db.quote.update({
      where: { id: quoteId },
      data: {
        status,
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

    const subtotal = quote.items.reduce((sum, item) => sum + item.totalPrice, 0);

    return {
      success: true,
      data: {
        ...quote,
        subtotal,
      },
    };
  } catch (error) {
    console.error('Error updating quote status:', error);
    return {
      success: false,
      error: 'Failed to update quote status',
    };
  }
}

/**
 * Update quote notes
 */
export async function updateQuoteNotes(quoteId: string, companyId: string, notes?: string) {
  try {
    const currentQuote = await db.quote.findUnique({
      where: { id: quoteId },
    });

    if (!currentQuote) {
      return {
        success: false,
        error: 'Quote not found',
      };
    }

    if (currentQuote.companyId !== companyId) {
      return {
        success: false,
        error: 'Quote does not belong to this company',
      };
    }

    if (notes !== undefined && notes.length > 2000) {
      return {
        success: false,
        error: 'Notes cannot exceed 2000 characters',
      };
    }

    const quote = await db.quote.update({
      where: { id: quoteId },
      data: {
        notes,
      },
    });

    return {
      success: true,
      data: quote,
    };
  } catch (error) {
    console.error('Error updating quote notes:', error);
    return {
      success: false,
      error: 'Failed to update quote notes',
    };
  }
}

/**
 * Delete quote
 */
export async function deleteQuote(quoteId: string, companyId: string) {
  try {
    const quote = await db.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) {
      return {
        success: false,
        error: 'Quote not found',
      };
    }

    if (quote.companyId !== companyId) {
      return {
        success: false,
        error: 'Quote does not belong to this company',
      };
    }

    // Prevent deleting accepted quotes (they should be converted to orders)
    if (quote.status === 'accepted') {
      return {
        success: false,
        error: 'Cannot delete an accepted quote. Convert it to an order first.',
      };
    }

    // Delete quote (items will be cascade deleted)
    await db.quote.delete({
      where: { id: quoteId },
    });

    return {
      success: true,
      data: { id: quoteId },
    };
  } catch (error) {
    console.error('Error deleting quote:', error);
    return {
      success: false,
      error: 'Failed to delete quote',
    };
  }
}

/**
 * Get expired quotes
 */
export async function getExpiredQuotes(companyId: string) {
  try {
    const now = new Date();
    const expiredQuotes = await db.quote.findMany({
      where: {
        companyId,
        validUntil: {
          lt: now,
        },
        status: {
          in: ['draft', 'sent'],
        },
      },
      include: {
        client: true,
        commercial: true,
      },
      orderBy: {
        validUntil: 'asc',
      },
    });

    return {
      success: true,
      data: expiredQuotes,
    };
  } catch (error) {
    console.error('Error fetching expired quotes:', error);
    return {
      success: false,
      error: 'Failed to fetch expired quotes',
    };
  }
}

// ===== QUOTE STATISTICS =====

/**
 * Get quote statistics
 */
export async function getQuoteStatistics(companyId: string) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total quotes
    const totalQuotes = await db.quote.count({
      where: { companyId },
    });

    // Recent quotes (last 30 days)
    const recentQuotes = await db.quote.count({
      where: {
        companyId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Accepted quotes
    const acceptedQuotes = await db.quote.count({
      where: {
        companyId,
        status: 'accepted',
      },
    });

    // Refused quotes
    const refusedQuotes = await db.quote.count({
      where: {
        companyId,
        status: 'refused',
      },
    });

    // Total value of accepted quotes
    const acceptedQuotesValue = await db.quote.aggregate({
      where: {
        companyId,
        status: 'accepted',
      },
      _sum: {
        total: true,
      },
    });

    // Average quote value
    const avgQuoteValue = await db.quote.aggregate({
      where: { companyId },
      _avg: {
        total: true,
      },
    });

    // Quotes by status
    const quotesByStatus = await db.quote.groupBy({
      by: ['status'],
      where: { companyId },
      _count: {
        status: true,
      },
      _sum: {
        total: true,
      },
    });

    // Conversion rate (accepted / (accepted + refused))
    const conversionRate = acceptedQuotes + refusedQuotes > 0
      ? (acceptedQuotes / (acceptedQuotes + refusedQuotes)) * 100
      : 0;

    return {
      success: true,
      data: {
        totalQuotes,
        recentQuotes,
        acceptedQuotes,
        refusedQuotes,
        totalAcceptedValue: acceptedQuotesValue._sum.total || 0,
        averageQuoteValue: avgQuoteValue._avg.total || 0,
        conversionRate: Math.round(conversionRate * 100) / 100,
        quotesByStatus: quotesByStatus.map((group) => ({
          status: group.status,
          count: group._count.status,
          total: group._sum.total || 0,
        })),
      },
    };
  } catch (error) {
    console.error('Error fetching quote statistics:', error);
    return {
      success: false,
      error: 'Failed to fetch quote statistics',
    };
  }
}