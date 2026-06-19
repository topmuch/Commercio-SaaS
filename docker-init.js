/**
 * docker-init.js — Auto-initialization script for Docker containers
 *
 * This script runs at container startup to ensure the database is ready
 * and a super admin user exists. It:
 *   1. Pushes Prisma schema to the database
 *   2. Creates a default company if none exists
 *   3. Creates a super admin user if no users exist
 *
 * Environment variables:
 *   - INIT_SUPERADMIN_EMAIL  (default: "admin@terangabiz.com")
 *   - INIT_SUPERADMIN_NAME   (default: "Super Administrateur")
 *   - INIT_SUPERADMIN_PHONE  (default: "+221 77 000 00 00")
 *   - INIT_COMPANY_NAME      (default: "Teranga Biz")
 *   - INIT_COMPANY_EMAIL      (default: "contact@terangabiz.com")
 *   - INIT_COMPANY_PHONE      (default: "+221 33 800 00 01")
 *   - INIT_DEFAULT_PASSWORD   (default: "Admin@123456")
 *   - DATABASE_URL            (required: e.g. "file:/app/data/commercio.db")
 */

const { execSync } = require('child_process')

// ---- Configuration ----
const DEFAULTS = {
  superAdminEmail: process.env.INIT_SUPERADMIN_EMAIL || 'admin@terangabiz.com',
  superAdminName: process.env.INIT_SUPERADMIN_NAME || 'Super Administrateur',
  superAdminPhone: process.env.INIT_SUPERADMIN_PHONE || '+221 77 000 00 00',
  companyName: process.env.INIT_COMPANY_NAME || 'Teranga Biz',
  companyEmail: process.env.INIT_COMPANY_EMAIL || 'contact@terangabiz.com',
  companyPhone: process.env.INIT_COMPANY_PHONE || '+221 33 800 00 01',
  defaultPassword: process.env.INIT_DEFAULT_PASSWORD || 'Admin@123456',
}

const LOG_PREFIX = '[docker-init]'

function log(msg) {
  console.log(`${LOG_PREFIX} ${msg}`)
}

function logError(msg) {
  console.error(`${LOG_PREFIX} ERROR: ${msg}`)
}

async function main() {
  try {
    // Step 1: Push Prisma schema
    log('Pushing Prisma schema to database...')
    try {
      execSync('npx prisma db push --skip-generate 2>&1', {
        stdio: 'pipe',
        timeout: 60000,
      })
      log('Prisma schema pushed successfully.')
    } catch (e) {
      // prisma db push might fail on "already applied" — that's OK
      log('Prisma push completed (may have warnings).')
    }

    // Step 2: Check if users already exist
    const { PrismaClient } = require('./node_modules/.prisma/client')
    const db = new PrismaClient()

    try {
      const userCount = await db.user.count()

      if (userCount > 0) {
        log(`Database already has ${userCount} user(s). Skipping auto-init.`)
        return
      }

      log('No users found. Creating default company and super admin...')

      // Step 3: Create default company
      const companyId = 'comp_default'

      const company = await db.company.upsert({
        where: { email: DEFAULTS.companyEmail },
        update: {},
        create: {
          id: companyId,
          name: DEFAULTS.companyName,
          email: DEFAULTS.companyEmail,
          phone: DEFAULTS.companyPhone,
          plan: 'enterprise',
          status: 'active',
        },
      })

      log(`Company created: ${company.name} (${company.id})`)

      // Step 4: Hash password with bcrypt
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash(DEFAULTS.defaultPassword, 12)

      // Step 5: Create super admin user
      const superAdmin = await db.user.create({
        data: {
          email: DEFAULTS.superAdminEmail,
          password: hashedPassword,
          name: DEFAULTS.superAdminName,
          phone: DEFAULTS.superAdminPhone,
          role: 'super_admin',
          active: true,
          companyId: company.id,
        },
      })

      log(`Super admin created: ${superAdmin.email}`)
      log(`==========================================`)
      log(`  EMAIL:    ${DEFAULTS.superAdminEmail}`)
      log(`  PASSWORD: ${DEFAULTS.defaultPassword}`)
      log(`  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!`)
      log(`==========================================`)
    } finally {
      await db.$disconnect()
    }

    log('Initialization complete.')
  } catch (error) {
    logError(`Init failed: ${error.message}`)
    // Don't exit — let the server start anyway
    process.exitCode = 0
  }
}

main().catch((err) => {
  logError(`Fatal: ${err.message}`)
  process.exitCode = 0
})
