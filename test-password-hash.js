const bcrypt = require('bcryptjs')

const plainPassword = 'TestPassword123!'

async function test() {
  console.log('=== Testing Password Hashing ===\n')
  
  // Test hash
  const hashed = await bcrypt.hash(plainPassword, 12)
  console.log('✓ Hash created (length:', hashed.length, 'chars)')
  console.log('  Hash preview:', hashed.substring(0, 30) + '...\n')
  
  // Test isHashedPassword
  const isHashed = /^\$2[aby]\$/.test(hashed)
  console.log('✓ Is hashed password:', isHashed)
  const notHashed = /^\$2[aby]\$/.test(plainPassword)
  console.log('✓ Plain text is not hashed:', !notHashed, '\n')
  
  // Test verify correct password
  const isValid = await bcrypt.compare(plainPassword, hashed)
  console.log('✓ Verify correct password:', isValid)
  
  // Test verify wrong password
  const isInvalid = await bcrypt.compare('WrongPassword', hashed)
  console.log('✓ Verify wrong password:', isInvalid, '\n')
  
  if (isValid && !isInvalid) {
    console.log('✅ All tests PASSED!')
  } else {
    console.log('❌ Tests FAILED!')
    process.exit(1)
  }
}

test().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})