import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const DEFAULTS = {
  superAdminEmail: process.env.INIT_SUPERADMIN_EMAIL || 'admin@terangabiz.com',
  superAdminName: process.env.INIT_SUPERADMIN_NAME || 'Super Administrateur',
  superAdminPhone: process.env.INIT_SUPERADMIN_PHONE || '+221 77 000 00 00',
  companyName: process.env.INIT_COMPANY_NAME || 'Teranga Biz',
  companyEmail: process.env.INIT_COMPANY_EMAIL || 'contact@terangabiz.com',
  companyPhone: process.env.INIT_COMPANY_PHONE || '+221 33 800 00 01',
  defaultPassword: process.env.INIT_DEFAULT_PASSWORD || 'Admin@123456',
}

export async function POST() {
  try {
    // Check if super admin already exists
    const superAdminCount = await db.user.count({ where: { role: 'super_admin' } })

    if (superAdminCount > 0) {
      return NextResponse.json({
        success: false,
        message: `Already has ${superAdminCount} super admin(s). Cannot create more via init.`,
        alreadyInitialized: true,
        superAdminCount,
      })
    }

    // Get or create company
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

    // Hash password
    const hashedPassword = await hashPassword(DEFAULTS.defaultPassword)

    // Create super admin
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
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    console.log(`[init] Super admin created: ${superAdmin.email}`)

    return NextResponse.json({
      success: true,
      message: 'Super admin created successfully.',
      superAdmin: {
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
      },
      credentials: {
        email: DEFAULTS.superAdminEmail,
        password: DEFAULTS.defaultPassword,
      },
      warning: 'CHANGE THIS PASSWORD IMMEDIATELY after first login!',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[init] Error:', message)
    return NextResponse.json(
      { success: false, message: `Initialization failed: ${message}` },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const userCount = await db.user.count()
    const companyCount = await db.company.count()
    const superAdminCount = await db.user.count({ where: { role: 'super_admin' } })

    return NextResponse.json({
      initialized: superAdminCount > 0,
      stats: {
        users: userCount,
        companies: companyCount,
        superAdmins: superAdminCount,
      },
      defaults: {
        email: DEFAULTS.superAdminEmail,
        companyName: DEFAULTS.companyName,
      },
    })
  } catch {
    return NextResponse.json(
      { initialized: false, error: 'Cannot connect to database' },
      { status: 500 }
    )
  }
}
