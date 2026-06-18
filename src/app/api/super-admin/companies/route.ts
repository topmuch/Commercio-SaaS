import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createWhatsAppLink, generateAccessCodeMessage } from '@/lib/whatsapp'
import { hashPassword } from '@/lib/auth'

// GET - List all companies (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where = status ? { status } : {}

    const companies = await db.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsapp: true,
        address: true,
        logo: true,
        plan: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            clients: true,
            orders: true,
            quotes: true,
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ companies })
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des entreprises' },
      { status: 500 }
    )
  }
}

// POST - Create a new company (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      whatsapp,
      address,
      plan = 'starter',
      adminName,
      adminEmail,
      adminPassword,
      sendWhatsApp = false,
    } = body

    // Validate required fields
    if (!name || !email || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    // Check if company email already exists
    const existingCompany = await db.company.findUnique({
      where: { email },
    })

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Une entreprise avec cet email existe déjà' },
        { status: 400 }
      )
    }

    // Check if admin email already exists
    const existingAdmin = await db.user.findFirst({
      where: { email: adminEmail },
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cet email existe déjà' },
        { status: 400 }
      )
    }

    // Create company
    const company = await db.company.create({
      data: {
        name,
        email,
        phone: phone || null,
        whatsapp: whatsapp || null,
        address: address || null,
        plan,
        status: 'active',
      },
    })

    // Generate access code
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Create admin user
    const adminUser = await db.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: await hashPassword(adminPassword),
        role: 'admin',
        companyId: company.id,
        active: true,
      },
    })

    // Prepare WhatsApp message if requested
    let whatsappLink = ''
    if (sendWhatsApp && whatsapp) {
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.commercio.com'}/login`
      const message = generateAccessCodeMessage(name, accessCode, loginUrl)
      whatsappLink = createWhatsAppLink(whatsapp, message)
    }

    return NextResponse.json({
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        whatsapp: company.whatsapp,
        address: company.address,
        plan: company.plan,
        status: company.status,
        createdAt: company.createdAt,
      },
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
      accessCode,
      whatsappLink,
    })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'entreprise' },
      { status: 500 }
    )
  }
}