import { hashPassword, verifyPassword, isHashedPassword } from './src/lib/auth'

const plainPassword = 'TestPassword123!'

async function test() {
  console.log('Testing password hashing...')
  
  // Test hash
  const hashed = await hashPassword(plainPassword)
  console.log('✓ Hash created:', hashed.substring(0, 20) + '...')
  
  // Test isHashedPassword
  console.log('✓ Is hashed:', isHashedPassword(hashed))
  console.log('✓ Is not hashed:', isHashedPassword(plainPassword))
  
  // Test verify
  const isValid = await verifyPassword(plainPassword, hashed)
  console.log('✓ Verify:', isValid)
  
  // Test wrong password
  const isInvalid = await verifyPassword('WrongPassword', hashed)
  console.log('✓ Verify wrong password:', isInvalid)
  
  console.log('\n✓ All tests passed!')
}

test().catch(console.error)