import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

/**
 * Migration: Hash plain text passwords
 *
 * This script finds all users with plain text passwords (not starting with $2a$, $2b$, or $2y$)
 * and hashes them using bcrypt with salt rounds of 12.
 */

const SALT_ROUNDS = 12

function isHashedPassword(password: string): boolean {
  return /^\$2[aby]\$/.test(password)
}

async function migratePasswords() {
  console.log('🔐 Starting password hashing migration...')

  try {
    // Find all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        password: true,
      },
    })

    console.log(`📊 Found ${users.length} users in database`)

    let migratedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const user of users) {
      try {
        // Check if password is already hashed
        if (isHashedPassword(user.password)) {
          console.log(`⏭️  Skipping ${user.email} (already hashed)`)
          skippedCount++
          continue
        }

        // Hash the plain text password
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS)

        // Update the user with hashed password
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        })

        console.log(`✅ Migrated ${user.email}`)
        migratedCount++
      } catch (error) {
        const errorMessage = `❌ Failed to migrate ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        console.error(errorMessage)
        errors.push(errorMessage)
      }
    }

    console.log('\n═════════════════════════════════════════════════')
    console.log('📈 Migration Summary:')
    console.log(`   - Total users: ${users.length}`)
    console.log(`   - Migrated: ${migratedCount}`)
    console.log(`   - Skipped (already hashed): ${skippedCount}`)
    console.log(`   - Errors: ${errors.length}`)

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:')
      errors.forEach((err) => console.log(`   ${err}`))
    }

    console.log('═════════════════════════════════════════════════')

    if (errors.length === 0) {
      console.log('✅ Password hashing migration completed successfully!')
    } else {
      console.log('⚠️  Password hashing migration completed with some errors.')
    }
  } catch (error) {
    console.error('❌ Fatal error during migration:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration if called directly
if (import.meta.main || process.argv[1].includes('migrate-passwords')) {
  migratePasswords()
}

export { migratePasswords }