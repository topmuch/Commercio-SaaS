import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

/**
 * GET /api/init
 * Show all users (debug)
 */
export async function GET() {
  try {
    const users = await db.user.findMany({
      select: { id: true, email: true, name: true, role: true, active: true },
      take: 20,
    })
    return NextResponse.json({ users })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * POST /api/init
 * Create or reset super admin.
 *
 * Body (optional):
 *   { "email": "...", "password": "..." }
 *
 * If no body: uses defaults
 *   email:    admin@terangabiz.com
 *   password: Admin@123456
 */
export async function POST(request: Request) {
  try {
    let email = 'admin@terangabiz.com'
    let password = 'Admin@123456'

    try {
      const body = await request.json()
      if (body?.email) email = String(body.email).trim().toLowerCase()
      if (body?.password) password = String(body.password)
    } catch {
      // no body = use defaults
    }

    // 1. Get or create company
    let company = await db.company.findFirst()
    if (!company) {
      company = await db.company.create({
        data: {
          id: 'comp_default',
          name: 'Teranga Biz',
          email: 'contact@terangabiz.com',
          phone: '+221 33 800 00 01',
          plan: 'enterprise',
          status: 'active',
        },
      })
    }

    // 2. Hash password with bcryptjs (same as auth.ts)
    const hashedPassword = await bcrypt.hash(password, 12)

    // 3. Upsert user — create or reset password + promote to super_admin
    const user = await db.user.upsert({
      where: {
        email_companyId: { email, companyId: company.id },
      },
      update: {
        password: hashedPassword,
        role: 'super_admin',
        active: true,
      },
      create: {
        email,
        password: hashedPassword,
        name: 'Super Administrateur',
        phone: '+221 77 000 00 00',
        role: 'super_admin',
        active: true,
        companyId: company.id,
      },
      select: { id: true, email: true, name: true, role: true },
    })

    // 4. Clear rate limit entries for this email (so login isn't blocked)
    try {
      await db.rateLimitEntry.deleteMany({
        where: { identifier: email },
      })
    } catch {
      // table might not exist — ignore
    }

    return NextResponse.json({
      success: true,
      message: 'Super admin prêt.',
      user,
      credentials: { email, password },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

/**
 * PUT /api/init
 * Test login credentials (debug — bypasses rate limiter)
 *
 * Body: { "email": "...", "password": "..." }
 *
 * Returns whether password matches + diagnostic info
 */
export async function PUT(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const user = await db.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, name: true, role: true, active: true, password: true },
    })

    if (!user) {
      return NextResponse.json({ match: false, reason: 'User not found', tried: email })
    }

    if (!user.active) {
      return NextResponse.json({ match: false, reason: 'User inactive', user: user.email })
    }

    const valid = await bcrypt.compare(password, user.password)

    return NextResponse.json({
      match: valid,
      reason: valid ? 'Password correct' : 'Password incorrect',
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
        active: user.active,
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
