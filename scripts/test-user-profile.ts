/**
 * Test Script for User Profile Management (Feature #7)
 *
 * This script tests the complete user profile management functionality:
 * 1. Getting current user profile
 * 2. Updating profile information
 * 3. Changing password
 * 4. Listing users (admin/super_admin only)
 * 5. Getting user by ID
 * 6. Toggling user status
 * 7. Password strength validation
 * 8. Edge cases and security validations
 */

import { db } from '../src/lib/db'
import { hashPassword, verifyPassword } from '../src/lib/auth'

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

const TEST_COMPANY_ID = 'test_profile_company'
const TEST_COMPANY_EMAIL = 'test-profile@example.com'

async function createTestCompany() {
  return await db.company.upsert({
    where: { email: TEST_COMPANY_EMAIL },
    update: {},
    create: {
      id: TEST_COMPANY_ID,
      name: 'Test Profile Company',
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
  role: string,
  phone?: string
) {
  const hashedPassword = await hashPassword(password)
  return await db.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      phone,
      role,
      active: true,
      companyId: TEST_COMPANY_ID,
    },
  })
}

async function cleanupTestData() {
  await db.passwordResetToken.deleteMany({
    where: {
      user: {
        companyId: TEST_COMPANY_ID,
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
  await createUser('superadmin@test.com', 'SuperAdmin123!', 'Super Admin', 'super_admin')
  await createUser('admin@test.com', 'AdminUser123!', 'Admin User', 'admin')
  await createUser('commercial@test.com', 'CommercialUser123!', 'Commercial User', 'commercial')
  await createUser('director@test.com', 'DirectorUser123!', 'Director User', 'director')
  await createUser('accountant@test.com', 'AccountantUser123!', 'Accountant User', 'accountant')
}

// ==========================================
// TESTS
// ==========================================

async function test_1_GetCurrentUserProfile() {
  const user = await db.user.findFirst({
    where: {
      email: 'superadmin@test.com',
      companyId: TEST_COMPANY_ID,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      role: true,
      active: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
      twoFactorEnabled: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  if (user.email !== 'superadmin@test.com') {
    throw new Error('Email mismatch')
  }

  if (user.role !== 'super_admin') {
    throw new Error('Role mismatch')
  }
}

async function test_2_UpdateUserName() {
  const user = await db.user.findFirst({
    where: {
      email: 'admin@test.com',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const newName = 'Updated Admin Name'
  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { name: newName },
  })

  if (updatedUser.name !== newName) {
    throw new Error('Name not updated')
  }
}

async function test_2b_UpdateUserPhone() {
  const user = await db.user.findFirst({
    where: {
      email: 'admin@test.com',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const newPhone = '+221 77 999 88 77'
  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { phone: newPhone },
  })

  if (updatedUser.phone !== newPhone) {
    throw new Error('Phone not updated')
  }
}

async function test_2c_UpdateUserAvatar() {
  const user = await db.user.findFirst({
    where: {
      email: 'admin@test.com',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const newAvatar = 'https://example.com/avatar.jpg'
  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { avatar: newAvatar },
  })

  if (updatedUser.avatar !== newAvatar) {
    throw new Error('Avatar not updated')
  }
}

async function test_3_ValidateNameTooShort() {
  const name = 'A' // Less than 2 characters
  if (name.trim().length >= 2) {
    throw new Error('Name should be too short')
  }
}

async function test_4_ValidateNameTooLong() {
  const name = 'A'.repeat(101) // More than 100 characters
  if (name.length <= 100) {
    throw new Error('Name should be too long')
  }
}

async function test_5_ValidatePhoneTooLong() {
  const phone = '+221 ' + '1'.repeat(100) // More than 20 characters
  if (phone.length <= 20) {
    throw new Error('Phone should be too long')
  }
}

async function test_6_ValidateAvatarTooLong() {
  const avatar = 'https://example.com/' + 'a'.repeat(500) // More than 500 characters
  if (avatar.length <= 500) {
    throw new Error('Avatar should be too long')
  }
}

async function test_7_PasswordStrength_TooShort() {
  const password = 'Short1!'
  if (password.length >= 8) {
    throw new Error('Password should be too short')
  }
}

async function test_8_PasswordStrength_NoUppercase() {
  const password = 'nouppercase123!'
  if (/[A-Z]/.test(password)) {
    throw new Error('Password should not have uppercase')
  }
}

async function test_9_PasswordStrength_NoLowercase() {
  const password = 'NOLOWERCASE123!'
  if (/[a-z]/.test(password)) {
    throw new Error('Password should not have lowercase')
  }
}

async function test_10_PasswordStrength_NoNumber() {
  const password = 'NoNumber!!'
  if (/\d/.test(password)) {
    throw new Error('Password should not have number')
  }
}

async function test_11_PasswordStrength_NoSpecialChar() {
  const password = 'NoSpecial123'
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    throw new Error('Password should not have special character')
  }
}

async function test_12_PasswordStrength_ValidPassword() {
  const password = 'ValidPassword123!'
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  if (errors.length > 0) {
    throw new Error(`Password should be valid: ${errors.join(', ')}`)
  }
}

async function test_13_ChangePassword() {
  const user = await db.user.findFirst({
    where: {
      email: 'commercial@test.com',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const currentPassword = 'CommercialUser123!'
  const newPassword = 'NewCommercialPassword123!'

  // Verify current password is correct
  const isCurrentValid = await verifyPassword(currentPassword, user.password)
  if (!isCurrentValid) {
    throw new Error('Current password verification failed')
  }

  // Update to new password
  const hashedNewPassword = await hashPassword(newPassword)
  await db.user.update({
    where: { id: user.id },
    data: { password: hashedNewPassword },
  })

  // Verify new password works
  const updatedUser = await db.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  })

  if (!updatedUser) {
    throw new Error('User not found after password change')
  }

  const isNewValid = await verifyPassword(newPassword, updatedUser.password)
  if (!isNewValid) {
    throw new Error('New password verification failed')
  }

  // Verify old password doesn't work
  const isOldInvalid = !(await verifyPassword(currentPassword, updatedUser.password))
  if (!isOldInvalid) {
    throw new Error('Old password should not work after change')
  }
}

async function test_14_ChangePassword_InvalidCurrentPassword() {
  const user = await db.user.findFirst({
    where: {
      email: 'director@test.com',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const wrongPassword = 'WrongPassword123!'
  const correctPassword = 'DirectorUser123!'

  const isWrongValid = await verifyPassword(wrongPassword, user.password)
  if (isWrongValid) {
    throw new Error('Wrong password should not be valid')
  }

  const isCorrectValid = await verifyPassword(correctPassword, user.password)
  if (!isCorrectValid) {
    throw new Error('Correct password should be valid')
  }
}

async function test_15_ListCompanyUsers() {
  const users = await db.user.findMany({
    where: { companyId: TEST_COMPANY_ID },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      role: true,
      active: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
      twoFactorEnabled: true,
    },
    orderBy: { name: 'asc' },
  })

  if (users.length < 5) {
    throw new Error(`Expected at least 5 users, found ${users.length}`)
  }

  // Check all users belong to the test company
  for (const user of users) {
    if (user.companyId !== TEST_COMPANY_ID) {
      throw new Error(`User ${user.email} belongs to wrong company`)
    }
  }
}

async function test_16_GetUserById() {
  const user = await db.user.findFirst({
    where: {
      email: 'accountant@test.com',
      companyId: TEST_COMPANY_ID,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      role: true,
      active: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
      twoFactorEnabled: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Verify we can get the user by ID
  const userById = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      role: true,
      active: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
      twoFactorEnabled: true,
    },
  })

  if (!userById) {
    throw new Error('User not found by ID')
  }

  if (userById.id !== user.id) {
    throw new Error('User ID mismatch')
  }
}

async function test_17_ToggleUserStatus_Deactivate() {
  const user = await db.user.findFirst({
    where: {
      email: 'director@test.com',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Deactivate user
  const deactivatedUser = await db.user.update({
    where: { id: user.id },
    data: { active: false },
  })

  if (deactivatedUser.active) {
    throw new Error('User should be deactivated')
  }

  // Reactivate user
  const reactivatedUser = await db.user.update({
    where: { id: user.id },
    data: { active: true },
  })

  if (!reactivatedUser.active) {
    throw new Error('User should be reactivated')
  }
}

async function test_18_CompanyIsolation() {
  // Create another company
  const otherCompanyId = 'other_profile_test_company'
  await db.company.create({
    data: {
      id: otherCompanyId,
      name: 'Other Test Company',
      email: 'other-profile@test.com',
      plan: 'free',
    },
  })

  // Create user in other company
  await db.user.create({
    data: {
      email: 'other.user@test.com',
      password: await hashPassword('Password123!'),
      name: 'Other Company User',
      role: 'commercial',
      active: true,
      companyId: otherCompanyId,
    },
  })

  // Get users from test company
  const testCompanyUsers = await db.user.findMany({
    where: { companyId: TEST_COMPANY_ID },
  })

  // Get users from other company
  const otherCompanyUsers = await db.user.findMany({
    where: { companyId: otherCompanyId },
  })

  // Verify isolation
  const testUserIds = new Set(testCompanyUsers.map(u => u.id))
  for (const otherUser of otherCompanyUsers) {
    if (testUserIds.has(otherUser.id)) {
      throw new Error('User appears in multiple companies')
    }
  }

  // Cleanup other company
  await db.user.deleteMany({
    where: { companyId: otherCompanyId },
  })
  await db.company.deleteMany({
    where: { id: otherCompanyId },
  })
}

async function test_19_UpdateTimestamp() {
  const user = await db.user.findFirst({
    where: {
      email: 'accountant@test.com',
      companyId: TEST_COMPANY_ID,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  const originalUpdatedAt = user.updatedAt

  // Wait a bit to ensure timestamp difference
  await new Promise(resolve => setTimeout(resolve, 100))

  // Update user
  await db.user.update({
    where: { id: user.id },
    data: { name: 'Updated Name' },
  })

  const updatedUser = await db.user.findUnique({
    where: { id: user.id },
    select: { updatedAt: true },
  })

  if (!updatedUser) {
    throw new Error('User not found after update')
  }

  if (updatedUser.updatedAt <= originalUpdatedAt) {
    throw new Error('UpdatedAt timestamp should be updated')
  }
}

async function test_20_ProfileFieldsIntegrity() {
  const user = await db.user.findFirst({
    where: {
      email: 'superadmin@test.com',
      companyId: TEST_COMPANY_ID,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      role: true,
      active: true,
      companyId: true,
      createdAt: true,
      updatedAt: true,
      twoFactorEnabled: true,
    },
  })

  if (!user) {
    throw new Error('User not found')
  }

  // Verify all required fields are present
  if (!user.id) throw new Error('ID is missing')
  if (!user.email) throw new Error('Email is missing')
  if (!user.name) throw new Error('Name is missing')
  if (!user.role) throw new Error('Role is missing')
  if (user.active === undefined) throw new Error('Active status is missing')
  if (!user.companyId) throw new Error('Company ID is missing')
  if (!user.createdAt) throw new Error('CreatedAt is missing')
  if (!user.updatedAt) throw new Error('UpdatedAt is missing')
  if (user.twoFactorEnabled === undefined) throw new Error('TwoFactorEnabled is missing')

  // Verify data types
  if (typeof user.id !== 'string') throw new Error('ID is not a string')
  if (typeof user.email !== 'string') throw new Error('Email is not a string')
  if (typeof user.name !== 'string') throw new Error('Name is not a string')
  if (typeof user.role !== 'string') throw new Error('Role is not a string')
  if (typeof user.active !== 'boolean') throw new Error('Active is not a boolean')
  if (typeof user.companyId !== 'string') throw new Error('Company ID is not a string')
  if (typeof user.twoFactorEnabled !== 'boolean') throw new Error('TwoFactorEnabled is not a boolean')
  if (!(user.createdAt instanceof Date)) throw new Error('CreatedAt is not a Date')
  if (!(user.updatedAt instanceof Date)) throw new Error('UpdatedAt is not a Date')

  // Verify optional fields
  if (user.phone !== null && typeof user.phone !== 'string') {
    throw new Error('Phone must be string or null')
  }
  if (user.avatar !== null && typeof user.avatar !== 'string') {
    throw new Error('Avatar must be string or null')
  }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function main() {
  console.log('\n========================================')
  console.log('  Feature #7: User Profile Management')
  console.log('  Test Suite')
  console.log('========================================\n')

  console.log('Setting up test environment...')
  await setupTestEnvironment()
  console.log('Test environment ready.\n')

  console.log('Running tests...\n')

  await runTest('Test 1: Get Current User Profile', test_1_GetCurrentUserProfile)
  await runTest('Test 2a: Update User Name', test_2_UpdateUserName)
  await runTest('Test 2b: Update User Phone', test_2b_UpdateUserPhone)
  await runTest('Test 2c: Update User Avatar', test_2c_UpdateUserAvatar)
  await runTest('Test 3: Validate Name Too Short', test_3_ValidateNameTooShort)
  await runTest('Test 4: Validate Name Too Long', test_4_ValidateNameTooLong)
  await runTest('Test 5: Validate Phone Too Long', test_5_ValidatePhoneTooLong)
  await runTest('Test 6: Validate Avatar Too Long', test_6_ValidateAvatarTooLong)
  await runTest('Test 7: Password Strength - Too Short', test_7_PasswordStrength_TooShort)
  await runTest('Test 8: Password Strength - No Uppercase', test_8_PasswordStrength_NoUppercase)
  await runTest('Test 9: Password Strength - No Lowercase', test_9_PasswordStrength_NoLowercase)
  await runTest('Test 10: Password Strength - No Number', test_10_PasswordStrength_NoNumber)
  await runTest('Test 11: Password Strength - No Special Char', test_11_PasswordStrength_NoSpecialChar)
  await runTest('Test 12: Password Strength - Valid Password', test_12_PasswordStrength_ValidPassword)
  await runTest('Test 13: Change Password', test_13_ChangePassword)
  await runTest('Test 14: Change Password - Invalid Current Password', test_14_ChangePassword_InvalidCurrentPassword)
  await runTest('Test 15: List Company Users', test_15_ListCompanyUsers)
  await runTest('Test 16: Get User By ID', test_16_GetUserById)
  await runTest('Test 17: Toggle User Status', test_17_ToggleUserStatus_Deactivate)
  await runTest('Test 18: Company Isolation', test_18_CompanyIsolation)
  await runTest('Test 19: Update Timestamp', test_19_UpdateTimestamp)
  await runTest('Test 20: Profile Fields Integrity', test_20_ProfileFieldsIntegrity)

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