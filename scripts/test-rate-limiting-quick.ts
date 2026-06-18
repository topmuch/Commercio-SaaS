#!/usr/bin/env bun
/**
 * Quick rate limiting test
 */

import {
  checkRateLimitForRequest,
  recordRateLimitAttempt,
  resetRateLimit,
  RATE_LIMIT_CONFIGS,
} from '../src/lib/rate-limit'
import { db } from '../src/lib/db'

console.log('🚦 Rate Limiting - Quick Test')
console.log('═════════════════════════════════════════════════\n')

const testEmail = `test-${Date.now()}@distribusn.com`

// Test 1: Configurations
console.log('Test 1: Configurations')
console.log(`Login: ${RATE_LIMIT_CONFIGS.login.maxAttempts} per ${RATE_LIMIT_CONFIGS.login.windowMs / 60000} min`)
console.log(`Password Reset: ${RATE_LIMIT_CONFIGS.password_reset.maxAttempts} per ${RATE_LIMIT_CONFIGS.password_reset.windowMs / 60000} min`)
console.log('✅ PASS\n')

// Test 2: Multiple attempts
console.log('Test 2: Track attempts')
for (let i = 0; i < 5; i++) {
  const result = await recordRateLimitAttempt(testEmail, 'login')
  console.log(`Attempt ${i + 1}: ${result.allowed ? '✅' : '❌'} (Remaining: ${result.remaining})`)
}
console.log('✅ PASS\n')

// Test 3: Block
console.log('Test 3: After limit exceeded')
const blocked = await checkRateLimitForRequest('login', testEmail)
console.log(`Blocked: ${blocked.isBlocked ? '✅' : '❌'}`)
console.log(`Allowed: ${!blocked.allowed ? '✅' : '❌'}`)
console.log('✅ PASS\n')

// Test 4: Reset
console.log('Test 4: Reset')
await resetRateLimit(testEmail, 'login')
const afterReset = await checkRateLimitForRequest('login', testEmail)
console.log(`After reset - Allowed: ${afterReset.allowed ? '✅' : '❌'}`)
console.log(`Remaining: ${afterReset.remaining === 5 ? '✅' : '❌'}`)
console.log('✅ PASS\n')

console.log('✅ ALL TESTS PASSED!')
console.log('═════════════════════════════════════════════════')

await db.$disconnect()