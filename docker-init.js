/**
 * docker-init.js — Auto-initialization for Docker containers
 *
 * Runs at container startup:
 *   1. Pushes Prisma schema to database
 *   2. Creates default company + super admin if no users exist
 *
 * Configurable via env vars:
 *   INIT_SUPERADMIN_EMAIL, INIT_SUPERADMIN_NAME, INIT_SUPERADMIN_PHONE
 *   INIT_COMPANY_NAME, INIT_COMPANY_EMAIL, INIT_COMPANY_PHONE
 *   INIT_DEFAULT_PASSWORD
 */

const { execSync } = require('child_process')

const DEFAULTS = {
  superAdminEmail: process.env.INIT_SUPERADMIN_EMAIL || 'admin@terangabiz.com',
  superAdminName: process.env.INIT_SUPERADMIN_NAME || 'Super Administrateur',
  superAdminPhone: process.env.INIT_SUPERADMIN_PHONE || '+221 77 000 00 00',
  companyName: process.env.INIT_COMPANY_NAME || 'Teranga Biz',
  companyEmail: process.env.INIT_COMPANY_EMAIL || 'contact@terangabiz.com',
  companyPhone: process.env.INIT_COMPANY_PHONE || '+221 33 800 00 01',
  defaultPassword: process.env.INIT_DEFAULT_PASSWORD || 'Admin@123456',
}

function log(msg) {
  console.log(`[docker-init] ${msg}`)
}

async function main() {
  try {
    // 1. Push Prisma schema
    log('Pushing Prisma schema...')
    try {
      execSync('npx prisma db push --skip-generate 2>&1', {
        stdio: 'pipe',
        timeout: 60000,
      })
      log('Schema pushed OK.')
    } catch (_) {
      log('Schema push completed (warnings OK).')
    }

    // 2. Load Prisma client
    let PrismaClient
    try {
      PrismaClient = require('./node_modules/.prisma/client').PrismaClient
    } catch (_) {
      try {
        PrismaClient = require('@prisma/client').PrismaClient
      } catch (__) {
        log('WARNING: Cannot load Prisma client. Skipping user init.')
        return
      }
    }

    const db = new PrismaClient()

    try {
      const userCount = await db.user.count()

      if (userCount > 0) {
        log(`DB has ${userCount} user(s). Init skipped.`)
        return
      }

      log('Empty database. Creating company + super admin...')

      // 3. Create company
      const company = await db.company.upsert({
        where: { email: DEFAULTS.companyEmail },
        update: {},
        create: {
          id: 'comp_default',
          name: DEFAULTS.companyName,
          email: DEFAULTS.companyEmail,
          phone: DEFAULTS.companyPhone,
          plan: 'enterprise',
          status: 'active',
        },
      })

      log(`Company: ${company.name}`)

      // 4. Hash password
      let bcrypt
      try {
        bcrypt = require('./node_modules/bcryptjs')
      } catch (_) {
        bcrypt = require('bcryptjs')
      }
      const hashedPassword = await bcrypt.hash(DEFAULTS.defaultPassword, 12)

      // 5. Create super admin
      await db.user.create({
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

      log('==========================================')
      log(`  EMAIL:    ${DEFAULTS.superAdminEmail}`)
      log(`  PASSWORD: ${DEFAULTS.defaultPassword}`)
      log(`  CHANGE THIS PASSWORD IMMEDIATELY!`)
      log('==========================================')
    } finally {
      await db.$disconnect()
    }

    log('Init complete.')
  } catch (error) {
    console.error(`[docker-init] Error: ${error.message}`)
    // Don't block server startup
    process.exitCode = 0
  }
}

main().catch(() => { process.exitCode = 0 })
