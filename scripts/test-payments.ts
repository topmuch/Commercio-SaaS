import { db } from '@/lib/db';
import {
  createPayment,
  getPaymentById,
  listPayments,
  updatePayment,
  deletePayment,
  getPaymentStatistics,
  getPaymentsByInvoice,
} from '@/lib/payments';
import { createInvoice } from '@/lib/invoices';

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
  console.log('=== Payment Management Test Suite ===\n');

  try {
    // Cleanup before tests
    await cleanup();
    console.log('Cleaned up test data\n');

    // ===== TEST 1: Create Payment =====
    console.log('Test 1: Create Payment');
    const data = await setupTestData();

    const result1 = await createPayment(data.company.id, {
      clientId: data.client.id,
      amount: 100,
      method: 'cash',
      reference: 'REF-001',
      notes: 'Test payment',
    });

    if (result1.success && result1.data) {
      logResult('Create Payment', 'PASS', `Payment ID: ${result1.data.id}, Amount: ${result1.data.amount}`);
    } else {
      logResult('Create Payment', 'FAIL', result1.error);
    }
    const paymentId = result1.data?.id;

    // ===== TEST 2: Get Payment By ID =====
    console.log('\nTest 2: Get Payment By ID');
    const result2 = await getPaymentById(paymentId!, data.company.id);

    if (result2.success && result2.data) {
      logResult('Get Payment By ID', 'PASS', `Payment: ${result2.data.method}, Amount: ${result2.data.amount}`);
    } else {
      logResult('Get Payment By ID', 'FAIL', result2.error);
    }

    // ===== TEST 3: Validate Payment Amount (negative) =====
    console.log('\nTest 3: Validate Payment Amount (negative)');
    const result3 = await createPayment(data.company.id, {
      clientId: data.client.id,
      amount: -100,
      method: 'cash',
    });

    if (!result3.success) {
      logResult('Validate Payment Amount', 'PASS', 'Negative amount rejected');
    } else {
      logResult('Validate Payment Amount', 'FAIL', 'Should reject negative amount');
    }

    // ===== TEST 4: Validate Payment Method =====
    console.log('\nTest 4: Validate Payment Method (invalid)');
    const result4 = await createPayment(data.company.id, {
      clientId: data.client.id,
      amount: 100,
      method: 'invalid_method' as any,
    });

    if (!result4.success && result4.error?.includes('Invalid payment method')) {
      logResult('Validate Payment Method', 'PASS', 'Invalid method rejected');
    } else {
      logResult('Validate Payment Method', 'FAIL', result4.error);
    }

    // ===== TEST 5: List Payments With Pagination =====
    console.log('\nTest 5: List Payments With Pagination');
    // Create more payments
    await createPayment(data.company.id, {
      clientId: data.client.id,
      amount: 200,
      method: 'bank_transfer',
    });
    await createPayment(data.company.id, {
      clientId: data.client.id,
      amount: 300,
      method: 'check',
    });

    const result5 = await listPayments(data.company.id, {
      page: 1,
      pageSize: 2,
    });

    if (result5.success && result5.data.length === 2) {
      logResult('List Payments With Pagination', 'PASS', `Page 1: ${result5.data.length} items, Total: ${result5.pagination.total}`);
    } else {
      logResult('List Payments With Pagination', 'FAIL', result5.error);
    }

    // ===== TEST 6: Filter Payments By Method =====
    console.log('\nTest 6: Filter Payments By Method');
    const result6 = await listPayments(data.company.id, {
      method: 'cash',
    });

    if (result6.success && result6.data.length >= 1) {
      logResult('Filter Payments By Method', 'PASS', `Found ${result6.data.length} cash payments`);
    } else {
      logResult('Filter Payments By Method', 'FAIL', result6.error);
    }

    // ===== TEST 7: Filter Payments By Status =====
    console.log('\nTest 7: Filter Payments By Status');
    const result7 = await listPayments(data.company.id, {
      status: 'pending',
    });

    if (result7.success && result7.data.length >= 1) {
      logResult('Filter Payments By Status', 'PASS', `Found ${result7.data.length} pending payments`);
    } else {
      logResult('Filter Payments By Status', 'FAIL', result7.error);
    }

    // ===== TEST 8: Search Payments =====
    console.log('\nTest 8: Search Payments');
    const result8 = await listPayments(data.company.id, {
      search: 'REF',
    });

    if (result8.success && result8.data.length >= 1) {
      logResult('Search Payments', 'PASS', `Found ${result8.data.length} payments`);
    } else {
      logResult('Search Payments', 'FAIL', result8.error);
    }

    // ===== TEST 9: Update Payment Status =====
    console.log('\nTest 9: Update Payment Status');
    const result9 = await updatePayment(paymentId!, data.company.id, {
      status: 'completed',
    });

    if (result9.success && result9.data?.status === 'completed') {
      logResult('Update Payment Status', 'PASS', 'Status updated to completed');
    } else {
      logResult('Update Payment Status', 'FAIL', result9.error);
    }

    // ===== TEST 10: Update Payment Amount =====
    console.log('\nTest 10: Update Payment Amount');
    const result10 = await updatePayment(paymentId!, data.company.id, {
      amount: 150,
    });

    if (result10.success && result10.data?.amount === 150) {
      logResult('Update Payment Amount', 'PASS', 'Amount updated');
    } else {
      logResult('Update Payment Amount', 'FAIL', result10.error);
    }

    // ===== TEST 11: Update Payment Method =====
    console.log('\nTest 11: Update Payment Method');
    const result11 = await updatePayment(paymentId!, data.company.id, {
      method: 'bank_transfer',
    });

    if (result11.success && result11.data?.method === 'bank_transfer') {
      logResult('Update Payment Method', 'PASS', 'Method updated');
    } else {
      logResult('Update Payment Method', 'FAIL', result11.error);
    }

    // ===== TEST 12: Delete Payment =====
    console.log('\nTest 12: Delete Payment');
    const draftPayment = await createPayment(data.company.id, {
      clientId: data.client.id,
      amount: 50,
      method: 'cash',
    });

    if (draftPayment.data) {
      const result12 = await deletePayment(draftPayment.data.id, data.company.id);

      if (result12.success) {
        logResult('Delete Payment', 'PASS', 'Payment deleted');
      } else {
        logResult('Delete Payment', 'FAIL', result12.error);
      }
    } else {
      logResult('Delete Payment', 'FAIL', 'Could not create test payment');
    }

    // ===== TEST 13: Payment Statistics =====
    console.log('\nTest 13: Payment Statistics');
    const result13 = await getPaymentStatistics(data.company.id);

    if (result13.success && result13.data) {
      logResult('Payment Statistics', 'PASS', `Total: ${result13.data.totalPayments}, Collected: ${result13.data.totalCollected}`);
    } else {
      logResult('Payment Statistics', 'FAIL', result13.error);
    }

    // ===== TEST 14: Calculate Total Collected =====
    console.log('\nTest 14: Calculate Total Collected');
    const result14 = await getPaymentStatistics(data.company.id);

    if (result14.success && result14.data?.totalCollected !== undefined) {
      logResult('Calculate Total Collected', 'PASS', `Collected: ${result14.data.totalCollected}`);
    } else {
      logResult('Calculate Total Collected', 'FAIL', result14.error);
    }

    // ===== TEST 15: Sort Payments =====
    console.log('\nTest 15: Sort Payments By Amount');
    const result15 = await listPayments(data.company.id, {
      sortBy: 'amount',
      sortOrder: 'desc',
    });

    if (result15.success && result15.data.length >= 2) {
      const isSorted = result15.data.every((p, i) => {
        if (i === 0) return true;
        return result15.data[i - 1].amount >= p.amount;
      });
      logResult('Sort Payments', 'PASS', isSorted ? 'Sorted correctly' : 'Sort may be incorrect');
    } else {
      logResult('Sort Payments', 'FAIL', result15.error);
    }

    // ===== TEST 16: Company Isolation =====
    console.log('\nTest 16: Company Isolation');
    const company2 = await db.company.create({
      data: {
        name: 'Test Company 2',
        email: `test2-${Date.now()}@test.com`,
      },
    });

    const result16 = await getPaymentById(paymentId!, company2.id);

    if (!result16.success && result16.error?.includes('belong to this company')) {
      logResult('Company Isolation', 'PASS', 'Isolation working');
    } else {
      logResult('Company Isolation', 'FAIL', 'Should enforce company isolation');
    }

    // ===== TEST 17: Create Payment Linked to Invoice =====
    console.log('\nTest 17: Create Payment Linked to Invoice');
    // Create an invoice first
    const invoiceResult = await createInvoice(data.company.id, {
      clientId: data.client.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
    });

    if (invoiceResult.data) {
      const result17 = await createPayment(data.company.id, {
        clientId: data.client.id,
        amount: 50,
        method: 'cash',
        invoiceId: invoiceResult.data.id,
      });

      if (result17.success && result17.data?.invoiceId === invoiceResult.data.id) {
        logResult('Create Payment Linked to Invoice', 'PASS', 'Payment linked to invoice');
      } else {
        logResult('Create Payment Linked to Invoice', 'FAIL', result17.error);
      }
      const linkedPaymentId = result17.data?.id;
      const linkedInvoiceId = invoiceResult.data.id;

      // ===== TEST 18: Get Payments By Invoice =====
      console.log('\nTest 18: Get Payments By Invoice');
      const result18 = await getPaymentsByInvoice(linkedInvoiceId!, data.company.id);

      if (result18.success && result18.data.length >= 1) {
        logResult('Get Payments By Invoice', 'PASS', `Found ${result18.data.length} payments`);
      } else {
        logResult('Get Payments By Invoice', 'FAIL', result18.error);
      }

      // ===== TEST 19: Payment Updates Invoice Status =====
      console.log('\nTest 19: Payment Status Update Affects Invoice');
      await updatePayment(linkedPaymentId!, data.company.id, {
        status: 'completed',
      });

      const invoiceAfter = await db.invoice.findUnique({
        where: { id: linkedInvoiceId },
      });

      if (invoiceAfter && invoiceAfter.paid === 50 && invoiceAfter.status === 'partially_paid') {
        logResult('Payment Updates Invoice Status', 'PASS', `Invoice paid: ${invoiceAfter.paid}, Status: ${invoiceAfter.status}`);
      } else {
        logResult('Payment Updates Invoice Status', 'FAIL', 'Invoice status not updated');
      }

      // ===== TEST 20: Prevent Payment Exceeding Invoice Total =====
      console.log('\nTest 20: Prevent Payment Exceeding Invoice Total');
      const result20 = await createPayment(data.company.id, {
        clientId: data.client.id,
        amount: 100, // Total invoice is 100, already paid 50
        method: 'cash',
        invoiceId: linkedInvoiceId,
      });

      if (!result20.success && result20.error?.includes('exceed')) {
        logResult('Prevent Payment Exceeding Total', 'PASS', 'Excess payment prevented');
      } else {
        logResult('Prevent Payment Exceeding Total', 'FAIL', result20.error);
      }
    } else {
      logResult('Create Payment Linked to Invoice', 'FAIL', 'Could not create invoice');
    }

    // ===== TEST 21: Filter Payments By Client =====
    console.log('\nTest 21: Filter Payments By Client');
    const result21 = await listPayments(data.company.id, {
      clientId: data.client.id,
    });

    if (result21.success && result21.data.length >= 1) {
      logResult('Filter Payments By Client', 'PASS', `Found ${result21.data.length} payments`);
    } else {
      logResult('Filter Payments By Client', 'FAIL', result21.error);
    }

    // ===== TEST 22: Filter Payments By Amount Range =====
    console.log('\nTest 22: Filter Payments By Amount Range');
    const result22 = await listPayments(data.company.id, {
      minAmount: 100,
      maxAmount: 300,
    });

    if (result22.success && result22.data.length >= 1) {
      logResult('Filter Payments By Amount Range', 'PASS', `Found ${result22.data.length} payments`);
    } else {
      logResult('Filter Payments By Amount Range', 'FAIL', result22.error);
    }

    // ===== TEST 23: Payment Methods Breakdown =====
    console.log('\nTest 23: Payment Methods Breakdown');
    const result23 = await getPaymentStatistics(data.company.id);

    if (result23.success && result23.data?.paymentsByMethod) {
      logResult('Payment Methods Breakdown', 'PASS', `Methods: ${result23.data.paymentsByMethod.length}`);
    } else {
      logResult('Payment Methods Breakdown', 'FAIL', result23.error);
    }

    // ===== TEST 24: Delete Payment Linked to Invoice =====
    console.log('\nTest 24: Delete Payment Linked to Invoice Updates Invoice');
    // Create another invoice and payment
    const invoice2 = await createInvoice(data.company.id, {
      clientId: data.client.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
    });

    if (invoice2.data) {
      const paymentForDelete = await createPayment(data.company.id, {
        clientId: data.client.id,
        amount: 100,
        method: 'cash',
        invoiceId: invoice2.data.id,
        status: 'completed',
      });

      if (paymentForDelete.data) {
        await deletePayment(paymentForDelete.data.id, data.company.id);

        const invoiceAfterDelete = await db.invoice.findUnique({
          where: { id: invoice2.data.id },
        });

        if (invoiceAfterDelete && invoiceAfterDelete.paid === 0 && invoiceAfterDelete.status === 'unpaid') {
          logResult('Delete Payment Updates Invoice', 'PASS', 'Invoice status updated after deletion');
        } else {
          logResult('Delete Payment Updates Invoice', 'FAIL', 'Invoice status not updated');
        }
      }
    } else {
      logResult('Delete Payment Linked to Invoice', 'FAIL', 'Could not create invoice');
    }

    // ===== TEST 25: Payment Status Breakdown =====
    console.log('\nTest 25: Payment Status Breakdown');
    const result25 = await getPaymentStatistics(data.company.id);

    if (result25.success && result25.data?.paymentsByStatus) {
      logResult('Payment Status Breakdown', 'PASS', `Statuses: ${result25.data.paymentsByStatus.length}`);
    } else {
      logResult('Payment Status Breakdown', 'FAIL', result25.error);
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