/**
 * Test Script for Client Management (Feature #8)
 *
 * This script tests the complete client management functionality:
 * 1. Creating clients with various types and statuses
 * 2. Listing clients with filtering and pagination
 * 3. Updating client information
 * 4. Deleting clients
 * 5. Client validation
 * 6. Client statistics
 * 7. Company isolation
 * 8. Client assignments to commercials
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

const TEST_COMPANY_ID = 'test_client_company'
const TEST_COMPANY_EMAIL = 'test-client@example.com'

async function createTestCompany() {
  return await db.company.upsert({
    where: { email: TEST_COMPANY_EMAIL },
    update: {},
    create: {
      id: TEST_COMPANY_ID,
      name: 'Test Client Company',
      email: TEST_COMPANY_EMAIL,
      phone: '+221 77 000 00 00',
      address: 'Dakar, Sénégal',
      plan: 'enterprise',
    },
  })
}

async function createUser(
  email: string,
  password: string,
  name: string,
  role: string
) {
  const bcrypt = (await import('bcryptjs')).default
  const hashedPassword = await bcrypt.hash(password, 12)
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

  // Create users with different roles
  await createUser('commercial1@test.com', 'Password123!', 'Commercial 1', 'commercial')
  await createUser('commercial2@test.com', 'Password123!', 'Commercial 2', 'commercial')
  await createUser('admin@test.com', 'Password123!', 'Admin User', 'admin')
  await createUser('director@test.com', 'Password123!', 'Director User', 'director')
}

// ==========================================
// TESTS
// ==========================================

async function test_1_CreateBasicClient() {
  const commercial = await db.user.findFirst({
    where: {
      email: 'commercial1@test.com',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!commercial) {
    throw new Error('Commercial not found')
  }

  const client = await db.client.create({
    data: {
      companyName: 'Test Boutique',
      contactName: 'John Doe',
      phone: '+221 77 111 22 33',
      email: 'john@testboutique.com',
      city: 'Dakar',
      region: 'Dakar',
      sector: 'Retail',
      type: 'boutique',
      status: 'lead_rouge',
      commercialId: commercial.id,
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!client) {
    throw new Error('Client not created')
  }

  if (client.companyName !== 'Test Boutique') {
    throw new Error('Company name mismatch')
  }

  if (client.contactName !== 'John Doe') {
    throw new Error('Contact name mismatch')
  }
}

async function test_2_CreateClientWithAllFields() {
  const commercial = await db.user.findFirst({
    where: {
      email: 'commercial1@test.com',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!commercial) {
    throw new Error('Commercial not found')
  }

  const client = await db.client.create({
    data: {
      companyName: 'Complete Client SARL',
      contactName: 'Jane Smith',
      phone: '+221 77 222 33 44',
      whatsapp: '+221 77 222 33 44',
      email: 'jane@complete.com',
      address: '123 Main Street',
      city: 'Thiès',
      region: 'Thiès',
      latitude: 14.7936,
      longitude: -16.9286,
      sector: 'Wholesale',
      type: 'revendeur',
      status: 'client_vert',
      notes: 'Key customer with high volume',
      commercialId: commercial.id,
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!client) {
    throw new Error('Client not created')
  }

  if (client.whatsapp !== '+221 77 222 33 44') {
    throw new Error('WhatsApp not saved')
  }

  if (client.latitude !== 14.7936 || client.longitude !== -16.9286) {
    throw new Error('Coordinates not saved correctly')
  }

  if (client.status !== 'client_vert') {
    throw new Error('Status not correct')
  }
}

async function test_3_CreateMultipleClients() {
  const clients = [
    { name: 'Boutique A', contact: 'Contact A', type: 'boutique' as const },
    { name: 'Supermarket B', contact: 'Contact B', type: 'supermarche' as const },
    { name: 'Grossiste C', contact: 'Contact C', type: 'grossiste' as const },
    { name: 'Revendeur D', contact: 'Contact D', type: 'revendeur' as const },
  ]

  for (const clientData of clients) {
    await db.client.create({
      data: {
        companyName: clientData.name,
        contactName: clientData.contact,
        phone: '+221 77 333 44 55',
        city: 'Dakar',
        type: clientData.type,
        status: 'lead_rouge',
        companyId: TEST_COMPANY_ID,
      },
    })
  }

  const count = await db.client.count({
    where: { companyId: TEST_COMPANY_ID },
  })

  if (count < 6) { // 2 previous + 4 new
    throw new Error(`Expected at least 6 clients, found ${count}`)
  }
}

async function test_4_GetClientById() {
  const client = await db.client.findFirst({
    where: {
      companyName: 'Test Boutique',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  const foundClient = await db.client.findUnique({
    where: { id: client.id },
  })

  if (!foundClient) {
    throw new Error('Client not found by ID')
  }

  if (foundClient.id !== client.id) {
    throw new Error('Client ID mismatch')
  }
}

async function test_5_UpdateClientInformation() {
  const client = await db.client.findFirst({
    where: {
      companyName: 'Boutique A',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  const updatedClient = await db.client.update({
    where: { id: client.id },
    data: {
      companyName: 'Boutique A Updated',
      contactName: 'New Contact',
      status: 'client_vert',
    },
  })

  if (updatedClient.companyName !== 'Boutique A Updated') {
    throw new Error('Company name not updated')
  }

  if (updatedClient.contactName !== 'New Contact') {
    throw new Error('Contact name not updated')
  }

  if (updatedClient.status !== 'client_vert') {
    throw new Error('Status not updated')
  }
}

async function test_6_DeleteClient() {
  const client = await db.client.create({
    data: {
      companyName: 'To Be Deleted',
      contactName: 'Delete Me',
      phone: '+221 77 999 99 99',
      city: 'Dakar',
      type: 'boutique',
      status: 'lead_rouge',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!client) {
    throw new Error('Client not created for deletion test')
  }

  const deletedClient = await db.client.delete({
    where: { id: client.id },
  })

  if (!deletedClient) {
    throw new Error('Client not deleted')
  }

  const found = await db.client.findUnique({
    where: { id: client.id },
  })

  if (found) {
    throw new Error('Client still exists after deletion')
  }
}

async function test_7_ListClientsWithPagination() {
  const page = 1
  const limit = 3

  const clients = await db.client.findMany({
    where: { companyId: TEST_COMPANY_ID },
    select: {
      id: true,
      companyName: true,
      contactName: true,
      city: true,
      type: true,
      status: true,
    },
    orderBy: { createdAt: 'asc' },
    skip: (page - 1) * limit,
    take: limit,
  })

  if (clients.length > limit) {
    throw new Error(`Should return at most ${limit} clients, got ${clients.length}`)
  }

  const total = await db.client.count({
    where: { companyId: TEST_COMPANY_ID },
  })

  if (total < 5) {
    throw new Error(`Should have at least 5 clients total, found ${total}`)
  }
}

async function test_8_FilterClientsByStatus() {
  const leadClients = await db.client.findMany({
    where: {
      companyId: TEST_COMPANY_ID,
      status: 'lead_rouge',
    },
    select: { id: true, status: true },
  })

  for (const client of leadClients) {
    if (client.status !== 'lead_rouge') {
      throw new Error('Found client with wrong status')
    }
  }
}

async function test_9_FilterClientsByType() {
  const boutiques = await db.client.findMany({
    where: {
      companyId: TEST_COMPANY_ID,
      type: 'boutique',
    },
    select: { id: true, type: true },
  })

  for (const client of boutiques) {
    if (client.type !== 'boutique') {
      throw new Error('Found client with wrong type')
    }
  }
}

async function test_10_SearchClients() {
  const searchTerm = 'Boutique'
  const clients = await db.client.findMany({
    where: {
      companyId: TEST_COMPANY_ID,
      OR: [
        { companyName: { contains: searchTerm } },
        { contactName: { contains: searchTerm } },
        { phone: { contains: searchTerm } },
      ],
    },
    select: { id: true, companyName: true, contactName: true },
  })

  // At least one client should match
  if (clients.length === 0) {
    throw new Error('Expected at least one client to match search term')
  }
}

async function test_11_FilterClientsByCity() {
  const clients = await db.client.findMany({
    where: {
      companyId: TEST_COMPANY_ID,
      city: 'Dakar',
    },
    select: { id: true, city: true },
  })

  for (const client of clients) {
    if (!client.city || client.city !== 'Dakar') {
      throw new Error('Found client with wrong city')
    }
  }
}

async function test_12_AssignClientToCommercial() {
  const commercial2 = await db.user.findFirst({
    where: {
      email: 'commercial2@test.com',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!commercial2) {
    throw new Error('Commercial 2 not found')
  }

  const client = await db.client.findFirst({
    where: {
      commercialId: null,
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!client) {
    throw new Error('No unassigned client found')
  }

  const updatedClient = await db.client.update({
    where: { id: client.id },
    data: { commercialId: commercial2.id },
  })

  if (updatedClient.commercialId !== commercial2.id) {
    throw new Error('Commercial not assigned')
  }
}

async function test_13_GetClientsByCommercial() {
  const commercial1 = await db.user.findFirst({
    where: {
      email: 'commercial1@test.com',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!commercial1) {
    throw new Error('Commercial 1 not found')
  }

  const clients = await db.client.findMany({
    where: {
      companyId: TEST_COMPANY_ID,
      commercialId: commercial1.id,
    },
    select: { id: true, commercialId: true },
  })

  for (const client of clients) {
    if (client.commercialId !== commercial1.id) {
      throw new Error('Found client with wrong commercial')
    }
  }
}

async function test_14_ClientStatistics() {
  const totalClients = await db.client.count({
    where: { companyId: TEST_COMPANY_ID },
  })

  const statusCounts = await db.client.groupBy({
    by: ['status'],
    where: { companyId: TEST_COMPANY_ID },
    _count: { id: true },
  })

  const typeCounts = await db.client.groupBy({
    by: ['type'],
    where: { companyId: TEST_COMPANY_ID },
    _count: { id: true },
  })

  if (totalClients === 0) {
    throw new Error('Should have clients')
  }

  if (statusCounts.length === 0) {
    throw new Error('Should have status counts')
  }

  if (typeCounts.length === 0) {
    throw new Error('Should have type counts')
  }
}

async function test_15_CompanyIsolation() {
  // Create another company
  const otherCompanyId = 'other_client_test_company'
  await db.company.create({
    data: {
      id: otherCompanyId,
      name: 'Other Test Company',
      email: 'other-client@test.com',
      plan: 'free',
    },
  })

  // Create client in other company
  const otherClient = await db.client.create({
    data: {
      companyName: 'Other Company Client',
      contactName: 'Other Contact',
      phone: '+221 77 888 77 66',
      city: 'Dakar',
      type: 'boutique',
      status: 'lead_rouge',
      companyId: otherCompanyId,
    },
  })

  // Get clients from test company
  const testCompanyClients = await db.client.findMany({
    where: { companyId: TEST_COMPANY_ID },
  })

  // Get clients from other company
  const otherCompanyClients = await db.client.findMany({
    where: { companyId: otherCompanyId },
  })

  // Verify isolation
  const testClientIds = new Set(testCompanyClients.map(c => c.id))
  for (const client of otherCompanyClients) {
    if (testClientIds.has(client.id)) {
      throw new Error('Client appears in multiple companies')
    }
  }

  // Cleanup other company
  await db.client.deleteMany({
    where: { companyId: otherCompanyId },
  })
  await db.company.deleteMany({
    where: { id: otherCompanyId },
  })
}

async function test_16_ClientTimestamps() {
  const client = await db.client.create({
    data: {
      companyName: 'Timestamp Test',
      contactName: 'Test Contact',
      phone: '+221 77 777 77 77',
      city: 'Dakar',
      type: 'boutique',
      status: 'lead_rouge',
      companyId: TEST_COMPANY_ID,
    },
  })

  const originalUpdatedAt = client.updatedAt

  // Wait a bit to ensure timestamp difference
  await new Promise(resolve => setTimeout(resolve, 100))

  // Update client
  const updatedClient = await db.client.update({
    where: { id: client.id },
    data: { notes: 'Updated notes' },
    select: { updatedAt: true },
  })

  if (updatedClient.updatedAt <= originalUpdatedAt) {
    throw new Error('UpdatedAt timestamp should be updated')
  }
}

async function test_17_ClientWithCoordinates() {
  const client = await db.client.create({
    data: {
      companyName: 'Location Test',
      contactName: 'Location Contact',
      phone: '+221 77 666 55 44',
      city: 'Saint-Louis',
      region: 'Saint-Louis',
      latitude: 16.0211,
      longitude: -16.4910,
      type: 'boutique',
      status: 'lead_rouge',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (client.latitude !== 16.0211 || client.longitude !== -16.4910) {
    throw new Error('Coordinates not saved correctly')
  }

  // Verify coordinates are valid
  if (client.latitude < -90 || client.latitude > 90) {
    throw new Error('Latitude out of valid range')
  }

  if (client.longitude < -180 || client.longitude > 180) {
    throw new Error('Longitude out of valid range')
  }
}

async function test_18_ClientSorting() {
  const clientsByName = await db.client.findMany({
    where: { companyId: TEST_COMPANY_ID },
    select: { id: true, companyName: true },
    orderBy: { companyName: 'asc' },
    take: 5,
  })

  // Verify sorting
  for (let i = 1; i < clientsByName.length; i++) {
    if (clientsByName[i - 1].companyName > clientsByName[i].companyName) {
      throw new Error('Clients not sorted by name')
    }
  }
}

async function test_19_ClientNotesAndMetadata() {
  const notes = 'Important client with special requirements. Contact before visiting.'
  const sector = 'Technology'

  const client = await db.client.create({
    data: {
      companyName: 'Notes Test',
      contactName: 'Notes Contact',
      phone: '+221 77 555 44 33',
      city: 'Dakar',
      sector: sector,
      notes: notes,
      type: 'boutique',
      status: 'lead_rouge',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (client.notes !== notes) {
    throw new Error('Notes not saved correctly')
  }

  if (client.sector !== sector) {
    throw new Error('Sector not saved correctly')
  }
}

async function test_20_ClientStatusTransitions() {
  const client = await db.client.create({
    data: {
      companyName: 'Status Test',
      contactName: 'Status Contact',
      phone: '+221 77 444 33 22',
      city: 'Dakar',
      type: 'boutique',
      status: 'lead_rouge',
      companyId: TEST_COMPANY_ID,
    },
  })

  // Lead to Negotiation
  const inNegotiation = await db.client.update({
    where: { id: client.id },
    data: { status: 'negotiation_orange' },
  })

  if (inNegotiation.status !== 'negotiation_orange') {
    throw new Error('Status not updated to negotiation')
  }

  // Negotiation to Client
  const asClient = await db.client.update({
    where: { id: client.id },
    data: { status: 'client_vert' },
  })

  if (asClient.status !== 'client_vert') {
    throw new Error('Status not updated to client')
  }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function main() {
  console.log('\n========================================')
  console.log('  Feature #8: Client Management')
  console.log('  Test Suite')
  console.log('========================================\n')

  console.log('Setting up test environment...')
  await setupTestEnvironment()
  console.log('Test environment ready.\n')

  console.log('Running tests...\n')

  await runTest('Test 1: Create Basic Client', test_1_CreateBasicClient)
  await runTest('Test 2: Create Client With All Fields', test_2_CreateClientWithAllFields)
  await runTest('Test 3: Create Multiple Clients', test_3_CreateMultipleClients)
  await runTest('Test 4: Get Client By ID', test_4_GetClientById)
  await runTest('Test 5: Update Client Information', test_5_UpdateClientInformation)
  await runTest('Test 6: Delete Client', test_6_DeleteClient)
  await runTest('Test 7: List Clients With Pagination', test_7_ListClientsWithPagination)
  await runTest('Test 8: Filter Clients By Status', test_8_FilterClientsByStatus)
  await runTest('Test 9: Filter Clients By Type', test_9_FilterClientsByType)
  await runTest('Test 10: Search Clients', test_10_SearchClients)
  await runTest('Test 11: Filter Clients By City', test_11_FilterClientsByCity)
  await runTest('Test 12: Assign Client To Commercial', test_12_AssignClientToCommercial)
  await runTest('Test 13: Get Clients By Commercial', test_13_GetClientsByCommercial)
  await runTest('Test 14: Client Statistics', test_14_ClientStatistics)
  await runTest('Test 15: Company Isolation', test_15_CompanyIsolation)
  await runTest('Test 16: Client Timestamps', test_16_ClientTimestamps)
  await runTest('Test 17: Client With Coordinates', test_17_ClientWithCoordinates)
  await runTest('Test 18: Client Sorting', test_18_ClientSorting)
  await runTest('Test 19: Client Notes And Metadata', test_19_ClientNotesAndMetadata)
  await runTest('Test 20: Client Status Transitions', test_20_ClientStatusTransitions)

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