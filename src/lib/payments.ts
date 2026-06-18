'use server';

import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { updateInvoicePaymentStatus } from '@/lib/invoices';

// ===== TYPES =====
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'mobile_payment';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export type PaymentCreateInput = {
  clientId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  invoiceId?: string;
};

export type PaymentUpdateInput = {
  status?: PaymentStatus;
  amount?: number;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
};

export type PaymentListOptions = {
  page?: number;
  pageSize?: number;
  clientId?: string;
  invoiceId?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
  minDate?: Date;
  maxDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  sortBy?: 'amount' | 'createdAt' | 'updatedAt' | 'method' | 'status';
  sortOrder?: 'asc' | 'desc';
};

// ===== VALIDATION =====

export function validatePaymentData(data: PaymentCreateInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Client ID
  if (!data.clientId || data.clientId.trim().length === 0) {
    errors.push('Client ID is required');
  }

  // Amount
  if (data.amount === undefined || data.amount === null) {
    errors.push('Amount is required');
  } else if (data.amount <= 0) {
    errors.push('Amount must be positive');
  } else if (data.amount > 1000000000) {
    errors.push('Amount cannot exceed 1,000,000,000');
  }

  // Method
  if (!data.method) {
    errors.push('Payment method is required');
  } else if (
    !['cash', 'bank_transfer', 'check', 'mobile_payment'].includes(data.method)
  ) {
    errors.push('Invalid payment method');
  }

  // Reference (optional)
  if (data.reference && data.reference.length > 100) {
    errors.push('Reference cannot exceed 100 characters');
  }

  // Notes (optional)
  if (data.notes && data.notes.length > 500) {
    errors.push('Notes cannot exceed 500 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ===== PAYMENT CRUD OPERATIONS =====

/**
 * Create a new payment
 */
export async function createPayment(companyId: string, data: PaymentCreateInput) {
  try {
    // Validate data
    const validation = validatePaymentData(data);
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

    // If invoice provided, check it exists and belongs to company
    if (data.invoiceId) {
      const invoice = await db.invoice.findUnique({
        where: { id: data.invoiceId },
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

      if (invoice.clientId !== data.clientId) {
        return {
          success: false,
          error: 'Invoice does not belong to the specified client',
        };
      }

      // Calculate total paid so far
      const totalPaid = invoice.payments
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0);

      // Check if payment would exceed invoice total
      if (totalPaid + data.amount > invoice.total) {
        return {
          success: false,
          error: `Payment would exceed invoice total. Remaining: ${invoice.total - totalPaid}`,
        };
      }
    }

    // Create payment
    const payment = await db.payment.create({
      data: {
        amount: data.amount,
        method: data.method,
        reference: data.reference,
        status: 'pending',
        notes: data.notes,
        clientId: data.clientId,
        invoiceId: data.invoiceId || null,
        companyId,
      },
      include: {
        client: true,
        invoice: true,
      },
    });

    // If invoice linked and status is completed, update invoice status
    if (data.invoiceId && payment.status === 'completed') {
      await updateInvoicePaymentStatus(data.invoiceId);
    }

    return {
      success: true,
      data: payment,
    };
  } catch (error) {
    console.error('Error creating payment:', error);
    return {
      success: false,
      error: 'Failed to create payment',
    };
  }
}

/**
 * Get payment by ID
 */
export async function getPaymentById(paymentId: string, companyId: string) {
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        client: true,
        invoice: true,
      },
    });

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (payment.companyId !== companyId) {
      return {
        success: false,
        error: 'Payment does not belong to this company',
      };
    }

    return {
      success: true,
      data: payment,
    };
  } catch (error) {
    console.error('Error fetching payment:', error);
    return {
      success: false,
      error: 'Failed to fetch payment',
    };
  }
}

/**
 * List payments with filtering, pagination, and sorting
 */
export async function listPayments(
  companyId: string,
  options: PaymentListOptions = {}
) {
  try {
    const {
      page = 1,
      pageSize = 20,
      clientId,
      invoiceId,
      method,
      status,
      minDate,
      maxDate,
      minAmount,
      maxAmount,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Build where clause
    const where: Prisma.PaymentWhereInput = {
      companyId,
    };

    if (clientId) {
      where.clientId = clientId;
    }

    if (invoiceId) {
      where.invoiceId = invoiceId;
    }

    if (method) {
      where.method = method;
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

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) {
        where.amount.gte = minAmount;
      }
      if (maxAmount !== undefined) {
        where.amount.lte = maxAmount;
      }
    }

    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { notes: { contains: search } },
        { client: { companyName: { contains: search } } },
        { client: { contactName: { contains: search } } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * pageSize;

    // Count total
    const total = await db.payment.count({ where });

    // Fetch payments
    const payments = await db.payment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        client: true,
        invoice: true,
      },
    });

    return {
      success: true,
      data: payments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error('Error listing payments:', error);
    return {
      success: false,
      error: 'Failed to list payments',
    };
  }
}

/**
 * Update payment
 */
export async function updatePayment(
  paymentId: string,
  companyId: string,
  data: PaymentUpdateInput
) {
  try {
    const currentPayment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: true,
      },
    });

    if (!currentPayment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (currentPayment.companyId !== companyId) {
      return {
        success: false,
        error: 'Payment does not belong to this company',
      };
    }

    // If updating amount and invoice exists, validate
    if (data.amount !== undefined && data.amount !== currentPayment.amount) {
      if (currentPayment.invoice) {
        // Calculate total paid excluding this payment
        const otherPayments = await db.payment.findMany({
          where: {
            invoiceId: currentPayment.invoiceId,
            id: { not: paymentId },
            status: 'completed',
          },
        });

        const totalOtherPaid = otherPayments.reduce((sum, p) => sum + p.amount, 0);

        if (totalOtherPaid + data.amount > currentPayment.invoice.total) {
          return {
            success: false,
            error: `Payment would exceed invoice total. Available: ${currentPayment.invoice.total - totalOtherPaid}`,
          };
        }
      }

      if (data.amount <= 0) {
        return {
          success: false,
          error: 'Amount must be positive',
        };
      }

      if (data.amount > 1000000000) {
        return {
          success: false,
          error: 'Amount cannot exceed 1,000,000,000',
        };
      }
    }

    // Validate reference length
    if (data.reference !== undefined && data.reference.length > 100) {
      return {
        success: false,
        error: 'Reference cannot exceed 100 characters',
      };
    }

    // Validate notes length
    if (data.notes !== undefined && data.notes.length > 500) {
      return {
        success: false,
        error: 'Notes cannot exceed 500 characters',
      };
    }

    // Validate method
    if (data.method !== undefined &&
        !['cash', 'bank_transfer', 'check', 'mobile_payment'].includes(data.method)) {
      return {
        success: false,
        error: 'Invalid payment method',
      };
    }

    // Validate status
    if (data.status !== undefined &&
        !['pending', 'completed', 'failed'].includes(data.status)) {
      return {
        success: false,
        error: 'Invalid payment status',
      };
    }

    const oldStatus = currentPayment.status;

    // Update payment
    const payment = await db.payment.update({
      where: { id: paymentId },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.method !== undefined && { method: data.method }),
        ...(data.reference !== undefined && { reference: data.reference }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        client: true,
        invoice: true,
      },
    });

    // If invoice linked and status changed, update invoice status
    if (currentPayment.invoiceId && data.status !== undefined && data.status !== oldStatus) {
      await updateInvoicePaymentStatus(currentPayment.invoiceId);
    }

    return {
      success: true,
      data: payment,
    };
  } catch (error) {
    console.error('Error updating payment:', error);
    return {
      success: false,
      error: 'Failed to update payment',
    };
  }
}

/**
 * Delete payment
 */
export async function deletePayment(paymentId: string, companyId: string) {
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return {
        success: false,
        error: 'Payment not found',
      };
    }

    if (payment.companyId !== companyId) {
      return {
        success: false,
        error: 'Payment does not belong to this company',
      };
    }

    // Get invoice ID before deleting
    const invoiceId = payment.invoiceId;

    // Delete payment
    await db.payment.delete({
      where: { id: paymentId },
    });

    // If invoice linked, update invoice status
    if (invoiceId) {
      await updateInvoicePaymentStatus(invoiceId);
    }

    return {
      success: true,
      data: { id: paymentId },
    };
  } catch (error) {
    console.error('Error deleting payment:', error);
    return {
      success: false,
      error: 'Failed to delete payment',
    };
  }
}

// ===== PAYMENT STATISTICS =====

/**
 * Get payment statistics
 */
export async function getPaymentStatistics(companyId: string) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total payments
    const totalPayments = await db.payment.count({
      where: { companyId },
    });

    // Recent payments (last 30 days)
    const recentPayments = await db.payment.count({
      where: {
        companyId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Completed payments
    const completedPayments = await db.payment.count({
      where: {
        companyId,
        status: 'completed',
      },
    });

    // Pending payments
    const pendingPayments = await db.payment.count({
      where: {
        companyId,
        status: 'pending',
      },
    });

    // Failed payments
    const failedPayments = await db.payment.count({
      where: {
        companyId,
        status: 'failed',
      },
    });

    // Total amount collected
    const totalCollected = await db.payment.aggregate({
      where: {
        companyId,
        status: 'completed',
      },
      _sum: {
        amount: true,
      },
    });

    // Total pending amount
    const totalPending = await db.payment.aggregate({
      where: {
        companyId,
        status: 'pending',
      },
      _sum: {
        amount: true,
      },
    });

    // Average payment amount
    const avgPaymentAmount = await db.payment.aggregate({
      where: {
        companyId,
        status: 'completed',
      },
      _avg: {
        amount: true,
      },
    });

    // Payments by method
    const paymentsByMethod = await db.payment.groupBy({
      by: ['method'],
      where: {
        companyId,
        status: 'completed',
      },
      _count: {
        method: true,
      },
      _sum: {
        amount: true,
      },
    });

    // Payments by status
    const paymentsByStatus = await db.payment.groupBy({
      by: ['status'],
      where: { companyId },
      _count: {
        status: true,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      success: true,
      data: {
        totalPayments,
        recentPayments,
        completedPayments,
        pendingPayments,
        failedPayments,
        totalCollected: totalCollected._sum.amount || 0,
        totalPending: totalPending._sum.amount || 0,
        averagePaymentAmount: avgPaymentAmount._avg.amount || 0,
        paymentsByMethod: paymentsByMethod.map((group) => ({
          method: group.method,
          count: group._count.method,
          total: group._sum.amount || 0,
        })),
        paymentsByStatus: paymentsByStatus.map((group) => ({
          status: group.status,
          count: group._count.status,
          total: group._sum.amount || 0,
        })),
      },
    };
  } catch (error) {
    console.error('Error fetching payment statistics:', error);
    return {
      success: false,
      error: 'Failed to fetch payment statistics',
    };
  }
}

/**
 * Get payments by invoice
 */
export async function getPaymentsByInvoice(invoiceId: string, companyId: string) {
  try {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
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

    const payments = await db.payment.findMany({
      where: {
        invoiceId,
        companyId,
      },
      include: {
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: payments,
    };
  } catch (error) {
    console.error('Error fetching payments by invoice:', error);
    return {
      success: false,
      error: 'Failed to fetch payments by invoice',
    };
  }
}