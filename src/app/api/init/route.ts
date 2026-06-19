import { db } from '@/lib/db'
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

// POST /api/init — create super admin (always works, even if users exist)
export async function POST() {
  try {
    // 1. Get or create company
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

    // 2. Check if super admin email already exists
    const existingUser = await db.user.findFirst({
      where: { email: DEFAULTS.superAdminEmail },
      select: { id: true, role: true },
    })

    const hashedPassword = await bcrypt.hash(DEFAULTS.defaultPassword, 10)

    if (existingUser) {
      // Update password + promote to super_admin
      await db.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          role: 'super_admin',
          active: true,
          companyId: company.id,
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Super admin reset.',
        credentials: { email: DEFAULTS.superAdminEmail, password: DEFAULTS.defaultPassword },
        warning: 'CHANGE THIS PASSWORD IMMEDIATELY!',
      })
    }

    // 3. Create new super admin
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

    return NextResponse.json({
      success: true,
      message: 'Super admin created.',
      credentials: { email: DEFAULTS.superAdminEmail, password: DEFAULTS.defaultPassword },
      warning: 'CHANGE THIS PASSWORD IMMEDIATELY!',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}

// GET /api/init — show all users
export async function GET() {
  try {
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true },
      take: 20,
    })

    return NextResponse.json({
      users: users.map(u => ({ email: u.email, role: u.role, active: u.active })),
    })
  } catch {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
