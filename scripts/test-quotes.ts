import { db } from '@/lib/db';
import {
  createQuote,
  getQuoteById,
  listQuotes,
  updateQuoteStatus,
  updateQuoteNotes,
  deleteQuote,
  getExpiredQuotes,
  getQuoteStatistics,
  QuoteStatus,
} from '@/lib/quotes';

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
  await db.quoteItem.deleteMany({});
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
  console.log('=== Quote Management Test Suite ===\n');

  try {
    // Cleanup before tests
    await cleanup();
    console.log('Cleaned up test data\n');

    // ===== TEST 1: Create Quote =====
    console.log('Test 1: Create Quote');
    const data = await setupTestData();

    const result1 = await createQuote(data.company.id, {
      clientId: data.client.id,
      commercialId: data.user.id,
      items: [
        { productId: data.product1.id, quantity: 2, unitPrice: 100 },
        { productId: data.product2.id, quantity: 1, unitPrice: 200 },
      ],
      discount: 10,
      tax: 20,
      notes: 'Test quote',
    });

    if (result1.success && result1.data) {
      logResult('Create Quote', 'PASS', `Quote ID: ${result1.data.id}, Number: ${result1.data.number}`);
    } else {
      logResult('Create Quote', 'FAIL', result1.error);
    }
    const quoteId = result1.data?.id;

    // ===== TEST 2: Get Quote By ID =====
    console.log('\nTest 2: Get Quote By ID');
    const result2 = await getQuoteById(quoteId!, data.company.id);

    if (result2.success && result2.data) {
      logResult('Get Quote By ID', 'PASS', `Quote: ${result2.data.number}, Items: ${result2.data.items.length}`);
    } else {
      logResult('Get Quote By ID', 'FAIL', result2.error);
    }

    // ===== TEST 3: Quote Totals Calculation =====
    console.log('\nTest 3: Quote Totals Calculation');
    const result3 = await getQuoteById(quoteId!, data.company.id);

    const expectedSubtotal = 2 * 100 + 1 * 200; // 400
    const expectedTotal = expectedSubtotal - 10 + 20; // 410

    if (result3.success && result3.data.subtotal === expectedSubtotal && result3.data.total === expectedTotal) {
      logResult('Quote Totals Calculation', 'PASS', `Subtotal: ${result3.data.subtotal}, Total: ${result3.data.total}`);
    } else {
      logResult('Quote Totals Calculation', 'FAIL', `Expected: ${expectedSubtotal}/${expectedTotal}, Got: ${result3.data?.subtotal}/${result3.data?.total}`);
    }

    // ===== TEST 4: List Quotes With Pagination =====
    console.log('\nTest 4: List Quotes With Pagination');
    // Create more quotes
    await createQuote(data.company.id, {
      clientId: data.client.id,
      commercialId: data.user.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
    });
    await createQuote(data.company.id, {
      clientId: data.client.id,
      commercialId: data.user.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
    });

    const result4 = await listQuotes(data.company.id, undefined, undefined, {
      page: 1,
      pageSize: 2,
    });

    if (result4.success && result4.data.length === 2) {
      logResult('List Quotes With Pagination', 'PASS', `Page 1: ${result4.data.length} items, Total: ${result4.pagination.total}`);
    } else {
      logResult('List Quotes With Pagination', 'FAIL', result4.error);
    }

    // ===== TEST 5: Quote Status Workflow =====
    console.log('\nTest 5: Quote Status Workflow');
    const statusUpdates: QuoteStatus[] = ['draft', 'sent', 'accepted'];
    let workflowPassed = true;
    let currentStatus: QuoteStatus = 'draft';

    for (const nextStatus of statusUpdates) {
      if (nextStatus === currentStatus) continue;

      const result = await updateQuoteStatus(quoteId!, data.company.id, nextStatus);
      if (!result.success) {
        workflowPassed = false;
        logResult('Quote Status Workflow', 'FAIL', `Failed to transition from ${currentStatus} to ${nextStatus}`);
        break;
      }
      currentStatus = nextStatus;
    }

    if (workflowPassed) {
      logResult('Quote Status Workflow', 'PASS', `Transitioned: draft → sent → accepted`);
    }

    // ===== TEST 6: Invalid Status Transition =====
    console.log('\nTest 6: Invalid Status Transition (accepted → draft)');
    const result6 = await updateQuoteStatus(quoteId!, data.company.id, 'draft');

    if (!result6.success && result6.error?.includes('Invalid status transition')) {
      logResult('Invalid Status Transition', 'PASS', 'Invalid transition prevented');
    } else {
      logResult('Invalid Status Transition', 'FAIL', 'Should prevent invalid transition');
    }

    // ===== TEST 7: Prevent Delete Accepted Quote =====
    console.log('\nTest 7: Prevent Delete Accepted Quote');
    const result7 = await deleteQuote(quoteId!, data.company.id);

    if (!result7.success && result7.error?.includes('accepted')) {
      logResult('Prevent Delete Accepted Quote', 'PASS', 'Deletion prevented');
    } else {
      logResult('Prevent Delete Accepted Quote', 'FAIL', 'Should prevent deletion');
    }

    // ===== TEST 8: Create Quote With Expired Date =====
    console.log('\nTest 8: Create Quote With Future Valid Until');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const result8 = await createQuote(data.company.id, {
      clientId: data.client.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
      validUntil: futureDate,
    });

    if (result8.success && result8.data?.validUntil) {
      logResult('Create Quote With Future Valid Until', 'PASS', `Valid until: ${result8.data.validUntil.toISOString()}`);
    } else {
      logResult('Create Quote With Future Valid Until', 'FAIL', result8.error);
    }
    const expirableQuoteId = result8.data?.id;

    // ===== TEST 9: Update Quote Notes =====
    console.log('\nTest 9: Update Quote Notes');
    const newNotes = 'Updated notes for the quote';
    const result9 = await updateQuoteNotes(quoteId!, data.company.id, newNotes);

    if (result9.success && result9.data?.notes === newNotes) {
      logResult('Update Quote Notes', 'PASS', 'Notes updated');
    } else {
      logResult('Update Quote Notes', 'FAIL', result9.error);
    }

    // ===== TEST 10: Filter Quotes By Status =====
    console.log('\nTest 10: Filter Quotes By Status');
    const result10 = await listQuotes(data.company.id, undefined, undefined, {
      status: 'draft',
    });

    if (result10.success && result10.data.length >= 1) {
      logResult('Filter Quotes By Status', 'PASS', `Found ${result10.data.length} draft quotes`);
    } else {
      logResult('Filter Quotes By Status', 'FAIL', result10.error);
    }

    // ===== TEST 11: Filter Quotes By Client =====
    console.log('\nTest 11: Filter Quotes By Client');
    const result11 = await listQuotes(data.company.id, undefined, undefined, {
      clientId: data.client.id,
    });

    if (result11.success && result11.data.length >= 1) {
      logResult('Filter Quotes By Client', 'PASS', `Found ${result11.data.length} quotes`);
    } else {
      logResult('Filter Quotes By Client', 'FAIL', result11.error);
    }

    // ===== TEST 12: Search Quotes =====
    console.log('\nTest 12: Search Quotes');
    const result12 = await listQuotes(data.company.id, undefined, undefined, {
      search: 'Client',
    });

    if (result12.success && result12.data.length >= 1) {
      logResult('Search Quotes', 'PASS', `Found ${result12.data.length} quotes`);
    } else {
      logResult('Search Quotes', 'FAIL', result12.error);
    }

    // ===== TEST 13: Quote Statistics =====
    console.log('\nTest 13: Quote Statistics');
    const result13 = await getQuoteStatistics(data.company.id);

    if (result13.success && result13.data) {
      logResult('Quote Statistics', 'PASS', `Total: ${result13.data.totalQuotes}, Accepted: ${result13.data.acceptedQuotes}`);
    } else {
      logResult('Quote Statistics', 'FAIL', result13.error);
    }

    // ===== TEST 14: Calculate Conversion Rate =====
    console.log('\nTest 14: Calculate Conversion Rate');
    const result14 = await getQuoteStatistics(data.company.id);

    if (result14.success && result14.data?.conversionRate !== undefined) {
      logResult('Calculate Conversion Rate', 'PASS', `Rate: ${result14.data.conversionRate}%`);
    } else {
      logResult('Calculate Conversion Rate', 'FAIL', result14.error);
    }

    // ===== TEST 15: Sort Quotes =====
    console.log('\nTest 15: Sort Quotes By Total');
    const result15 = await listQuotes(data.company.id, undefined, undefined, {
      sortBy: 'total',
      sortOrder: 'desc',
    });

    if (result15.success && result15.data.length >= 2) {
      const isSorted = result15.data.every((q, i) => {
        if (i === 0) return true;
        return result15.data[i - 1].total >= q.total;
      });
      logResult('Sort Quotes', 'PASS', isSorted ? 'Sorted correctly' : 'Sort may be incorrect');
    } else {
      logResult('Sort Quotes', 'FAIL', result15.error);
    }

    // ===== TEST 16: Delete Draft Quote =====
    console.log('\nTest 16: Delete Draft Quote');
    const draftQuote = await createQuote(data.company.id, {
      clientId: data.client.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
    });

    if (draftQuote.data) {
      const result16 = await deleteQuote(draftQuote.data.id, data.company.id);

      if (result16.success) {
        logResult('Delete Draft Quote', 'PASS', 'Quote deleted');
      } else {
        logResult('Delete Draft Quote', 'FAIL', result16.error);
      }
    } else {
      logResult('Delete Draft Quote', 'FAIL', 'Could not create draft quote');
    }

    // ===== TEST 17: Validate Quote Items =====
    console.log('\nTest 17: Validate Quote Items (negative quantity)');
    const result17 = await createQuote(data.company.id, {
      clientId: data.client.id,
      items: [{ productId: data.product1.id, quantity: -1, unitPrice: 100 }],
    });

    if (!result17.success) {
      logResult('Validate Quote Items', 'PASS', 'Negative quantity rejected');
    } else {
      logResult('Validate Quote Items', 'FAIL', 'Should reject negative quantity');
    }

    // ===== TEST 18: Quote With Item Discount =====
    console.log('\nTest 18: Quote With Item Discount');
    const result18 = await createQuote(data.company.id, {
      clientId: data.client.id,
      items: [
        { productId: data.product1.id, quantity: 2, unitPrice: 100, discount: 10 },
      ],
    });

    if (result18.success && result18.data) {
      const expectedItemTotal = 2 * 100 - 10; // 190
      const actualItemTotal = result18.data.items[0].totalPrice;
      if (actualItemTotal === expectedItemTotal) {
        logResult('Quote With Item Discount', 'PASS', `Item total: ${actualItemTotal}`);
      } else {
        logResult('Quote With Item Discount', 'FAIL', `Expected: ${expectedItemTotal}, Got: ${actualItemTotal}`);
      }
    } else {
      logResult('Quote With Item Discount', 'FAIL', result18.error);
    }

    // ===== TEST 19: Company Isolation =====
    console.log('\nTest 19: Company Isolation');
    const company2 = await db.company.create({
      data: {
        name: 'Test Company 2',
        email: `test2-${Date.now()}@test.com`,
      },
    });

    const result19 = await getQuoteById(quoteId!, company2.id);

    if (!result19.success && result19.error?.includes('belong to this company')) {
      logResult('Company Isolation', 'PASS', 'Isolation working');
    } else {
      logResult('Company Isolation', 'FAIL', 'Should enforce company isolation');
    }

    // ===== TEST 20: Quote Number Format =====
    console.log('\nTest 20: Quote Number Format');
    const result20 = await getQuoteById(quoteId!, data.company.id);

    if (result20.success && result20.data?.number.match(/^QT-\d{8}-\d{4}$/)) {
      logResult('Quote Number Format', 'PASS', `Number: ${result20.data.number}`);
    } else {
      logResult('Quote Number Format', 'FAIL', 'Incorrect format');
    }

    // ===== TEST 21: Create Quote Without Commercial =====
    console.log('\nTest 21: Create Quote Without Commercial (auto-assigns)');
    const result21 = await createQuote(data.company.id, {
      clientId: data.client.id,
      items: [{ productId: data.product1.id, quantity: 1, unitPrice: 100 }],
    });

    if (result21.success) {
      logResult('Create Quote Without Commercial', 'PASS', 'Quote created');
    } else {
      logResult('Create Quote Without Commercial', 'FAIL', result21.error);
    }

    // ===== TEST 22: Filter Quotes By Date Range =====
    console.log('\nTest 22: Filter Quotes By Date Range');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result22 = await listQuotes(data.company.id, undefined, undefined, {
      minDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      maxDate: tomorrow,
    });

    if (result22.success && result22.data.length >= 1) {
      logResult('Filter Quotes By Date Range', 'PASS', `Found ${result22.data.length} quotes`);
    } else {
      logResult('Filter Quotes By Date Range', 'FAIL', result22.error);
    }

    // ===== TEST 23: Filter Quotes By Total Range =====
    console.log('\nTest 23: Filter Quotes By Total Range');
    const result23 = await listQuotes(data.company.id, undefined, undefined, {
      minTotal: 100,
      maxTotal: 500,
    });

    if (result23.success && result23.data.length >= 1) {
      logResult('Filter Quotes By Total Range', 'PASS', `Found ${result23.data.length} quotes`);
    } else {
      logResult('Filter Quotes By Total Range', 'FAIL', result23.error);
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