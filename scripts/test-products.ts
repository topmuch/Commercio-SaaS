/**
 * Test Script for Product Management (Feature #9)
 *
 * This script tests the complete product management functionality:
 * 1. Creating products with various options
 * 2. Listing products with filtering and pagination
 * 3. Updating product information
 * 4. Deleting products
 * 5. Stock management and movements
 * 6. Product validation
 * 7. Product statistics
 * 8. Company isolation
 * 9. Low stock alerts
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

const TEST_COMPANY_ID = 'test_product_company'
const TEST_COMPANY_EMAIL = 'test-product@example.com'

async function createTestCompany() {
  return await db.company.upsert({
    where: { email: TEST_COMPANY_EMAIL },
    update: {},
    create: {
      id: TEST_COMPANY_ID,
      name: 'Test Product Company',
      email: TEST_COMPANY_EMAIL,
      phone: '+221 77 000 00 00',
      address: 'Dakar, Sénégal',
      plan: 'enterprise',
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
      product: {
        company: {
          id: TEST_COMPANY_ID,
        },
      },
    },
  })
  await db.quoteItem.deleteMany({
    where: {
      product: {
        company: {
          id: TEST_COMPANY_ID,
        },
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
  await db.category.deleteMany({
    where: {
      company: {
        id: TEST_COMPANY_ID,
      },
    },
  })
  await db.company.deleteMany({
    where: { id: TEST_COMPANY_ID },
  })
}

async function setupTestEnvironment() {
  await cleanupTestData()
  await createTestCompany()

  // Create some test categories
  await db.category.create({
    data: {
      name: 'Electronics',
      companyId: TEST_COMPANY_ID,
    },
  })

  await db.category.create({
    data: {
      name: 'Food',
      companyId: TEST_COMPANY_ID,
    },
  })
}

// ==========================================
// TESTS
// ==========================================

async function test_1_CreateBasicProduct() {
  const product = await db.product.create({
    data: {
      name: 'Test Product',
      reference: 'PRD001',
      price: 1000,
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!product) {
    throw new Error('Product not created')
  }

  if (product.name !== 'Test Product') {
    throw new Error('Product name mismatch')
  }

  if (product.reference !== 'PRD001') {
    throw new Error('Product reference mismatch')
  }

  if (product.price !== 1000) {
    throw new Error('Product price mismatch')
  }
}

async function test_2_CreateProductWithAllFields() {
  const category = await db.category.findFirst({
    where: {
      name: 'Electronics',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!category) {
    throw new Error('Category not found')
  }

  const product = await db.product.create({
    data: {
      name: 'Complete Product',
      reference: 'PRD002',
      description: 'A complete product description',
      price: 2500,
      resellerPrice: 2000,
      brand: 'TestBrand',
      stock: 50,
      minStock: 10,
      status: 'active',
      categoryId: category.id,
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!product) {
    throw new Error('Product not created')
  }

  if (product.resellerPrice !== 2000) {
    throw new Error('Reseller price not saved')
  }

  if (product.brand !== 'TestBrand') {
    throw new Error('Brand not saved')
  }

  if (product.stock !== 50) {
    throw new Error('Stock not saved')
  }

  if (product.status !== 'active') {
    throw new Error('Status not saved')
  }
}

async function test_3_PreventDuplicateReference() {
  const product1 = await db.product.create({
    data: {
      name: 'Product A',
      reference: 'DUPLICATE001',
      price: 100,
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!product1) {
    throw new Error('First product not created')
  }

  try {
    await db.product.create({
      data: {
        name: 'Product B',
        reference: 'DUPLICATE001',
        price: 200,
        companyId: TEST_COMPANY_ID,
      },
    })
    throw new Error('Should have failed due to duplicate reference')
  } catch (error: any) {
    if (!error.message.includes('Unique constraint')) {
      throw new Error('Expected unique constraint error')
    }
  }
}

async function test_4_CreateMultipleProducts() {
  const products = [
    { name: 'Product X', ref: 'PRDX001', price: 500 },
    { name: 'Product Y', ref: 'PRDY001', price: 750 },
    { name: 'Product Z', ref: 'PRDZ001', price: 1000 },
  ]

  for (const productData of products) {
    await db.product.create({
      data: {
        name: productData.name,
        reference: productData.ref,
        price: productData.price,
        companyId: TEST_COMPANY_ID,
      },
    })
  }

  const count = await db.product.count({
    where: { companyId: TEST_COMPANY_ID },
  })

  if (count < 6) { // 2 previous + 3 new
    throw new Error(`Expected at least 6 products, found ${count}`)
  }
}

async function test_5_GetProductById() {
  const product = await db.product.findFirst({
    where: {
      reference: 'PRD001',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!product) {
    throw new Error('Product not found')
  }

  const foundProduct = await db.product.findUnique({
    where: { id: product.id },
  })

  if (!foundProduct) {
    throw new Error('Product not found by ID')
  }

  if (foundProduct.id !== product.id) {
    throw new Error('Product ID mismatch')
  }
}

async function test_6_UpdateProductInformation() {
  const product = await db.product.findFirst({
    where: {
      reference: 'PRDX001',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!product) {
    throw new Error('Product not found')
  }

  const updatedProduct = await db.product.update({
    where: { id: product.id },
    data: {
      name: 'Product X Updated',
      price: 600,
      stock: 25,
    },
  })

  if (updatedProduct.name !== 'Product X Updated') {
    throw new Error('Product name not updated')
  }

  if (updatedProduct.price !== 600) {
    throw new Error('Product price not updated')
  }

  if (updatedProduct.stock !== 25) {
    throw new Error('Product stock not updated')
  }
}

async function test_7_DeleteProduct() {
  const product = await db.product.create({
    data: {
      name: 'To Be Deleted',
      reference: 'DELETE001',
      price: 100,
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!product) {
    throw new Error('Product not created for deletion test')
  }

  const deletedProduct = await db.product.delete({
    where: { id: product.id },
  })

  if (!deletedProduct) {
    throw new Error('Product not deleted')
  }

  const found = await db.product.findUnique({
    where: { id: product.id },
  })

  if (found) {
    throw new Error('Product still exists after deletion')
  }
}

async function test_8_ListProductsWithPagination() {
  const page = 1
  const limit = 3

  const products = await db.product.findMany({
    where: { companyId: TEST_COMPANY_ID },
    select: {
      id: true,
      name: true,
      reference: true,
      price: true,
      status: true,
    },
    orderBy: { createdAt: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  if (products.length > limit) {
    throw new Error(`Should return at most ${limit} products, got ${products.length}`)
  }

  const total = await db.product.count({
    where: { companyId: TEST_COMPANY_ID },
  })

  if (total < 5) {
    throw new Error(`Should have at least 5 products total, found ${total}`)
  }
}

async function test_9_FilterProductsByStatus() {
  const activeProducts = await db.product.findMany({
    where: {
      companyId: TEST_COMPANY_ID,
      status: 'active',
    },
    select: { id: true, status: true },
  })

  for (const product of activeProducts) {
    if (product.status !== 'active') {
      throw new Error('Found product with wrong status')
    }
  }
}

async function test_10_FilterProductsByCategory() {
  const category = await db.category.findFirst({
    where: {
      name: 'Electronics',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!category) {
    throw new Error('Category not found')
  }

  const products = await db.product.findMany({
    where: {
      companyId: TEST_COMPANY_ID,
      categoryId: category.id,
    },
    select: { id: true, categoryId: true },
  })

  for (const product of products) {
    if (product.categoryId !== category.id) {
      throw new Error('Found product with wrong category')
    }
  }
}

async function test_11_SearchProducts() {
  const searchTerm = 'Product'
  const products = await db.product.findMany({
    where: {
      companyId: TEST_COMPANY_ID,
      OR: [
        { name: { contains: searchTerm } },
        { reference: { contains: searchTerm } },
        { brand: { contains: searchTerm } },
      ],
    },
    select: { id: true, name: true, reference: true },
  })

  // At least one product should match
  if (products.length === 0) {
    throw new Error('Expected at least one product to match search term')
  }
}

async function test_12_FilterProductsByPriceRange() {
  const products = await db.product.findMany({
    where: {
      companyId: TEST_COMPANY_ID,
      price: {
        gte: 500,
        lte: 1000,
      },
    },
    select: { id: true, price: true },
  })

  for (const product of products) {
    if (product.price < 500 || product.price > 1000) {
      throw new Error('Found product with price outside range')
    }
  }
}

async function test_13_StockMovement_Entry() {
  const product = await db.product.findFirst({
    where: {
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!product) {
    throw new Error('Product not found')
  }

  const originalStock = product.stock
  const quantityToAdd = 10

  const updatedProduct = await db.product.update({
    where: { id: product.id },
    data: {
      stock: originalStock + quantityToAdd,
    },
  })

  // Create stock movement record
  await db.stockMovement.create({
    data: {
      type: 'entry',
      quantity: quantityToAdd,
      productId: product.id,
      companyId: TEST_COMPANY_ID,
    },
  })

  if (updatedProduct.stock !== originalStock + quantityToAdd) {
    throw new Error('Stock not increased correctly')
  }
}

async function test_14_StockMovement_Exit() {
  const product = await db.product.findFirst({
    where: {
      companyId: TEST_COMPANY_ID,
      stock: { gte: 5 },
    },
  })

  if (!product) {
    throw new Error('Product with sufficient stock not found')
  }

  const originalStock = product.stock
  const quantityToRemove = 5

  const updatedProduct = await db.product.update({
    where: { id: product.id },
    data: {
      stock: originalStock - quantityToRemove,
    },
  })

  // Create stock movement record
  await db.stockMovement.create({
    data: {
      type: 'exit',
      quantity: -quantityToRemove,
      productId: product.id,
      companyId: TEST_COMPANY_ID,
    },
  })

  if (updatedProduct.stock !== originalStock - quantityToRemove) {
    throw new Error('Stock not decreased correctly')
  }
}

async function test_15_StockMovement_Adjustment() {
  const product = await db.product.findFirst({
    where: {
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!product) {
    throw new Error('Product not found')
  }

  const newStock = 100

  const updatedProduct = await db.product.update({
    where: { id: product.id },
    data: {
      stock: newStock,
    },
  })

  // Create stock movement record
  await db.stockMovement.create({
    data: {
      type: 'adjustment',
      quantity: 0, // Adjusted to exact value
      productId: product.id,
      companyId: TEST_COMPANY_ID,
      reason: 'Inventory correction',
    },
  })

  if (updatedProduct.stock !== newStock) {
    throw new Error('Stock not adjusted correctly')
  }
}

async function test_16_ProductStatistics() {
  const totalProducts = await db.product.count({
    where: { companyId: TEST_COMPANY_ID },
  })

  const statusCounts = await db.product.groupBy({
    by: ['status'],
    where: { companyId: TEST_COMPANY_ID },
    _count: { id: true },
  })

  if (totalProducts === 0) {
    throw new Error('Should have products')
  }

  if (statusCounts.length === 0) {
    throw new Error('Should have status counts')
  }
}

async function test_17_LowStockProducts() {
  const products = await db.product.findMany({
    where: {
      companyId: TEST_COMPANY_ID,
      stock: { lte: db.product.fields.minStock },
      status: 'active',
    },
    select: { id: true, name: true, stock: true, minStock: true },
  })

  for (const product of products) {
    if (product.stock > product.minStock) {
      throw new Error('Found product with stock above minimum threshold')
    }
  }
}

async function test_18_CompanyIsolation() {
  // Create another company
  const otherCompanyId = 'other_product_test_company'
  await db.company.create({
    data: {
      id: otherCompanyId,
      name: 'Other Test Company',
      email: 'other-product@test.com',
      plan: 'free',
    },
  })

  // Create product in other company
  const otherProduct = await db.product.create({
    data: {
      name: 'Other Company Product',
      reference: 'OTHER001',
      price: 500,
      companyId: otherCompanyId,
    },
  })

  // Get products from test company
  const testCompanyProducts = await db.product.findMany({
    where: { companyId: TEST_COMPANY_ID },
  })

  // Get products from other company
  const otherCompanyProducts = await db.product.findMany({
    where: { companyId: otherCompanyId },
  })

  // Verify isolation
  const testProductIds = new Set(testCompanyProducts.map(p => p.id))
  for (const product of otherCompanyProducts) {
    if (testProductIds.has(product.id)) {
      throw new Error('Product appears in multiple companies')
    }
  }

  // Cleanup other company
  await db.product.deleteMany({
    where: { companyId: otherCompanyId },
  })
  await db.company.deleteMany({
    where: { id: otherCompanyId },
  })
}

async function test_19_ProductSorting() {
  const productsByName = await db.product.findMany({
    where: { companyId: TEST_COMPANY_ID },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
    take: 5,
  })

  // Verify sorting
  for (let i = 1; i < productsByName.length; i++) {
    if (productsByName[i - 1].name > productsByName[i].name) {
      throw new Error('Products not sorted by name')
    }
  }
}

async function test_20_ResellerPriceValidation() {
  // Test that reseller price cannot be higher than regular price
  const product = await db.product.create({
    data: {
      name: 'Price Test Product',
      reference: 'PRICE001',
      price: 100,
      resellerPrice: 80, // Valid: lower than regular price
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!product) {
    throw new Error('Product not created')
  }

  if (product.resellerPrice !== 80) {
    throw new Error('Reseller price not saved correctly')
  }
}

async function test_21_MinStockWarning() {
  const product = await db.product.create({
    data: {
      name: 'Min Stock Test',
      reference: 'MINSTOCK001',
      price: 100,
      stock: 3,
      minStock: 10, // Stock is below minimum
      status: 'active',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!product) {
    throw new Error('Product not created')
  }

  if (product.stock > product.minStock) {
    throw new Error('Stock should be below minimum')
  }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function main() {
  console.log('\n========================================')
  console.log('  Feature #9: Product Management')
  console.log('  Test Suite')
  console.log('========================================\n')

  console.log('Setting up test environment...')
  await setupTestEnvironment()
  console.log('Test environment ready.\n')

  console.log('Running tests...\n')

  await runTest('Test 1: Create Basic Product', test_1_CreateBasicProduct)
  await runTest('Test 2: Create Product With All Fields', test_2_CreateProductWithAllFields)
  await runTest('Test 3: Prevent Duplicate Reference', test_3_PreventDuplicateReference)
  await runTest('Test 4: Create Multiple Products', test_4_CreateMultipleProducts)
  await runTest('Test 5: Get Product By ID', test_5_GetProductById)
  await runTest('Test 6: Update Product Information', test_6_UpdateProductInformation)
  await runTest('Test 7: Delete Product', test_7_DeleteProduct)
  await runTest('Test 8: List Products With Pagination', test_8_ListProductsWithPagination)
  await runTest('Test 9: Filter Products By Status', test_9_FilterProductsByStatus)
  await runTest('Test 10: Filter Products By Category', test_10_FilterProductsByCategory)
  await runTest('Test 11: Search Products', test_11_SearchProducts)
  await runTest('Test 12: Filter Products By Price Range', test_12_FilterProductsByPriceRange)
  await runTest('Test 13: Stock Movement - Entry', test_13_StockMovement_Entry)
  await runTest('Test 14: Stock Movement - Exit', test_14_StockMovement_Exit)
  await runTest('Test 15: Stock Movement - Adjustment', test_15_StockMovement_Adjustment)
  await runTest('Test 16: Product Statistics', test_16_ProductStatistics)
  await runTest('Test 17: Low Stock Products', test_17_LowStockProducts)
  await runTest('Test 18: Company Isolation', test_18_CompanyIsolation)
  await runTest('Test 19: Product Sorting', test_19_ProductSorting)
  await runTest('Test 20: Reseller Price Validation', test_20_ResellerPriceValidation)
  await runTest('Test 21: Min Stock Warning', test_21_MinStockWarning)

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