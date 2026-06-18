import { db } from '@/lib/db'
import {
  createPayment,
  getPaymentById,
  listPayments,
  updatePayment,
  updatePaymentStatus,
  deletePayment,
  getInvoicePaymentHistory,
  getClientPaymentHistory,
  getPaymentStatistics,
  getPaymentSummary,
  type PaymentMethod,
  type PaymentStatus,
} from '@/lib/payments'

// Test data
const TEST_COMPANY_ID = 'test-company-payment'
const TEST_CLIENT_ID = 'test-client-payment'
const TEST_INVOICE_ID = 'test-invoice-payment'

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logTest(testName: string) {
  console.log(`\n${colors.cyan}🧪 Test: ${testName}${colors.reset}`)
}

function logPass(message: string) {
  console.log(`${colors.green}✓ ${message}${colors.reset}`)
}

function logFail(message: string) {
  console.log(`${colors.red}✗ ${message}${colors.reset}`)
}

// Test counter
let testsPassed = 0
let testsFailed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    logPass(message)
    testsPassed++
  } else {
    logFail(message)
    testsFailed++
  }
}

// Setup test data
async function setupTestData() {
  log('\n🔧 Setting up test data...')

  // Create test company
  const existingCompany = await db.company.findUnique({
    where: { email: 'payment-test@company.com' },
  })

  let companyId = TEST_COMPANY_ID
  if (!existingCompany) {
    const company = await db.company.create({
      data: {
        id: TEST_COMPANY_ID,
        name: 'Payment Test Company',
        email: 'payment-test@company.com',
        phone: '+221771234567',
      },
    })
    companyId = company.id
    logPass(`Created test company: ${company.name}`)
  } else {
    companyId = existingCompany.id
    logPass(`Using existing test company: ${existingCompany.name}`)
  }

  // Create test client
  const existingClient = await db.client.findFirst({
    where: {
      companyId,
      companyName: 'Payment Test Client',
    },
  })

  let clientId = TEST_CLIENT_ID
  if (!existingClient) {
    const client = await db.client.create({
      data: {
        id: TEST_CLIENT_ID,
        companyName: 'Payment Test Client',
        contactName: 'John Doe',
        phone: '+221778888888',
        companyId,
      },
    })
    clientId = client.id
    logPass(`Created test client: ${client.companyName}`)
  } else {
    clientId = existingClient.id
    logPass(`Using existing test client: ${existingClient.companyName}`)
  }

  // Create test invoice
  const existingInvoice = await db.invoice.findFirst({
    where: {
      companyId,
      clientId,
      number: 'INV-PAYMENT-001',
    },
  })

  let invoiceId = TEST_INVOICE_ID
  if (!existingInvoice) {
    const invoice = await db.invoice.create({
      data: {
        id: TEST_INVOICE_ID,
        number: 'INV-PAYMENT-001',
        clientId,
        total: 10000,
        discount: 0,
        tax: 0,
        paid: 0,
        status: 'unpaid',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        companyId,
      },
    })
    invoiceId = invoice.id
    logPass(`Created test invoice: ${invoice.number}`)
  } else {
    invoiceId = existingInvoice.id
    logPass(`Using existing test invoice: ${existingInvoice.number}`)
  }

  return { companyId, clientId, invoiceId }
}

// Cleanup test data
async function cleanupTestData(companyId: string) {
  log('\n🧹 Cleaning up test data...')

  // Delete payments in correct order (no cascade dependencies)
  await db.payment.deleteMany({
    where: { companyId },
  })
  logPass('Deleted test payments')

  // Delete invoices
  await db.invoice.deleteMany({
    where: { companyId },
  })
  logPass('Deleted test invoices')

  // Delete clients
  await db.client.deleteMany({
    where: { companyId },
  })
  logPass('Deleted test clients')

  // Delete company
  await db.company.delete({
    where: { id: companyId },
  })
  logPass('Deleted test company')
}

// Main test function
async function runTests() {
  log(`${colors.blue}${'='.repeat(60)}${colors.reset}`)
  log(`${colors.blue}Payment Management Test Suite${colors.reset}`)
  log(`${colors.blue}${'='.repeat(60)}${colors.reset}`)

  let companyId: string, clientId: string, invoiceId: string

  try {
    const data = await setupTestData()
    companyId = data.companyId
    clientId = data.clientId
    invoiceId = data.invoiceId

    // ===== TEST 1: Create payment without invoice =====
    logTest('Test 1: Create payment without invoice')
    try {
      const payment1 = await createPayment(companyId, {
        amount: 5000,
        method: 'cash',
        clientId,
        companyId,
        notes: 'Direct payment',
      })
      assert(!!payment1.id, 'Payment created successfully')
      assert(payment1.amount === 5000, 'Payment amount is correct')
      assert(payment1.method === 'cash', 'Payment method is correct')
      assert(payment1.status === 'completed', 'Default status is completed')
      assert(payment1.clientId === clientId, 'Payment linked to correct client')
      logPass('Payment without invoice created: ' + payment1.id)
    } catch (error) {
      assert(false, 'Failed to create payment without invoice: ' + (error as Error).message)
    }

    // ===== TEST 2: Create payment with invoice =====
    logTest('Test 2: Create payment with invoice')
    try {
      const payment2 = await createPayment(companyId, {
        amount: 3000,
        method: 'bank_transfer',
        reference: 'TRF-001',
        clientId,
        invoiceId,
        companyId,
      })
      assert(!!payment2.id, 'Payment created successfully')
      assert(payment2.amount === 3000, 'Payment amount is correct')
      assert(payment2.invoiceId === invoiceId, 'Payment linked to correct invoice')
      logPass('Payment with invoice created: ' + payment2.id)

      // Verify invoice status updated
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
      })
      assert(invoice?.status === 'partially_paid', 'Invoice status updated to partially_paid')
      assert(invoice?.paid === 3000, 'Invoice paid amount updated correctly')
    } catch (error) {
      assert(false, 'Failed to create payment with invoice: ' + (error as Error).message)
    }

    // ===== TEST 3: Validate payment amount constraints =====
    logTest('Test 3: Validate payment amount constraints')
    try {
      await createPayment(companyId, {
        amount: 0,
        method: 'cash',
        clientId,
        companyId,
      })
      assert(false, 'Should reject zero amount payment')
    } catch (error) {
      assert(
        (error as Error).message.includes('must be a number') || (error as Error).message.includes('positive'),
        'Correctly rejects zero amount: ' + (error as Error).message
      )
    }

    try {
      await createPayment(companyId, {
        amount: -100,
        method: 'cash',
        clientId,
        companyId,
      })
      assert(false, 'Should reject negative amount payment')
    } catch (error) {
      assert(
        (error as Error).message.includes('positive'),
        'Correctly rejects negative amount: ' + (error as Error).message
      )
    }

    try {
      await createPayment(companyId, {
        amount: 2000000000,
        method: 'cash',
        clientId,
        companyId,
      })
      assert(false, 'Should reject amount > 1B')
    } catch (error) {
      assert(
        (error as Error).message.includes('1,000,000,000'),
        'Correctly rejects excessive amount: ' + (error as Error).message
      )
    }

    // ===== TEST 4: Validate payment method =====
    logTest('Test 4: Validate payment method')
    try {
      await createPayment(companyId, {
        amount: 1000,
        method: 'invalid_method' as PaymentMethod,
        clientId,
        companyId,
      })
      assert(false, 'Should reject invalid payment method')
    } catch (error) {
      assert(
        (error as Error).message.includes('Invalid payment method'),
        'Correctly rejects invalid method: ' + (error as Error).message
      )
    }

    // Valid payment methods
    const validMethods: PaymentMethod[] = ['cash', 'bank_transfer', 'check', 'mobile_payment']
    for (const method of validMethods) {
      try {
        const payment = await createPayment(companyId, {
          amount: 1000,
          method,
          clientId,
          companyId,
        })
        assert(payment.method === method, `Method ${method} works correctly`)
      } catch (error) {
        assert(false, `Method ${method} failed: ` + (error as Error).message)
      }
    }

    // ===== TEST 5: Create payment with different statuses =====
    logTest('Test 5: Create payment with different statuses')
    const statuses: PaymentStatus[] = ['pending', 'completed', 'failed']
    for (const status of statuses) {
      try {
        const payment = await createPayment(companyId, {
          amount: 500,
          method: 'cash',
          status,
          clientId,
          companyId,
        })
        assert(payment.status === status, `Status ${status} works correctly`)
      } catch (error) {
        assert(false, `Status ${status} failed: ` + (error as Error).message)
      }
    }

    // ===== TEST 6: Get payment by ID =====
    logTest('Test 6: Get payment by ID')
    try {
      const payment = await createPayment(companyId, {
        amount: 2000,
        method: 'check',
        reference: 'CHECK-123',
        clientId,
        companyId,
      })
      const retrieved = await getPaymentById(payment.id, companyId)
      assert(retrieved.id === payment.id, 'Payment retrieved correctly')
      assert(retrieved.amount === 2000, 'Payment details are correct')
      assert(retrieved.reference === 'CHECK-123', 'Payment reference is correct')
    } catch (error) {
      assert(false, 'Failed to get payment: ' + (error as Error).message)
    }

    try {
      await getPaymentById('invalid-payment-id', companyId)
      assert(false, 'Should throw for non-existent payment')
    } catch (error) {
      assert((error as Error).message === 'Payment not found', 'Correctly throws error for non-existent payment')
    }

    // ===== TEST 7: List payments with filters =====
    logTest('Test 7: List payments with filters')
    try {
      const result = await listPayments(companyId)
      assert(Array.isArray(result.payments), 'Returns payments array')
      assert(result.pagination.total > 0, 'Has payments')
      assert(typeof result.pagination.totalPages === 'number', 'Has pagination info')
    } catch (error) {
      assert(false, 'Failed to list payments: ' + (error as Error).message)
    }

    // Filter by client
    try {
      const result = await listPayments(companyId, { clientId })
      assert(result.payments.every((p) => p.clientId === clientId), 'Client filter works')
    } catch (error) {
      assert(false, 'Failed to filter by client: ' + (error as Error).message)
    }

    // Filter by invoice
    try {
      const result = await listPayments(companyId, { invoiceId })
      assert(result.payments.every((p) => p.invoiceId === invoiceId), 'Invoice filter works')
    } catch (error) {
      assert(false, 'Failed to filter by invoice: ' + (error as Error).message)
    }

    // Filter by method
    try {
      const result = await listPayments(companyId, { method: 'cash' })
      assert(result.payments.every((p) => p.method === 'cash'), 'Method filter works')
    } catch (error) {
      assert(false, 'Failed to filter by method: ' + (error as Error).message)
    }

    // Filter by status
    try {
      const result = await listPayments(companyId, { status: 'completed' })
      assert(result.payments.every((p) => p.status === 'completed'), 'Status filter works')
    } catch (error) {
      assert(false, 'Failed to filter by status: ' + (error as Error).message)
    }

    // Filter by amount range
    try {
      const result = await listPayments(companyId, { minAmount: 1000, maxAmount: 5000 })
      assert(result.payments.every((p) => p.amount >= 1000 && p.amount <= 5000), 'Amount range filter works')
    } catch (error) {
      assert(false, 'Failed to filter by amount range: ' + (error as Error).message)
    }

    // ===== TEST 8: Update payment details =====
    logTest('Test 8: Update payment details')
    try {
      const payment = await createPayment(companyId, {
        amount: 1000,
        method: 'cash',
        clientId,
        companyId,
      })

      const updated = await updatePayment(payment.id, companyId, {
        amount: 1500,
        method: 'bank_transfer',
        notes: 'Updated payment',
      })

      assert(updated.amount === 1500, 'Amount updated correctly')
      assert(updated.method === 'bank_transfer', 'Method updated correctly')
      assert(updated.notes === 'Updated payment', 'Notes updated correctly')
    } catch (error) {
      assert(false, 'Failed to update payment: ' + (error as Error).message)
    }

    // ===== TEST 9: Update payment status =====
    logTest('Test 9: Update payment status')
    try {
      const payment = await createPayment(companyId, {
        amount: 1000,
        method: 'cash',
        status: 'pending',
        clientId,
        companyId,
      })

      const updated = await updatePaymentStatus(payment.id, companyId, 'completed')
      assert(updated.status === 'completed', 'Status updated to completed')
    } catch (error) {
      assert(false, 'Failed to update payment status: ' + (error as Error).message)
    }

    // ===== TEST 10: Delete payment =====
    logTest('Test 10: Delete payment')
    try {
      const payment = await createPayment(companyId, {
        amount: 1000,
        method: 'cash',
        clientId,
        companyId,
      })

      const result = await deletePayment(payment.id, companyId)
      assert(result.success === true, 'Payment deleted successfully')
      assert(result.message === 'Payment deleted successfully', 'Success message correct')

      // Verify payment is deleted
      try {
        await getPaymentById(payment.id, companyId)
        assert(false, 'Payment should not exist after deletion')
      } catch (error) {
        assert((error as Error).message === 'Payment not found', 'Payment correctly deleted')
      }
    } catch (error) {
      assert(false, 'Failed to delete payment: ' + (error as Error).message)
    }

    // ===== TEST 11: Get invoice payment history =====
    logTest('Test 11: Get invoice payment history')
    try {
      // Create payments for the invoice
      await createPayment(companyId, {
        amount: 2000,
        method: 'cash',
        clientId,
        invoiceId,
        companyId,
      })

      const history = await getInvoicePaymentHistory(invoiceId, companyId)
      assert(history.invoice.id === invoiceId, 'Invoice details returned')
      assert(Array.isArray(history.payments), 'Payments array returned')
      assert(history.payments.length > 0, 'Has payments')
    } catch (error) {
      assert(false, 'Failed to get invoice payment history: ' + (error as Error).message)
    }

    // ===== TEST 12: Get client payment history =====
    logTest('Test 12: Get client payment history')
    try {
      const history = await getClientPaymentHistory(clientId, companyId)
      assert(history.client.id === clientId, 'Client details returned')
      assert(Array.isArray(history.payments), 'Payments array returned')
      assert(history.payments.length > 0, 'Has payments')
      assert(history.pagination.total > 0, 'Has pagination info')
    } catch (error) {
      assert(false, 'Failed to get client payment history: ' + (error as Error).message)
    }

    // ===== TEST 13: Get payment statistics =====
    logTest('Test 13: Get payment statistics')
    try {
      const stats = await getPaymentStatistics(companyId)
      assert(typeof stats.total === 'number', 'Total count is number')
      assert(typeof stats.totalAmount === 'number', 'Total amount is number')
      assert(typeof stats.byMethod === 'object', 'By method stats exist')
      assert(typeof stats.byStatus === 'object', 'By status stats exist')
      assert(typeof stats.todayAmount === 'number', 'Today amount is number')
      assert(typeof stats.weekAmount === 'number', 'Week amount is number')
      assert(typeof stats.monthAmount === 'number', 'Month amount is number')
      assert(typeof stats.yearAmount === 'number', 'Year amount is number')
      assert(typeof stats.averagePaymentAmount === 'number', 'Average payment is number')
      logPass(`Statistics: ${stats.total} payments, total: ${stats.totalAmount}`)
    } catch (error) {
      assert(false, 'Failed to get payment statistics: ' + (error as Error).message)
    }

    // ===== TEST 14: Get payment summary for period =====
    logTest('Test 14: Get payment summary for period')
    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      const endDate = new Date()

      const summary = await getPaymentSummary(companyId, startDate, endDate)
      assert(typeof summary.summary.totalAmount === 'number', 'Summary total amount is number')
      assert(typeof summary.summary.totalPayments === 'number', 'Summary total payments is number')
      assert(Array.isArray(summary.byDay), 'By day array exists')
      assert(Array.isArray(summary.payments), 'Payments array exists')
      logPass(`Summary: ${summary.summary.totalPayments} payments, ${summary.summary.totalAmount} total`)
    } catch (error) {
      assert(false, 'Failed to get payment summary: ' + (error as Error).message)
    }

    // ===== TEST 15: Search payments =====
    logTest('Test 15: Search payments')
    try {
      // Create payment with reference
      await createPayment(companyId, {
        amount: 1000,
        method: 'bank_transfer',
        reference: 'SEARCH-TEST-123',
        notes: 'This is a search test',
        clientId,
        companyId,
      })

      // Search by reference
      const result1 = await listPayments(companyId, { search: 'SEARCH-TEST-123' })
      assert(result1.payments.length > 0, 'Search by reference works')

      // Search by notes
      const result2 = await listPayments(companyId, { search: 'search test' })
      assert(result2.payments.length > 0, 'Search by notes works')
    } catch (error) {
      assert(false, 'Failed to search payments: ' + (error as Error).message)
    }

    // ===== TEST 16: Pagination =====
    logTest('Test 16: Pagination')
    try {
      const page1 = await listPayments(companyId, {}, 'createdAt', 'desc', 1, 5)
      const page2 = await listPayments(companyId, {}, 'createdAt', 'desc', 2, 5)

      assert(page1.pagination.page === 1, 'Page 1 returned')
      assert(page2.pagination.page === 2, 'Page 2 returned')
      assert(page1.payments.length <= 5, 'Page 1 has correct page size')
      assert(page2.payments.length <= 5, 'Page 2 has correct page size')
    } catch (error) {
      assert(false, 'Failed pagination test: ' + (error as Error).message)
    }

    // ===== TEST 17: Sorting =====
    logTest('Test 17: Sorting')
    try {
      const asc = await listPayments(companyId, {}, 'amount', 'asc', 1, 10)
      const desc = await listPayments(companyId, {}, 'amount', 'desc', 1, 10)

      assert(asc.payments.length > 1, 'Has enough payments for sorting')
      if (asc.payments.length > 1) {
        assert(asc.payments[0].amount <= asc.payments[asc.payments.length - 1].amount, 'Ascending sort works')
        assert(desc.payments[0].amount >= desc.payments[desc.payments.length - 1].amount, 'Descending sort works')
      }
    } catch (error) {
      assert(false, 'Failed sorting test: ' + (error as Error).message)
    }

    // ===== TEST 18: Invoice paid amount calculation =====
    logTest('Test 18: Invoice paid amount calculation')
    try {
      // Reset invoice paid amount by deleting existing payments
      await db.payment.deleteMany({
        where: { invoiceId },
      })

      // Create first payment
      await createPayment(companyId, {
        amount: 2000,
        method: 'cash',
        clientId,
        invoiceId,
        companyId,
      })

      // Create second payment
      await createPayment(companyId, {
        amount: 3000,
        method: 'bank_transfer',
        clientId,
        invoiceId,
        companyId,
      })

      // Check invoice paid amount
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
      })

      assert(invoice?.paid === 5000, 'Invoice paid amount calculated correctly')
      assert(invoice?.status === 'partially_paid', 'Invoice status is partially_paid')
    } catch (error) {
      assert(false, 'Failed invoice paid amount test: ' + (error as Error).message)
    }

    // ===== TEST 19: Full payment marks invoice as paid =====
    logTest('Test 19: Full payment marks invoice as paid')
    try {
      // Reset invoice paid amount
      await db.payment.deleteMany({
        where: { invoiceId },
      })

      // Reset invoice status
      await db.invoice.update({
        where: { id: invoiceId },
        data: { paid: 0, status: 'unpaid' },
      })

      // Make full payment
      await createPayment(companyId, {
        amount: 10000,
        method: 'cash',
        clientId,
        invoiceId,
        companyId,
      })

      // Check invoice status
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
      })

      assert(invoice?.status === 'paid', 'Invoice status updated to paid')
      assert(invoice?.paid === 10000, 'Invoice paid amount equals total')
    } catch (error) {
      assert(false, 'Failed full payment test: ' + (error as Error).message)
    }

    // ===== TEST 20: Payment doesn't exceed invoice total =====
    logTest('Test 20: Payment cannot exceed invoice total')
    try {
      // Reset invoice paid amount
      await db.payment.deleteMany({
        where: { invoiceId },
      })

      await db.invoice.update({
        where: { id: invoiceId },
        data: { paid: 0, status: 'unpaid' },
      })

      // Try to pay more than invoice total
      try {
        await createPayment(companyId, {
          amount: 15000,
          method: 'cash',
          clientId,
          invoiceId,
          companyId,
        })
        assert(false, 'Should reject payment exceeding invoice total')
      } catch (error) {
        assert((error as Error).message.includes('exceeds remaining'), 'Correctly rejects excessive payment')
      }
    } catch (error) {
      assert(false, 'Failed payment validation test: ' + (error as Error).message)
    }

    // ===== TEST 21: Delete payment updates invoice status =====
    logTest('Test 21: Delete payment updates invoice status')
    try {
      // Reset invoice
      await db.payment.deleteMany({
        where: { invoiceId },
      })

      await db.invoice.update({
        where: { id: invoiceId },
        data: { paid: 0, status: 'unpaid' },
      })

      // Create partial payment
      const payment = await createPayment(companyId, {
        amount: 5000,
        method: 'cash',
        clientId,
        invoiceId,
        companyId,
      })

      assert(payment.status === 'completed', 'Payment is completed')

      // Delete the payment
      await deletePayment(payment.id, companyId)

      // Check invoice status
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
      })

      assert(invoice?.paid === 0, 'Invoice paid amount reset to 0')
      assert(invoice?.status === 'unpaid', 'Invoice status reset to unpaid')
    } catch (error) {
      assert(false, 'Failed delete payment test: ' + (error as Error).message)
    }

    // ===== TEST 22: Reference and notes length validation =====
    logTest('Test 22: Reference and notes length validation')
    try {
      // Too long reference
      try {
        await createPayment(companyId, {
          amount: 1000,
          method: 'cash',
          reference: 'A'.repeat(201),
          clientId,
          companyId,
        })
        assert(false, 'Should reject too long reference')
      } catch (error) {
        assert((error as Error).message.includes('200 characters'), 'Correctly rejects long reference')
      }

      // Too long notes
      try {
        await createPayment(companyId, {
          amount: 1000,
          method: 'cash',
          notes: 'A'.repeat(2001),
          clientId,
          companyId,
        })
        assert(false, 'Should reject too long notes')
      } catch (error) {
        assert((error as Error).message.includes('2000 characters'), 'Correctly rejects long notes')
      }

      // Valid length
      try {
        await createPayment(companyId, {
          amount: 1000,
          method: 'cash',
          reference: 'A'.repeat(200),
          notes: 'B'.repeat(2000),
          clientId,
          companyId,
        })
        assert(true, 'Accepts max length reference and notes')
      } catch (error) {
        assert(false, 'Should accept max length: ' + (error as Error).message)
      }
    } catch (error) {
      assert(false, 'Failed length validation test: ' + (error as Error).message)
    }

    // ===== TEST 23: Date range filter =====
    logTest('Test 23: Date range filter')
    try {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // Create payment now
      await createPayment(companyId, {
        amount: 1000,
        method: 'cash',
        clientId,
        companyId,
      })

      // Filter by today's date range
      const result = await listPayments(companyId, {
        dateFrom: yesterday,
        dateTo: tomorrow,
      })

      assert(result.payments.length > 0, 'Date range filter works')
    } catch (error) {
      assert(false, 'Failed date range filter test: ' + (error as Error).message)
    }

  } catch (error) {
    log(`Unexpected error: ${(error as Error).message}`, 'red')
    console.error(error)
  } finally {
    // Cleanup
    await cleanupTestData(companyId)
  }

  // Print summary
  log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`)
  log(`${colors.blue}Test Summary${colors.reset}`)
  log(`${colors.blue}${'='.repeat(60)}${colors.reset}`)
  log(`${colors.green}Tests Passed: ${testsPassed}${colors.reset}`)
  log(`${colors.red}Tests Failed: ${testsFailed}${colors.reset}`)
  log(`${colors.yellow}Total Tests: ${testsPassed + testsFailed}${colors.reset}`)

  if (testsFailed === 0) {
    log(`${colors.green}\n🎉 All tests passed!${colors.reset}`, 'green')
  } else {
    log(`${colors.red}\n❌ Some tests failed.${colors.reset}`, 'red')
  }
}

// Run tests
runTests().catch(console.error)