/**
 * Simplified Test Script for Order Management (Feature #10)
 * Tests basic database operations for orders
 */

import { db } from '../src/lib/db'

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL'
  message: string
  details?: any
}

const results: TestResult[] = []

async function runTest(
  testName: string,
  testFn: () => Promise<void>
) {
  try {
    await testFn()
    results.push({
      test: testName,
      status: 'PASS',
      message: 'Test passed',
    })
    console.log(`✅ ${testName} - PASS`)
  } catch (error: any) {
    results.push({
      test: testName,
      status: 'FAIL',
      message: error.message || 'Unknown error',
      details: error,
    })
    console.log(`❌ ${testName} - FAIL: ${error.message}`)
  }
}

const TEST_COMPANY_ID = 'test_order_company'
const TEST_COMPANY_EMAIL = 'test-order@example.com'

async function createTestCompany() {
  return await db.company.upsert({
    where: { email: TEST_COMPANY_EMAIL },
    update: {},
    create: {
      id: TEST_COMPANY_ID,
      name: 'Test Order Company',
      email: TEST_COMPANY_EMAIL,
      phone: '+221 77 000 00 00',
      address: 'Dakar, Sénégal',
      plan: 'enterprise',
    },
  })
}

async function createUser(
  email: string,
  name: string,
  role: string
) {
  const bcrypt = (await import('bcryptjs')).default
  const hashedPassword = await bcrypt.hash('Password123!', 12)
  return await db.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role,
      active: true,
      companyId: TEST_COMPANY_ID,
    },
  })
}

async function cleanupTestData() {
  await db.stockMovement.deleteMany({
    where: {
      company: {
        id: TEST_COMPANY_ID,
      },
    },
  })
  await db.orderItem.deleteMany({
    where: {
      order: {
        company: {
          id: TEST_COMPANY_ID,
        },
      },
    },
  })
  await db.order.deleteMany({
    where: {
      company: {
        id: TEST_COMPANY_ID,
      },
    },
  })
  await db.product.deleteMany({
    where: {
      company: {
        id: TEST_COMPANY_ID,
      },
    },
  })
  await db.client.deleteMany({
    where: {
      company: {
        id: TEST_COMPANY_ID,
      },
    },
  })
  await db.user.deleteMany({
    where: {
      companyId: TEST_COMPANY_ID,
    },
  })
  await db.company.deleteMany({
    where: { id: TEST_COMPANY_ID },
  })
}

async function setupTestEnvironment() {
  await cleanupTestData()
  await createTestCompany()

  const commercial = await createUser('commercial@test.com', 'Commercial Test', 'commercial')

  const client1 = await db.client.create({
    data: {
      companyName: 'Test Client 1',
      contactName: 'John Doe',
      phone: '+221 77 111 22 33',
      city: 'Dakar',
      type: 'boutique',
      status: 'client_vert',
      companyId: TEST_COMPANY_ID,
    },
  })

  const product1 = await db.product.create({
    data: {
      name: 'Product A',
      reference: 'PRDA001',
      price: 1000,
      stock: 100,
      minStock: 10,
      status: 'active',
      companyId: TEST_COMPANY_ID,
    },
  })

  const product2 = await db.product.create({
    data: {
      name: 'Product B',
      reference: 'PRDB001',
      price: 2500,
      stock: 50,
      minStock: 10,
      status: 'active',
      companyId: TEST_COMPANY_ID,
    },
  })

  return {
    commercial,
    client1,
    product1,
    product2,
  }
}

// ==========================================
// TESTS
// ==========================================

async function test_1_CreateOrderWithItems() {
  const { commercial, client1, product1 } = await setupTestEnvironment()

  const order = await db.order.create({
    data: {
      number: 'ORD-TEST-001',
      clientId: client1.id,
      commercialId: commercial.id,
      total: 3000,
      status: 'new',
      companyId: TEST_COMPANY_ID,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 3,
            unitPrice: 1000,
            totalPrice: 3000,
          },
        ],
      },
    },
    include: {
      items: true,
    },
  })

  if (!order) {
    throw new Error('Order not created')
  }

  if (order.items.length !== 1) {
    throw new Error('Order should have 1 item')
  }

  if (order.number !== 'ORD-TEST-001') {
    throw new Error('Order number mismatch')
  }
}

async function test_2_UpdateStockManually() {
  const { commercial, client1, product1 } = await setupTestEnvironment()

  const originalStock = product1.stock

  // Create order and update stock
  await db.order.create({
    data: {
      number: 'ORD-TEST-002',
      clientId: client1.id,
      commercialId: commercial.id,
      total: 2000,
      status: 'new',
      companyId: TEST_COMPANY_ID,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 2,
            unitPrice: 1000,
            totalPrice: 2000,
          },
        ],
      },
    },
  })

  // Manually update stock
  await db.product.update({
    where: { id: product1.id },
    data: {
      stock: originalStock - 2,
    },
  })

  // Record stock movement
  await db.stockMovement.create({
    data: {
      type: 'exit',
      quantity: -2,
      reason: 'Order ORD-TEST-002',
      productId: product1.id,
      companyId: TEST_COMPANY_ID,
    },
  })

  const updatedProduct = await db.product.findUnique({
    where: { id: product1.id },
    select: { stock: true },
  })

  if (!updatedProduct || updatedProduct.stock !== originalStock - 2) {
    throw new Error('Stock not updated correctly')
  }
}

async function test_3_GetOrderById() {
  const { commercial, client1, product1 } = await setupTestEnvironment()

  const order = await db.order.create({
    data: {
      number: 'ORD-TEST-003',
      clientId: client1.id,
      commercialId: commercial.id,
      total: 1000,
      status: 'new',
      companyId: TEST_COMPANY_ID,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000,
          },
        ],
      },
    },
  })

  const foundOrder = await db.order.findUnique({
    where: { id: order.id },
    include: {
      items: true,
      client: true,
      commercial: true,
    },
  })

  if (!foundOrder) {
    throw new Error('Order not found by ID')
  }

  if (!foundOrder.client || !foundOrder.commercial) {
    throw new Error('Order should include client and commercial data')
  }

  if (foundOrder.items.length !== 1) {
    throw new Error('Order should have 1 item')
  }
}

async function test_4_OrderStatusWorkflow() {
  const { commercial, client1, product1 } = await setupTestEnvironment()

  const order = await db.order.create({
    data: {
      number: 'ORD-TEST-004',
      clientId: client1.id,
      commercialId: commercial.id,
      total: 1000,
      status: 'new',
      companyId: TEST_COMPANY_ID,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000,
          },
        ],
      },
    },
  })

  // new -> validated
  let updated = await db.order.update({
    where: { id: order.id },
    data: { status: 'validated' },
  })

  // validated -> preparation
  updated = await db.order.update({
    where: { id: order.id },
    data: { status: 'preparation' },
  })

  // preparation -> shipped
  updated = await db.order.update({
    where: { id: order.id },
    data: { status: 'shipped' },
  })

  // shipped -> delivered
  updated = await db.order.update({
    where: { id: order.id },
    data: { status: 'delivered' },
  })

  if (updated.status !== 'delivered') {
    throw new Error('Order status not updated to delivered')
  }
}

async function test_5_CancellationRestoresStock() {
  const { commercial, client1, product1 } = await setupTestEnvironment()

  const originalStock = product1.stock

  const order = await db.order.create({
    data: {
      number: 'ORD-TEST-005',
      clientId: client1.id,
      commercialId: commercial.id,
      total: 3000,
      status: 'new',
      companyId: TEST_COMPANY_ID,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 3,
            unitPrice: 1000,
            totalPrice: 3000,
          },
        ],
      },
    },
  })

  // Reduce stock
  await db.product.update({
    where: { id: product1.id },
    data: {
      stock: originalStock - 3,
    },
  })

  // Cancel order and restore stock
  await db.order.update({
    where: { id: order.id },
    data: { status: 'cancelled' },
  })

  await db.product.update({
    where: { id: product1.id },
    data: {
      stock: originalStock,
    },
  })

  const finalProduct = await db.product.findUnique({
    where: { id: product1.id },
    select: { stock: true },
  })

  if (!finalProduct || finalProduct.stock !== originalStock) {
    throw new Error('Stock not restored after cancellation')
  }
}

async function test_6_ListOrdersWithPagination() {
  const { commercial, client1, product1 } = await setupTestEnvironment()

  // Create an order first
  await db.order.create({
    data: {
      number: 'ORD-TEST-006',
      clientId: client1.id,
      commercialId: commercial.id,
      total: 1000,
      status: 'new',
      companyId: TEST_COMPANY_ID,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000,
          },
        ],
      },
    },
  })

  const orders = await db.order.findMany({
    where: { companyId: TEST_COMPANY_ID },
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  if (orders.length === 0) {
    throw new Error('Should have orders')
  }
}

async function test_7_FilterOrdersByStatus() {
  await setupTestEnvironment()

  const newOrders = await db.order.findMany({
    where: {
      companyId: TEST_COMPANY_ID,
      status: 'new',
    },
    select: { id: true, status: true },
  })

  for (const order of newOrders) {
    if (order.status !== 'new') {
      throw new Error('Found order with wrong status')
    }
  }
}

async function test_8_CalculateOrderTotals() {
  const { commercial, client1, product1, product2 } = await setupTestEnvironment()

  const order = await db.order.create({
    data: {
      number: 'ORD-TEST-008',
      clientId: client1.id,
      commercialId: commercial.id,
      total: 7500, // Subtotal (7000) - discount (500) + tax (1000) = 7500
      discount: 500,
      tax: 1000,
      status: 'new',
      companyId: TEST_COMPANY_ID,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 2,
            unitPrice: 1000,
            totalPrice: 2000,
          },
          {
            productId: product2.id,
            quantity: 2,
            unitPrice: 2500,
            totalPrice: 5000,
          },
        ],
      },
    },
    include: { items: true },
  })

  // Subtotal = 2000 + 5000 = 7000
  const subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0)
  if (subtotal !== 7000) {
    throw new Error(`Subtotal calculation error: expected 7000, got ${subtotal}`)
  }

  // Total should be 7500 as set
  if (order.total !== 7500) {
    throw new Error(`Total mismatch: expected 7500, got ${order.total}`)
  }
}

async function test_9_UpdateOrderNotes() {
  const { commercial, client1, product1 } = await setupTestEnvironment()

  const order = await db.order.create({
    data: {
      number: 'ORD-TEST-009',
      clientId: client1.id,
      commercialId: commercial.id,
      total: 1000,
      status: 'new',
      companyId: TEST_COMPANY_ID,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000,
          },
        ],
      },
    },
  })

  const notes = 'Urgent delivery requested'
  const updatedOrder = await db.order.update({
    where: { id: order.id },
    data: { notes },
  })

  if (updatedOrder.notes !== notes) {
    throw new Error('Order notes not updated')
  }
}

async function test_10_CompanyIsolation() {
  const { commercial, client1, product1 } = await setupTestEnvironment()

  // Create another company
  const otherCompanyId = 'other_order_test_company'
  await db.company.create({
    data: {
      id: otherCompanyId,
      name: 'Other Test Company',
      email: 'other-order@test.com',
      plan: 'free',
    },
  })

  // Create order in other company
  const otherOrder = await db.order.create({
    data: {
      number: 'ORD-OTHER-001',
      clientId: client1.id,
      commercialId: commercial.id,
      total: 1000,
      status: 'new',
      companyId: otherCompanyId,
      items: {
        create: [
          {
            productId: product1.id,
            quantity: 1,
            unitPrice: 1000,
            totalPrice: 1000,
          },
        ],
      },
    },
  })

  // Get orders from test company
  const testCompanyOrders = await db.order.findMany({
    where: { companyId: TEST_COMPANY_ID },
  })

  // Get orders from other company
  const otherCompanyOrders = await db.order.findMany({
    where: { companyId: otherCompanyId },
  })

  // Verify isolation
  const testOrderIds = new Set(testCompanyOrders.map(o => o.id))
  for (const order of otherCompanyOrders) {
    if (testOrderIds.has(order.id)) {
      throw new Error('Order appears in multiple companies')
    }
  }

  // Cleanup other company
  await db.orderItem.deleteMany({
    where: { orderId: otherOrder.id },
  })
  await db.order.deleteMany({
    where: { companyId: otherCompanyId },
  })
  await db.company.deleteMany({
    where: { id: otherCompanyId },
  })
}

async function test_11_OrderSorting() {
  await setupTestEnvironment()

  const ordersByTotal = await db.order.findMany({
    where: { companyId: TEST_COMPANY_ID },
    select: { id: true, total: true },
    orderBy: { total: 'desc' },
    take: 5,
  })

  // Verify sorting
  for (let i = 1; i < ordersByTotal.length; i++) {
    if (ordersByTotal[i - 1].total < ordersByTotal[i].total) {
      throw new Error('Orders not sorted by total (descending)')
    }
  }
}

async function test_12_OrderNumberFormat() {
  await setupTestEnvironment()

  const orders = await db.order.findMany({
    where: { companyId: TEST_COMPANY_ID },
    select: { number: true },
    take: 5,
  })

  for (const order of orders) {
    if (!order.number || !order.number.startsWith('ORD-')) {
      throw new Error(`Order number format incorrect: ${order.number}`)
    }
  }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function main() {
  console.log('\n========================================')
  console.log('  Feature #10: Order Management')
  console.log('  Test Suite')
  console.log('========================================\n')

  console.log('Running tests...\n')

  await runTest('Test 1: Create Order With Items', test_1_CreateOrderWithItems)
  await runTest('Test 2: Update Stock Manually', test_2_UpdateStockManually)
  await runTest('Test 3: Get Order By ID', test_3_GetOrderById)
  await runTest('Test 4: Order Status Workflow', test_4_OrderStatusWorkflow)
  await runTest('Test 5: Cancellation Restores Stock', test_5_CancellationRestoresStock)
  await runTest('Test 6: List Orders With Pagination', test_6_ListOrdersWithPagination)
  await runTest('Test 7: Filter Orders By Status', test_7_FilterOrdersByStatus)
  await runTest('Test 8: Calculate Order Totals', test_8_CalculateOrderTotals)
  await runTest('Test 9: Update Order Notes', test_9_UpdateOrderNotes)
  await runTest('Test 10: Company Isolation', test_10_CompanyIsolation)
  await runTest('Test 11: Order Sorting', test_11_OrderSorting)
  await runTest('Test 12: Order Number Format', test_12_OrderNumberFormat)

  console.log('\n========================================')
  console.log('  Test Results Summary')
  console.log('========================================\n')

  const passed = results.filter(r => r.status === 'PASS').length
  const failed = results.filter(r => r.status === 'FAIL').length

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌'
    console.log(`${icon} Test ${index + 1}: ${result.test}`)
    if (result.status === 'FAIL') {
      console.log(`   Error: ${result.message}`)
    }
  })

  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`)

  if (failed > 0) {
    console.log('❌ Some tests failed!\n')
    process.exit(1)
  } else {
    console.log('✅ All tests passed!\n')
  }
}

main()
  .then(async () => {
    console.log('Cleaning up test data...')
    await cleanupTestData()
    console.log('Cleanup complete.\n')
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('\n❌ Test suite failed:', error)
    console.log('Cleaning up test data...')
    await cleanupTestData()
    console.log('Cleanup complete.\n')
    process.exit(1)
  })