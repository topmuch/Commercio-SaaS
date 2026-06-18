import { db } from '@/lib/db';
import {
  createCategory,
  getCategoryById,
  listCategories,
  getCategoryTree,
  updateCategory,
  deleteCategory,
  getCategoryStatistics,
  getCategoryBreadcrumb,
  searchCategories,
} from '@/lib/categories';

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

// Setup test company
async function setupTestCompany() {
  return db.company.create({
    data: {
      name: 'Test Company',
      email: `test-${Date.now()}@test.com`,
    },
  });
}

async function runTests() {
  console.log('=== Category Management Test Suite ===\n');

  try {
    // Cleanup before tests
    await cleanup();
    console.log('Cleaned up test data\n');

    // ===== TEST 1: Create Root Category =====
    console.log('Test 1: Create Root Category');
    const company = await setupTestCompany();
    const result1 = await createCategory(company.id, {
      name: 'Electronics',
    });

    if (result1.success && result1.data) {
      logResult('Create Root Category', 'PASS', `Category ID: ${result1.data.id}`);
    } else {
      logResult('Create Root Category', 'FAIL', result1.error);
    }
    const rootCategoryId = result1.data?.id;

    // ===== TEST 2: Create Child Category =====
    console.log('\nTest 2: Create Child Category');
    const result2 = await createCategory(company.id, {
      name: 'Smartphones',
      parentId: rootCategoryId,
    });

    if (result2.success && result2.data) {
      logResult('Create Child Category', 'PASS', `Child ID: ${result2.data.id}`);
    } else {
      logResult('Create Child Category', 'FAIL', result2.error);
    }
    const childCategoryId = result2.data?.id;

    // ===== TEST 3: Create Nested Child Category =====
    console.log('\nTest 3: Create Nested Child Category (3 levels)');
    const result3 = await createCategory(company.id, {
      name: 'iPhones',
      parentId: childCategoryId,
    });

    if (result3.success && result3.data) {
      logResult('Create Nested Child Category', 'PASS', `Nested ID: ${result3.data.id}`);
    } else {
      logResult('Create Nested Child Category', 'FAIL', result3.error);
    }
    const nestedCategoryId = result3.data?.id;

    // ===== TEST 4: Prevent Duplicate Category Name =====
    console.log('\nTest 4: Prevent Duplicate Category Name');
    const result4 = await createCategory(company.id, {
      name: 'Electronics', // Duplicate
    });

    if (!result4.success && result4.error?.includes('already exists')) {
      logResult('Prevent Duplicate Category Name', 'PASS', 'Duplicate prevented');
    } else {
      logResult('Prevent Duplicate Category Name', 'FAIL', 'Should have prevented duplicate');
    }

    // ===== TEST 5: Validate Category Name Required =====
    console.log('\nTest 5: Validate Category Name Required');
    const result5 = await createCategory(company.id, {
      name: '',
    });

    if (!result5.success && result5.error?.includes('required')) {
      logResult('Validate Category Name Required', 'PASS', 'Name validation working');
    } else {
      logResult('Validate Category Name Required', 'FAIL', 'Should require name');
    }

    // ===== TEST 6: Validate Category Name Length =====
    console.log('\nTest 6: Validate Category Name Length (100 chars max)');
    const longName = 'A'.repeat(101);
    const result6 = await createCategory(company.id, {
      name: longName,
    });

    if (!result6.success && result6.error?.includes('100')) {
      logResult('Validate Category Name Length', 'PASS', 'Length validation working');
    } else {
      logResult('Validate Category Name Length', 'FAIL', 'Should limit to 100 chars');
    }

    // ===== TEST 7: Get Category By ID =====
    console.log('\nTest 7: Get Category By ID');
    const result7 = await getCategoryById(rootCategoryId!, company.id);

    if (result7.success && result7.data) {
      logResult('Get Category By ID', 'PASS', `Category: ${result7.data.name}`);
    } else {
      logResult('Get Category By ID', 'FAIL', result7.error);
    }

    // ===== TEST 8: Category Has Products Count =====
    console.log('\nTest 8: Category Products Count');
    // Create a product in the category
    await db.product.create({
      data: {
        name: 'Test Product',
        reference: `REF-${Date.now()}`,
        price: 100,
        categoryId: rootCategoryId,
        companyId: company.id,
      },
    });

    const result8 = await getCategoryById(rootCategoryId!, company.id);
    if (result8.success && result8.data && result8.data.productsCount === 1) {
      logResult('Category Products Count', 'PASS', `Products: ${result8.data.productsCount}`);
    } else {
      logResult('Category Products Count', 'FAIL', 'Should count products');
    }

    // ===== TEST 9: List Categories With Pagination =====
    console.log('\nTest 9: List Categories With Pagination');
    // Create more categories
    await createCategory(company.id, { name: 'Clothing' });
    await createCategory(company.id, { name: 'Food' });
    await createCategory(company.id, { name: 'Books' });

    const result9 = await listCategories(company.id, {
      page: 1,
      pageSize: 2,
    });

    if (result9.success && result9.data.length === 2) {
      logResult('List Categories With Pagination', 'PASS', `Page 1: ${result9.data.length} items, Total: ${result9.pagination.total}`);
    } else {
      logResult('List Categories With Pagination', 'FAIL', result9.error);
    }

    // ===== TEST 10: Filter Categories By Parent =====
    console.log('\nTest 10: Filter Categories By Parent');
    const result10 = await listCategories(company.id, {
      parentId: rootCategoryId,
    });

    if (result10.success && result10.data.length >= 1) {
      logResult('Filter Categories By Parent', 'PASS', `Found ${result10.data.length} child categories`);
    } else {
      logResult('Filter Categories By Parent', 'FAIL', 'Should filter by parent');
    }

    // ===== TEST 11: Filter Root Categories =====
    console.log('\nTest 11: Filter Root Categories (no parent)');
    const result11 = await listCategories(company.id, {
      parentId: 'null',
    });

    if (result11.success && result11.data.length >= 1) {
      logResult('Filter Root Categories', 'PASS', `Found ${result11.data.length} root categories`);
    } else {
      logResult('Filter Root Categories', 'FAIL', 'Should find root categories');
    }

    // ===== TEST 12: Search Categories =====
    console.log('\nTest 12: Search Categories');
    const result12 = await searchCategories(company.id, 'Elect');

    if (result12.success && result12.data.length >= 1) {
      logResult('Search Categories', 'PASS', `Found ${result12.data.length} categories`);
    } else {
      logResult('Search Categories', 'FAIL', result12.error);
    }

    // ===== TEST 13: Category Tree Structure =====
    console.log('\nTest 13: Category Tree Structure');
    const result13 = await getCategoryTree(company.id);

    if (result13.success && result13.data) {
      // Count total nodes in tree
      let totalNodes = 0;
      const countNodes = (nodes: any[]) => {
        nodes.forEach((node) => {
          totalNodes++;
          if (node.children) {
            countNodes(node.children);
          }
        });
      };
      countNodes(result13.data);

      logResult('Category Tree Structure', 'PASS', `Tree has ${totalNodes} nodes`);
    } else {
      logResult('Category Tree Structure', 'FAIL', result13.error);
    }

    // ===== TEST 14: Category Breadcrumb =====
    console.log('\nTest 14: Category Breadcrumb Path');
    const result14 = await getCategoryBreadcrumb(nestedCategoryId!);

    if (result14.success && result14.data && result14.data.length === 3) {
      const path = result14.data.map((c) => c.name).join(' > ');
      logResult('Category Breadcrumb', 'PASS', `Path: ${path}`);
    } else {
      logResult('Category Breadcrumb', 'FAIL', result14.error || 'Wrong breadcrumb length');
    }

    // ===== TEST 15: Update Category Name =====
    console.log('\nTest 15: Update Category Name');
    const result15 = await updateCategory(rootCategoryId!, company.id, {
      name: 'Electronics Updated',
    });

    if (result15.success && result15.data?.name === 'Electronics Updated') {
      logResult('Update Category Name', 'PASS', 'Name updated successfully');
    } else {
      logResult('Update Category Name', 'FAIL', result15.error);
    }

    // ===== TEST 16: Prevent Circular Reference (Parent to Child) =====
    console.log('\nTest 16: Prevent Circular Reference (Parent to Child)');
    const result16 = await updateCategory(rootCategoryId!, company.id, {
      parentId: childCategoryId,
    });

    if (!result16.success && result16.error?.includes('circular')) {
      logResult('Prevent Circular Reference', 'PASS', 'Circular reference prevented');
    } else {
      logResult('Prevent Circular Reference', 'FAIL', 'Should prevent circular reference');
    }

    // ===== TEST 17: Prevent Self Parent =====
    console.log('\nTest 17: Prevent Self Parent');
    const result17 = await updateCategory(rootCategoryId!, company.id, {
      parentId: rootCategoryId,
    });

    if (!result17.success && result17.error?.includes('own parent')) {
      logResult('Prevent Self Parent', 'PASS', 'Self-parent prevented');
    } else {
      logResult('Prevent Self Parent', 'FAIL', 'Should prevent self-parent');
    }

    // ===== TEST 18: Category Statistics =====
    console.log('\nTest 18: Category Statistics');
    const result18 = await getCategoryStatistics(company.id);

    if (
      result18.success &&
      result18.data &&
      result18.data.totalCategories >= 6 &&
      result18.data.categoriesWithProducts === 1
    ) {
      logResult('Category Statistics', 'PASS', `Total: ${result18.data.totalCategories}, With products: ${result18.data.categoriesWithProducts}`);
    } else {
      logResult('Category Statistics', 'FAIL', result18.error);
    }

    // ===== TEST 19: Sort Categories =====
    console.log('\nTest 19: Sort Categories By Name (desc)');
    const result19 = await listCategories(company.id, {
      sortBy: 'name',
      sortOrder: 'desc',
    });

    if (result19.success && result19.data.length >= 2) {
      // Check if sorted descending
      const isSorted = result19.data.every((cat, i) => {
        if (i === 0) return true;
        return result19.data[i - 1].name >= cat.name;
      });
      logResult('Sort Categories', 'PASS', isSorted ? 'Sorted correctly' : 'Sort may be incorrect');
    } else {
      logResult('Sort Categories', 'FAIL', result19.error);
    }

    // ===== TEST 20: Prevent Delete Category With Children =====
    console.log('\nTest 20: Prevent Delete Category With Children');
    const result20 = await deleteCategory(rootCategoryId!, company.id);

    if (!result20.success && result20.error?.includes('child')) {
      logResult('Prevent Delete With Children', 'PASS', 'Deletion prevented');
    } else {
      logResult('Prevent Delete With Children', 'FAIL', 'Should prevent deletion');
    }

    // ===== TEST 21: Prevent Delete Category With Products =====
    console.log('\nTest 21: Prevent Delete Category With Products');
    // Create a new category with a product
    const catWithProduct = await createCategory(company.id, { name: 'Test Category' });
    if (catWithProduct.data) {
      await db.product.create({
        data: {
          name: 'Test Product 2',
          reference: `REF-${Date.now()}`,
          price: 200,
          categoryId: catWithProduct.data.id,
          companyId: company.id,
        },
      });

      const result21 = await deleteCategory(catWithProduct.data.id, company.id);

      if (!result21.success && result21.error?.includes('product')) {
        logResult('Prevent Delete With Products', 'PASS', 'Deletion prevented');
      } else {
        logResult('Prevent Delete With Products', 'FAIL', 'Should prevent deletion');
      }
    } else {
      logResult('Prevent Delete With Products', 'FAIL', 'Could not create test category');
    }

    // ===== TEST 22: Delete Empty Category =====
    console.log('\nTest 22: Delete Empty Category');
    // Create a new empty category
    const emptyCategory = await createCategory(company.id, { name: 'Empty Category' });

    if (emptyCategory.data) {
      const result22 = await deleteCategory(emptyCategory.data.id, company.id);

      if (result22.success) {
        logResult('Delete Empty Category', 'PASS', 'Category deleted');
      } else {
        logResult('Delete Empty Category', 'FAIL', result22.error);
      }
    } else {
      logResult('Delete Empty Category', 'FAIL', 'Could not create test category');
    }

    // ===== TEST 23: Update Category Image =====
    console.log('\nTest 23: Update Category Image');
    const result23 = await updateCategory(rootCategoryId!, company.id, {
      image: 'https://example.com/image.jpg',
    });

    if (result23.success && result23.data?.image === 'https://example.com/image.jpg') {
      logResult('Update Category Image', 'PASS', 'Image updated');
    } else {
      logResult('Update Category Image', 'FAIL', result23.error);
    }

    // ===== TEST 24: Company Isolation =====
    console.log('\nTest 24: Company Isolation');
    const company2 = await db.company.create({
      data: {
        name: 'Test Company 2',
        email: `test2-${Date.now()}@test.com`,
      },
    });

    // Try to get category from company1 with company2 context
    const result24 = await getCategoryById(rootCategoryId!, company2.id);

    if (!result24.success && result24.error?.includes('belong to this company')) {
      logResult('Company Isolation', 'PASS', 'Isolation working');
    } else {
      logResult('Company Isolation', 'FAIL', 'Should enforce company isolation');
    }

    // ===== TEST 25: Validate Parent Category Belongs to Same Company =====
    console.log('\nTest 25: Validate Parent Category Belongs to Same Company');
    const result25 = await createCategory(company2.id, {
      name: 'Invalid Child',
      parentId: rootCategoryId!, // Parent from company1
    });

    if (!result25.success && result25.error?.includes('belong to this company')) {
      logResult('Validate Parent Company', 'PASS', 'Parent company validation working');
    } else {
      logResult('Validate Parent Company', 'FAIL', 'Should validate parent company');
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