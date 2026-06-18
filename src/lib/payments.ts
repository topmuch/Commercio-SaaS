import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ===== TYPES =====

export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'mobile_payment'
export type PaymentStatus = 'pending' | 'completed' | 'failed'

export interface CreatePaymentInput {
  amount: number
  method: PaymentMethod
  reference?: string
  status?: PaymentStatus
  notes?: string
  invoiceId?: string
  clientId: string
  companyId: string
}

export interface UpdatePaymentInput {
  amount?: number
  method?: PaymentMethod
  reference?: string
  status?: PaymentStatus
  notes?: string
  invoiceId?: string | null
}

export interface PaymentFilters {
  clientId?: string
  invoiceId?: string
  method?: PaymentMethod
  status?: PaymentStatus
  search?: string
  dateFrom?: Date
  dateTo?: Date
  minAmount?: number
  maxAmount?: number
}

export interface PaymentStatistics {
  total: number
  totalAmount: number
  byMethod: Record<PaymentMethod, number>
  byStatus: Record<PaymentStatus, number>
  todayAmount: number
  weekAmount: number
  monthAmount: number
  yearAmount: number
  averagePaymentAmount: number
}

// ===== VALIDATION =====

/**
 * Validate payment data
 */
export async function validatePaymentData(companyId: string, data: CreatePaymentInput): Promise<void> {
  // Validate amount
  if (!data.amount || typeof data.amount !== 'number') {
    throw new Error('Payment amount is required and must be a number')
  }
  if (data.amount <= 0) {
    throw new Error('Payment amount must be positive')
  }
  if (data.amount > 1000000000) {
    throw new Error('Payment amount cannot exceed 1,000,000,000')
  }

  // Validate method
  if (!data.method || typeof data.method !== 'string') {
    throw new Error('Payment method is required')
  }
  const validMethods: PaymentMethod[] = ['cash', 'bank_transfer', 'check', 'mobile_payment']
  if (!validMethods.includes(data.method as PaymentMethod)) {
    throw new Error(`Invalid payment method. Must be one of: ${validMethods.join(', ')}`)
  }

  // Validate status if provided
  if (data.status) {
    const validStatuses: PaymentStatus[] = ['pending', 'completed', 'failed']
    if (!validStatuses.includes(data.status as PaymentStatus)) {
      throw new Error(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`)
    }
  }

  // Validate reference
  if (data.reference !== undefined) {
    if (typeof data.reference !== 'string') {
      throw new Error('Payment reference must be a string')
    }
    if (data.reference.length > 200) {
      throw new Error('Payment reference cannot exceed 200 characters')
    }
  }

  // Validate notes
  if (data.notes !== undefined) {
    if (typeof data.notes !== 'string') {
      throw new Error('Payment notes must be a string')
    }
    if (data.notes.length > 2000) {
      throw new Error('Payment notes cannot exceed 2000 characters')
    }
  }

  // Validate client exists and belongs to company
  const client = await db.client.findFirst({
    where: {
      id: data.clientId,
      companyId,
    },
  })

  if (!client) {
    throw new Error('Client not found or does not belong to your company')
  }

  // Validate invoice if provided
  if (data.invoiceId) {
    const invoice = await db.invoice.findFirst({
      where: {
        id: data.invoiceId,
        companyId,
      },
      include: {
        payments: true,
      },
    })

    if (!invoice) {
      throw new Error('Invoice not found or does not belong to your company')
    }

    // Calculate already paid amount
    const paidAmount = invoice.paid

    // Check if payment amount doesn't exceed remaining amount
    const remainingAmount = invoice.total - paidAmount
    if (data.amount > remainingAmount) {
      throw new Error(`Payment amount (${data.amount}) exceeds remaining invoice amount (${remainingAmount})`)
    }

    // Validate invoice belongs to the same client
    if (invoice.clientId !== data.clientId) {
      throw new Error('Invoice must belong to the same client as the payment')
    }
  }
}

// ===== CRUD OPERATIONS =====

/**
 * Create a new payment
 */
export async function createPayment(companyId: string, data: CreatePaymentInput) {
  // Validate payment data
  await validatePaymentData(companyId, data)

  // Create payment
  const payment = await db.payment.create({
    data: {
      amount: data.amount,
      method: data.method,
      reference: data.reference,
      status: data.status || 'completed',
      notes: data.notes,
      invoiceId: data.invoiceId,
      clientId: data.clientId,
      companyId,
    },
    include: {
      invoice: true,
      client: true,
      company: {
        select: {
          name: true,
        },
      },
    },
  })

  // Update invoice payment status if payment is linked to an invoice
  if (payment.invoiceId && payment.status === 'completed') {
    await updateInvoicePaymentStatus(payment.invoiceId, companyId)
  }

  return payment
}

/**
 * Get payment by ID
 */
export async function getPaymentById(paymentId: string, companyId: string) {
  const payment = await db.payment.findFirst({
    where: {
      id: paymentId,
      companyId,
    },
    include: {
      invoice: {
        include: {
          items: true,
        },
      },
      client: true,
    },
  })

  if (!payment) {
    throw new Error('Payment not found')
  }

  return payment
}

/**
 * List payments with filters, search, sorting, and pagination
 */
export async function listPayments(
  companyId: string,
  filters: PaymentFilters = {},
  sortBy: 'createdAt' | 'amount' = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
  page: number = 1,
  pageSize: number = 20
) {
  // Build where clause
  const where: Prisma.PaymentWhereInput = {
    companyId,
  }

  // Client filter
  if (filters.clientId) {
    where.clientId = filters.clientId
  }

  // Invoice filter
  if (filters.invoiceId) {
    where.invoiceId = filters.invoiceId
  }

  // Method filter
  if (filters.method) {
    where.method = filters.method
  }

  // Status filter
  if (filters.status) {
    where.status = filters.status
  }

  // Search (reference and notes)
  if (filters.search) {
    where.OR = [
      { reference: { contains: filters.search } },
      { notes: { contains: filters.search } },
    ]
  }

  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {}
    if (filters.dateFrom) {
      where.createdAt.gte = filters.dateFrom
    }
    if (filters.dateTo) {
      where.createdAt.lte = filters.dateTo
    }
  }

  // Amount range filter
  if (filters.minAmount || filters.maxAmount) {
    where.amount = {}
    if (filters.minAmount) {
      where.amount.gte = filters.minAmount
    }
    if (filters.maxAmount) {
      where.amount.lte = filters.maxAmount
    }
  }

  // Calculate pagination
  const skip = (page - 1) * pageSize

  // Get total count
  const total = await db.payment.count({ where })

  // Get payments
  const payments = await db.payment.findMany({
    where,
    skip,
    take: pageSize,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      invoice: {
        select: {
          id: true,
          number: true,
          total: true,
          status: true,
        },
      },
      client: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
        },
      },
    },
  })

  return {
    payments,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

/**
 * Update payment details
 */
export async function updatePayment(paymentId: string, companyId: string, data: UpdatePaymentInput) {
  // Get existing payment
  const existingPayment = await db.payment.findFirst({
    where: {
      id: paymentId,
      companyId,
    },
  })

  if (!existingPayment) {
    throw new Error('Payment not found')
  }

  // Validate invoiceId change if provided
  if (data.invoiceId !== undefined && data.invoiceId !== existingPayment.invoiceId) {
    if (data.invoiceId === null) {
      // Unlinking from invoice is allowed
    } else {
      const invoice = await db.invoice.findFirst({
        where: {
          id: data.invoiceId,
          companyId,
        },
        include: {
          payments: true,
        },
      })

      if (!invoice) {
        throw new Error('Invoice not found or does not belong to your company')
      }

      if (invoice.clientId !== existingPayment.clientId) {
        throw new Error('Invoice must belong to the same client as the payment')
      }

      // Check amount constraint
      const paidAmount = invoice.paid - (existingPayment.status === 'completed' ? existingPayment.amount : 0)
      const amountToCheck = data.amount ?? existingPayment.amount
      const remainingAmount = invoice.total - paidAmount

      if (amountToCheck > remainingAmount) {
        throw new Error(`Payment amount (${amountToCheck}) exceeds remaining invoice amount (${remainingAmount})`)
      }
    }
  }

  // Validate amount change
  if (data.amount !== undefined) {
    if (data.amount <= 0) {
      throw new Error('Payment amount must be positive')
    }
    if (data.amount > 1000000000) {
      throw new Error('Payment amount cannot exceed 1,000,000,000')
    }

    // If linked to invoice, check remaining amount
    if (existingPayment.invoiceId && !data.invoiceId) {
      const invoice = await db.invoice.findFirst({
        where: {
          id: existingPayment.invoiceId,
          companyId,
        },
        include: {
          payments: true,
        },
      })

      if (invoice) {
        const paidAmount = invoice.paid - (existingPayment.status === 'completed' ? existingPayment.amount : 0)
        const remainingAmount = invoice.total - paidAmount
        if (data.amount > remainingAmount) {
          throw new Error(`Payment amount (${data.amount}) exceeds remaining invoice amount (${remainingAmount})`)
        }
      }
    }
  }

  // Validate method
  if (data.method !== undefined) {
    const validMethods: PaymentMethod[] = ['cash', 'bank_transfer', 'check', 'mobile_payment']
    if (!validMethods.includes(data.method as PaymentMethod)) {
      throw new Error(`Invalid payment method. Must be one of: ${validMethods.join(', ')}`)
    }
  }

  // Validate status
  if (data.status !== undefined) {
    const validStatuses: PaymentStatus[] = ['pending', 'completed', 'failed']
    if (!validStatuses.includes(data.status as PaymentStatus)) {
      throw new Error(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`)
    }
  }

  // Validate reference
  if (data.reference !== undefined && data.reference !== null) {
    if (typeof data.reference !== 'string') {
      throw new Error('Payment reference must be a string')
    }
    if (data.reference.length > 200) {
      throw new Error('Payment reference cannot exceed 200 characters')
    }
  }

  // Validate notes
  if (data.notes !== undefined && data.notes !== null) {
    if (typeof data.notes !== 'string') {
      throw new Error('Payment notes must be a string')
    }
    if (data.notes.length > 2000) {
      throw new Error('Payment notes cannot exceed 2000 characters')
    }
  }

  // Update payment
  const payment = await db.payment.update({
    where: { id: paymentId },
    data: {
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.method !== undefined && { method: data.method }),
      ...(data.reference !== undefined && { reference: data.reference }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.invoiceId !== undefined && { invoiceId: data.invoiceId }),
    },
    include: {
      invoice: true,
      client: true,
    },
  })

  // Update invoice payment status if status changed to completed or payment is linked
  if (payment.invoiceId && (data.status === 'completed' || (data.status === undefined && payment.status === 'completed'))) {
    await updateInvoicePaymentStatus(payment.invoiceId, companyId)
  }

  // Update invoice payment status if unlinked from invoice
  if (existingPayment.invoiceId && data.invoiceId === null && existingPayment.status === 'completed') {
    await updateInvoicePaymentStatus(existingPayment.invoiceId, companyId)
  }

  return payment
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  paymentId: string,
  companyId: string,
  status: PaymentStatus
) {
  // Get existing payment
  const existingPayment = await db.payment.findFirst({
    where: {
      id: paymentId,
      companyId,
    },
  })

  if (!existingPayment) {
    throw new Error('Payment not found')
  }

  // Validate status
  const validStatuses: PaymentStatus[] = ['pending', 'completed', 'failed']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`)
  }

  // Update payment status
  const payment = await db.payment.update({
    where: { id: paymentId },
    data: { status },
    include: {
      invoice: true,
      client: true,
    },
  })

  // Update invoice payment status if linked to invoice
  if (payment.invoiceId) {
    await updateInvoicePaymentStatus(payment.invoiceId, companyId)
  }

  return payment
}

/**
 * Delete payment
 */
export async function deletePayment(paymentId: string, companyId: string) {
  // Get existing payment
  const existingPayment = await db.payment.findFirst({
    where: {
      id: paymentId,
      companyId,
    },
  })

  if (!existingPayment) {
    throw new Error('Payment not found')
  }

  // Delete payment
  await db.payment.delete({
    where: { id: paymentId },
  })

  // Update invoice payment status if linked to invoice
  if (existingPayment.invoiceId) {
    await updateInvoicePaymentStatus(existingPayment.invoiceId, companyId)
  }

  return { success: true, message: 'Payment deleted successfully' }
}

// ===== INVOICE PAYMENT STATUS UPDATE =====

/**
 * Update invoice payment status based on its payments
 */
async function updateInvoicePaymentStatus(invoiceId: string, companyId: string) {
  // Get invoice with all payments
  const invoice = await db.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    include: {
      payments: {
        where: {
          status: 'completed',
        },
      },
    },
  })

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  // Calculate total paid amount
  const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)

  // Determine new status
  let newStatus: 'unpaid' | 'partially_paid' | 'paid'
  if (totalPaid >= invoice.total) {
    newStatus = 'paid'
  } else if (totalPaid > 0) {
    newStatus = 'partially_paid'
  } else {
    newStatus = 'unpaid'
  }

  // Update invoice
  await db.invoice.update({
    where: { id: invoiceId },
    data: {
      paid: totalPaid,
      status: newStatus,
    },
  })

  return invoice
}

// ===== PAYMENT HISTORY =====

/**
 * Get payment history for an invoice
 */
export async function getInvoicePaymentHistory(invoiceId: string, companyId: string) {
  const invoice = await db.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
  })

  if (!invoice) {
    throw new Error('Invoice not found')
  }

  const payments = await db.payment.findMany({
    where: {
      invoiceId,
      companyId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          contactName: true,
        },
      },
    },
  })

  return {
    invoice: {
      id: invoice.id,
      number: invoice.number,
      total: invoice.total,
      paid: invoice.paid,
      status: invoice.status,
    },
    payments,
  }
}

/**
 * Get payment history for a client
 */
export async function getClientPaymentHistory(
  clientId: string,
  companyId: string,
  page: number = 1,
  pageSize: number = 20
) {
  const client = await db.client.findFirst({
    where: {
      id: clientId,
      companyId,
    },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  const skip = (page - 1) * pageSize

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where: {
        clientId,
        companyId,
      },
      skip,
      take: pageSize,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        invoice: {
          select: {
            id: true,
            number: true,
            total: true,
          },
        },
      },
    }),
    db.payment.count({
      where: {
        clientId,
        companyId,
      },
    }),
  ])

  return {
    client: {
      id: client.id,
      companyName: client.companyName,
      contactName: client.contactName,
    },
    payments,
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

// ===== STATISTICS =====

/**
 * Get payment statistics for a company
 */
export async function getPaymentStatistics(companyId: string): Promise<PaymentStatistics> {
  // Get all payments
  const payments = await db.payment.findMany({
    where: {
      companyId,
      status: 'completed',
    },
  })

  const total = payments.length
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  // Calculate by method
  const byMethod: Record<PaymentMethod, number> = {
    cash: 0,
    bank_transfer: 0,
    check: 0,
    mobile_payment: 0,
  }
  payments.forEach((p) => {
    byMethod[p.method as PaymentMethod] += p.amount
  })

  // Calculate by status (all payments including non-completed)
  const allPayments = await db.payment.findMany({
    where: {
      companyId,
    },
  })
  const byStatus: Record<PaymentStatus, number> = {
    pending: 0,
    completed: 0,
    failed: 0,
  }
  allPayments.forEach((p) => {
    byStatus[p.status as PaymentStatus]++
  })

  // Calculate time-based amounts
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)

  const todayAmount = payments
    .filter((p) => new Date(p.createdAt) >= todayStart)
    .reduce((sum, p) => sum + p.amount, 0)

  const weekAmount = payments
    .filter((p) => new Date(p.createdAt) >= weekStart)
    .reduce((sum, p) => sum + p.amount, 0)

  const monthAmount = payments
    .filter((p) => new Date(p.createdAt) >= monthStart)
    .reduce((sum, p) => sum + p.amount, 0)

  const yearAmount = payments
    .filter((p) => new Date(p.createdAt) >= yearStart)
    .reduce((sum, p) => sum + p.amount, 0)

  const averagePaymentAmount = total > 0 ? totalAmount / total : 0

  return {
    total,
    totalAmount,
    byMethod,
    byStatus,
    todayAmount,
    weekAmount,
    monthAmount,
    yearAmount,
    averagePaymentAmount,
  }
}

/**
 * Get payment summary for a specific period
 */
export async function getPaymentSummary(
  companyId: string,
  startDate: Date,
  endDate: Date
) {
  const payments = await db.payment.findMany({
    where: {
      companyId,
      status: 'completed',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
        },
      },
      invoice: {
        select: {
          id: true,
          number: true,
        },
      },
    },
  })

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
  const totalPayments = payments.length

  // Group by day
  const byDay = payments.reduce((acc, payment) => {
    const date = new Date(payment.createdAt).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = {
        date,
        count: 0,
        amount: 0,
      }
    }
    acc[date].count++
    acc[date].amount += payment.amount
    return acc
  }, {} as Record<string, { date: string; count: number; amount: number }>)

  return {
    period: {
      startDate,
      endDate,
    },
    summary: {
      totalAmount,
      totalPayments,
      averagePayment: totalPayments > 0 ? totalAmount / totalPayments : 0,
    },
    byDay: Object.values(byDay),
    payments,
  }
}