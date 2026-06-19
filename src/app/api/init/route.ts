import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { NextResponse } from 'next/server'

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
    // 1. Check if super admin already exists
    const superAdminCount = await db.user.count({ where: { role: 'super_admin' } })

    if (superAdminCount > 0) {
      const sa = await db.user.findFirst({ where: { role: 'super_admin' }, select: { email: true, name: true } })
      return NextResponse.json({
        success: false,
        message: `Super admin already exists: ${sa?.email}`,
        alreadyInitialized: true,
      })
    }

    // 2. Find any existing admin user to promote
    const existingAdmin = await db.user.findFirst({
      where: { role: { in: ['admin', 'director', 'commercial'] } },
      select: { id: true, email: true, name: true, companyId: true, phone: true },
    })

    if (existingAdmin) {
      // Promote existing user to super_admin
      await db.user.update({
        where: { id: existingAdmin.id },
        data: { role: 'super_admin' },
      })

      console.log(`[init] Promoted ${existingAdmin.email} to super_admin`)

      return NextResponse.json({
        success: true,
        message: `User ${existingAdmin.email} promoted to super admin.`,
        superAdmin: {
          email: existingAdmin.email,
          name: existingAdmin.name,
          role: 'super_admin',
        },
        info: `Login with email: ${existingAdmin.email} and your existing password.`,
      })
    }

    // 3. No users at all — create company + super admin from scratch
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

    const hashedPassword = await hashPassword(DEFAULTS.defaultPassword)

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
      select: { id: true, email: true, name: true, role: true },
    })

    console.log(`[init] Super admin created: ${superAdmin.email}`)

    return NextResponse.json({
      success: true,
      message: 'Super admin created.',
      superAdmin,
      credentials: {
        email: DEFAULTS.superAdminEmail,
        password: DEFAULTS.defaultPassword,
      },
      warning: 'CHANGE THIS PASSWORD IMMEDIATELY!',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[init] Error:', message)
    return NextResponse.json(
      { success: false, message: `Init failed: ${message}` },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true },
      take: 20,
    })
    const superAdminCount = await db.user.count({ where: { role: 'super_admin' } })

    return NextResponse.json({
      hasSuperAdmin: superAdminCount > 0,
      superAdminCount,
      totalUsers: users.length,
      users: users.map(u => ({ email: u.email, name: u.name, role: u.role, active: u.active })),
    })
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
