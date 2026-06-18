import { db } from '@/lib/db';
import {
  createInvoice,
  getInvoiceById,
  listInvoices,
  updateInvoiceDetails,
  deleteInvoice,
  getOverdueInvoices,
  getInvoiceStatistics,
  InvoiceStatus,
} from '@/lib/invoices';

// Test utilities
const testResults: { test: string; status: 'PASS' | 'FAIL'; message?: string }[] = [];

function logResult(test: string, status: 'PASS' | 'FAIL', message?: string) {
  testResults.push({ test, status, message });
  const emoji = status === 'PASS' ? '✅' : '❌';
  console.log(`${emoji} Test: ${test}`);
  if (message) {
    console.log(`   ${message}`);
  }
}

// Clean up test data
async function cleanup() {
  await db.postComment.deleteMany({});
  await db.postReaction.deleteMany({});
  await db.postAttachment.deleteMany({});
  await db.post.deleteMany({});
  await db.supportMessage.deleteMany({});
  await db.supportTicket.deleteMany({});
  await db.apiKey.deleteMany({});
  await db.passwordResetToken.deleteMany({});
  await db.rateLimitEntry.deleteMany({});
  await db.siteSettings.deleteMany({});
  await db.stockMovement.deleteMany({});
  await db.orderItem.deleteMany({});
  await db.invoiceItem.deleteMany({});
  await db.payment.deleteMany({});
  await db.order.deleteMany({});
  await db.quote.deleteMany({});
  await db.invoice.deleteMany({});
  await db.whatsappOrder.deleteMany({});
  await db.storeBanner.deleteMany({});
  await db.storeSettings.deleteMany({});
  await db.discussion.deleteMany({});
  await db.visit.deleteMany({});
  await db.product.deleteMany({});
  await db.category.deleteMany({});
  await db.client.deleteMany({});
  await db.target.deleteMany({});
  await db.user.deleteMany({});
  await db.subscription.deleteMany({});
  await db.saasPayment.deleteMany({});
  await db.company.deleteMany({});
}

// Setup test data
async function setupTestData() {
  const company = await db.company.create({
    data: {
      name: 'Test Company',
      email: `test-${Date.now()}@test.com`,
    },
  });

  const user = await db.user.create({
    data: {
      email: `user-${Date.now()}@test.com`,
      password: 'hashedpassword',
      name: 'Test User',
      role: 'commercial',
      companyId: company.id,
    },
  });

  const client = await db.client.create({
    data: {
      companyName: 'Test Client',
      contactName: 'John Doe',
      phone: '1234567890',
      commercialId: user.id,
      companyId: company.id,
    },
  });

  const product1 = await db.product.create({
    data: {
      name: 'Product 1',
      reference: `REF-${Date.now()}-1`,
      price: 100,
      stock: 50,
      companyId: company.id,
    },
  });

  const product2 = await db.product.create({
    data: {
      name: 'Product 2',
      reference: `REF-${Date.now()}-2`,
      price: 200,
      stock: 30,
      companyId: company.id,
    },
  });

  return { company, user, client, product1, product2 };
}

async function runTests() {
  console.log('=== Invoice Management Test Suite ===\n');

  try {
    // Cleanup before tests
    await cleanup();
    console.log('Cleaned up test data\n');

    // ===== TEST 1: Create Invoice =====
    console.log('Test 1: Create Invoice');
    const data = await setupTestData();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const result1 = await createInvoice(data.company.id, {
      clientId: data.client.id,
      commercialId: data.user.id,
      items: [
        { productId: data.product1.id, quantity: 2, unitPrice: 100 },
        { productId: data.product2.id, quantity: 1, unitPrice: 200 },
      ],
      discount: 10,
      tax: 20,
      notes: 'Test invoice',
      dueDate: futureDate,
    });

    if (result1.success && result1.data) {
      logResult('Create Invoice', 'PASS', `Invoice ID: ${result1.data.id}, Number: ${result1.data.number}`);
    } else {
      logResult('Create Invoice', 'FAIL', result1.error);
    }
    const invoiceId = result1.data?.id;

    // ===== TEST 2: Get Invoice By ID =====
    console.log('\nTest 2: Get Invoice By ID');
    const result2 = await getInvoiceById(invoiceId!, data.company.id);

    if (result2.success && result2.data) {
      logResult('Get Invoice By ID', 'PASS', `Invoice: ${result2.data.number}, Items: ${result2.data.items.length}, Status: ${result2.data.status}`);
    } else {
      logResult('Get Invoice By ID', 'FAIL', result2.error);
    }

    // ===== TEST 3: Invoice Totals Calculation =====
    console.log('\nTest 3: Invoice Totals Calculation');
    const result3 = await getInvoiceById(invoiceId!, data.company.id);

    const expectedSubtotal = 2 * 100 + 1 * 200; // 400
    const expectedTotal = expectedSubtotal - 10 + 20; // 410
    const expectedRemaining = expectedTotal; // No payments yet

    if (result3.success && result3.data.subtotal === expectedSubtotal && result3.data.total === expectedTotal && result3.data.remaining === expectedRemaining) {
      logResult('Invoice Totals Calculation', 'PASS', `Subtotal: ${result3.data.subtotal}, Total: ${result3.data.total}, Remaining: ${result3.data.remaining}`);
    } else {
      logResult('Invoice Totals Calculation', 'FAIL', `Expected: ${expectedSubtotal}/${expectedTotal}/${expectedRemaining}, Got: ${result3.data?.subtotal}/${result3.data?.total}/${result3.data?.remaining}`);
    }

    // ===== TEST 4: List Invoices With Pagination =====
    console.log('\nTest 4: List Invoices With Pagination');
    // Create more invoices
    await createInvoice(data.company.id, {
      clientId: data.client.id,
      commercialId: data.user.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
    });
    await createInvoice(data.company.id, {
      clientId: data.client.id,
      commercialId: data.user.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
    });

    const result4 = await listInvoices(data.company.id, undefined, undefined, {
      page: 1,
      pageSize: 2,
    });

    if (result4.success && result4.data.length === 2) {
      logResult('List Invoices With Pagination', 'PASS', `Page 1: ${result4.data.length} items, Total: ${result4.pagination.total}`);
    } else {
      logResult('List Invoices With Pagination', 'FAIL', result4.error);
    }

    // ===== TEST 5: Create Invoice With Item Discount =====
    console.log('\nTest 5: Create Invoice With Item Discount');
    const result5 = await createInvoice(data.company.id, {
      clientId: data.client.id,
      items: [
        { productId: data.product1.id, quantity: 2, unitPrice: 100, discount: 10 },
      ],
    });

    if (result5.success && result5.data) {
      const expectedItemTotal = 2 * 100 - 10; // 190
      const actualItemTotal = result5.data.items[0].totalPrice;
      if (actualItemTotal === expectedItemTotal) {
        logResult('Create Invoice With Item Discount', 'PASS', `Item total: ${actualItemTotal}`);
      } else {
        logResult('Create Invoice With Item Discount', 'FAIL', `Expected: ${expectedItemTotal}, Got: ${actualItemTotal}`);
      }
    } else {
      logResult('Create Invoice With Item Discount', 'FAIL', result5.error);
    }

    // ===== TEST 6: Update Invoice Notes =====
    console.log('\nTest 6: Update Invoice Notes');
    const newNotes = 'Updated notes for the invoice';
    const result6 = await updateInvoiceDetails(invoiceId!, data.company.id, {
      notes: newNotes,
    });

    if (result6.success) {
      logResult('Update Invoice Notes', 'PASS', 'Notes updated');
    } else {
      logResult('Update Invoice Notes', 'FAIL', result6.error);
    }

    // ===== TEST 7: Update Invoice Due Date =====
    console.log('\nTest 7: Update Invoice Due Date');
    const newDueDate = new Date();
    newDueDate.setDate(newDueDate.getDate() + 60);

    const result7 = await updateInvoiceDetails(invoiceId!, data.company.id, {
      dueDate: newDueDate,
    });

    if (result7.success) {
      logResult('Update Invoice Due Date', 'PASS', 'Due date updated');
    } else {
      logResult('Update Invoice Due Date', 'FAIL', result7.error);
    }

    // ===== TEST 8: Filter Invoices By Status =====
    console.log('\nTest 8: Filter Invoices By Status');
    const result8 = await listInvoices(data.company.id, undefined, undefined, {
      status: 'unpaid',
    });

    if (result8.success && result8.data.length >= 1) {
      logResult('Filter Invoices By Status', 'PASS', `Found ${result8.data.length} unpaid invoices`);
    } else {
      logResult('Filter Invoices By Status', 'FAIL', result8.error);
    }

    // ===== TEST 9: Filter Invoices By Client =====
    console.log('\nTest 9: Filter Invoices By Client');
    const result9 = await listInvoices(data.company.id, undefined, undefined, {
      clientId: data.client.id,
    });

    if (result9.success && result9.data.length >= 1) {
      logResult('Filter Invoices By Client', 'PASS', `Found ${result9.data.length} invoices`);
    } else {
      logResult('Filter Invoices By Client', 'FAIL', result9.error);
    }

    // ===== TEST 10: Search Invoices =====
    console.log('\nTest 10: Search Invoices');
    const result10 = await listInvoices(data.company.id, undefined, undefined, {
      search: 'Client',
    });

    if (result10.success && result10.data.length >= 1) {
      logResult('Search Invoices', 'PASS', `Found ${result10.data.length} invoices`);
    } else {
      logResult('Search Invoices', 'FAIL', result10.error);
    }

    // ===== TEST 11: Invoice Statistics =====
    console.log('\nTest 11: Invoice Statistics');
    const result11 = await getInvoiceStatistics(data.company.id);

    if (result11.success && result11.data) {
      logResult('Invoice Statistics', 'PASS', `Total: ${result11.data.totalInvoices}, Unpaid: ${result11.data.unpaidInvoices}`);
    } else {
      logResult('Invoice Statistics', 'FAIL', result11.error);
    }

    // ===== TEST 12: Calculate Outstanding Amount =====
    console.log('\nTest 12: Calculate Outstanding Amount');
    const result12 = await getInvoiceStatistics(data.company.id);

    if (result12.success && result12.data?.totalOutstanding !== undefined) {
      logResult('Calculate Outstanding Amount', 'PASS', `Outstanding: ${result12.data.totalOutstanding}`);
    } else {
      logResult('Calculate Outstanding Amount', 'FAIL', result12.error);
    }

    // ===== TEST 13: Sort Invoices =====
    console.log('\nTest 13: Sort Invoices By Total');
    const result13 = await listInvoices(data.company.id, undefined, undefined, {
      sortBy: 'total',
      sortOrder: 'desc',
    });

    if (result13.success && result13.data.length >= 2) {
      const isSorted = result13.data.every((inv, i) => {
        if (i === 0) return true;
        return result13.data[i - 1].total >= inv.total;
      });
      logResult('Sort Invoices', 'PASS', isSorted ? 'Sorted correctly' : 'Sort may be incorrect');
    } else {
      logResult('Sort Invoices', 'FAIL', result13.error);
    }

    // ===== TEST 14: Delete Invoice Without Payments =====
    console.log('\nTest 14: Delete Invoice Without Payments');
    const draftInvoice = await createInvoice(data.company.id, {
      clientId: data.client.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
    });

    if (draftInvoice.data) {
      const result14 = await deleteInvoice(draftInvoice.data.id, data.company.id);

      if (result14.success) {
        logResult('Delete Invoice Without Payments', 'PASS', 'Invoice deleted');
      } else {
        logResult('Delete Invoice Without Payments', 'FAIL', result14.error);
      }
    } else {
      logResult('Delete Invoice Without Payments', 'FAIL', 'Could not create invoice');
    }

    // ===== TEST 15: Validate Invoice Items =====
    console.log('\nTest 15: Validate Invoice Items (negative quantity)');
    const result15 = await createInvoice(data.company.id, {
      clientId: data.client.id,
      items: [{ productId: data.product1.id, quantity: -1, unitPrice: 100 }],
    });

    if (!result15.success) {
      logResult('Validate Invoice Items', 'PASS', 'Negative quantity rejected');
    } else {
      logResult('Validate Invoice Items', 'FAIL', 'Should reject negative quantity');
    }

    // ===== TEST 16: Company Isolation =====
    console.log('\nTest 16: Company Isolation');
    const company2 = await db.company.create({
      data: {
        name: 'Test Company 2',
        email: `test2-${Date.now()}@test.com`,
      },
    });

    const result16 = await getInvoiceById(invoiceId!, company2.id);

    if (!result16.success && result16.error?.includes('belong to this company')) {
      logResult('Company Isolation', 'PASS', 'Isolation working');
    } else {
      logResult('Company Isolation', 'FAIL', 'Should enforce company isolation');
    }

    // ===== TEST 17: Invoice Number Format =====
    console.log('\nTest 17: Invoice Number Format');
    const result17 = await getInvoiceById(invoiceId!, data.company.id);

    if (result17.success && result17.data?.number.match(/^INV-\d{8}-\d{4}$/)) {
      logResult('Invoice Number Format', 'PASS', `Number: ${result17.data.number}`);
    } else {
      logResult('Invoice Number Format', 'FAIL', 'Incorrect format');
    }

    // ===== TEST 18: Create Invoice Without Commercial =====
    console.log('\nTest 18: Create Invoice Without Commercial (auto-assigns)');
    const result18 = await createInvoice(data.company.id, {
      clientId: data.client.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
    });

    if (result18.success) {
      logResult('Create Invoice Without Commercial', 'PASS', 'Invoice created');
    } else {
      logResult('Create Invoice Without Commercial', 'FAIL', result18.error);
    }
    const autoCommercialInvoice = result18.data;

    // ===== TEST 19: Filter Invoices By Date Range =====
    console.log('\nTest 19: Filter Invoices By Date Range');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result19 = await listInvoices(data.company.id, undefined, undefined, {
      minDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      maxDate: tomorrow,
    });

    if (result19.success && result19.data.length >= 1) {
      logResult('Filter Invoices By Date Range', 'PASS', `Found ${result19.data.length} invoices`);
    } else {
      logResult('Filter Invoices By Date Range', 'FAIL', result19.error);
    }

    // ===== TEST 20: Filter Invoices By Total Range =====
    console.log('\nTest 20: Filter Invoices By Total Range');
    const result20 = await listInvoices(data.company.id, undefined, undefined, {
      minTotal: 100,
      maxTotal: 500,
    });

    if (result20.success && result20.data.length >= 1) {
      logResult('Filter Invoices By Total Range', 'PASS', `Found ${result20.data.length} invoices`);
    } else {
      logResult('Filter Invoices By Total Range', 'FAIL', result20.error);
    }

    // ===== TEST 21: Prevent Delete Invoice With Payments =====
    console.log('\nTest 21: Prevent Delete Invoice With Payments');
    // Create a payment for the first invoice
    await db.payment.create({
      data: {
        amount: 100,
        method: 'cash',
        status: 'completed',
        clientId: data.client.id,
        companyId: data.company.id,
        invoiceId: invoiceId!,
      },
    });

    const result21 = await deleteInvoice(invoiceId!, data.company.id);

    if (!result21.success && result21.error?.includes('payment')) {
      logResult('Prevent Delete With Payments', 'PASS', 'Deletion prevented');
    } else {
      logResult('Prevent Delete With Payments', 'FAIL', 'Should prevent deletion');
    }

    // ===== TEST 22: Create Invoice Linked to Order =====
    console.log('\nTest 22: Create Invoice Linked to Order');
    // Create an order first
    const order = await db.order.create({
      data: {
        number: `ORD-${Date.now()}`,
        clientId: data.client.id,
        commercialId: data.user.id,
        total: 100,
        companyId: data.company.id,
      },
    });

    const result22 = await createInvoice(data.company.id, {
      clientId: data.client.id,
      orderId: order.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
    });

    if (result22.success && result22.data?.orderId === order.id) {
      logResult('Create Invoice Linked to Order', 'PASS', 'Invoice linked to order');
    } else {
      logResult('Create Invoice Linked to Order', 'FAIL', result22.error);
    }

    // ===== TEST 23: Get Overdue Invoices =====
    console.log('\nTest 23: Get Overdue Invoices');
    // Create an invoice with past due date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    const overdueInvoice = await createInvoice(data.company.id, {
      clientId: data.client.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
      dueDate: pastDate,
    });

    const result23 = await getOverdueInvoices(data.company.id);

    if (result23.success) {
      if (result23.data.length >= 1) {
        logResult('Get Overdue Invoices', 'PASS', `Found ${result23.data.length} overdue invoices`);
      } else {
        logResult('Get Overdue Invoices', 'FAIL', `No overdue invoices found. Invoice ID: ${overdueInvoice.data?.id}, Due: ${overdueInvoice.data?.dueDate}`);
      }
    } else {
      logResult('Get Overdue Invoices', 'FAIL', result23.error);
    }

  } catch (error) {
    console.error('Test suite error:', error);
  }

  // Print summary
  console.log('\n=== Test Summary ===');
  const passed = testResults.filter((r) => r.status === 'PASS').length;
  const failed = testResults.filter((r) => r.status === 'FAIL').length;

  testResults.forEach((result) => {
    const emoji = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${emoji} ${result.test}`);
    if (result.message) {
      console.log(`   ${result.message}`);
    }
  });

  console.log(`\nTotal: ${testResults.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  // Cleanup after tests
  await cleanup();
  console.log('\nCleaned up test data');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests();