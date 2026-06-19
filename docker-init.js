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
      log('Schema pushed.')
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
        log('WARNING: Cannot load Prisma client. Skipping init.')
        return
      }
    }

    const db = new PrismaClient()

    try {
      // 3. Check if super admin already exists
      const superAdminCount = await db.user.count({ where: { role: 'super_admin' } })

      if (superAdminCount > 0) {
        log(`Has ${superAdminCount} super admin(s). Init skipped.`)
        return
      }

      log('No super admin found. Creating one...')

      // 4. Get or create company
      let company = await db.company.findFirst()
      if (!company) {
        company = await db.company.create({
          data: {
            id: 'comp_default',
            name: DEFAULTS.companyName,
            email: DEFAULTS.companyEmail,
            phone: DEFAULTS.companyPhone,
            plan: 'enterprise',
            status: 'active',
          },
        })
      }

      log(`Company: ${company.name} (${company.id})`)

      // 5. Hash password
      let bcrypt
      try {
        bcrypt = require('./node_modules/bcryptjs')
      } catch (_) {
        try {
          bcrypt = require('bcryptjs')
        } catch (__) {
          log('WARNING: Cannot load bcryptjs. Skipping init.')
          return
        }
      }
      const hashedPassword = await bcrypt.hash(DEFAULTS.defaultPassword, 12)

      // 6. Create super admin
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
      log(`  Super admin created!`)
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
    process.exitCode = 0
  }
}

main().catch(() => { process.exitCode = 0 })
