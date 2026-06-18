import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get platform settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('companyId')

    let settings
    if (companyId) {
      // Get company-specific settings
      settings = await db.siteSettings.findUnique({
        where: { companyId },
      })
    } else {
      // Get platform settings (null companyId means platform-wide)
      settings = await db.siteSettings.findFirst({
        where: { companyId: null },
      })
    }

    if (!settings) {
      // Return default settings
      return NextResponse.json({
        id: '',
        companyId,
        seoTitle: 'Commercio SaaS',
        seoDescription: 'Plateforme de gestion commerciale multitenant',
        seoKeywords: 'commercio, saas, gestion, commerciale',
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpFromEmail: '',
        smtpFromName: 'Commercio SaaS',
        emailTemplates: '{}',
        platformName: 'Commercio SaaS',
        platformLogo: '',
        supportEmail: '',
        supportPhone: '',
        supportAddress: '',
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres' },
      { status: 500 }
    )
  }
}

// PUT - Update platform settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      companyId,
      seoTitle,
      seoDescription,
      seoKeywords,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpFromEmail,
      smtpFromName,
      emailTemplates,
      platformName,
      platformLogo,
      supportEmail,
      supportPhone,
      supportAddress,
    } = body

    const where = companyId ? { companyId } : { companyId: null as null }

    // Check if settings exist
    const existing = await db.siteSettings.findFirst({ where })

    let settings
    if (existing) {
      // Update existing settings
      settings = await db.siteSettings.update({
        where: { id: existing.id },
        data: {
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          seoKeywords: seoKeywords || null,
          smtpHost: smtpHost || null,
          smtpPort: smtpPort || null,
          smtpUser: smtpUser || null,
          smtpPassword: smtpPassword || null,
          smtpFromEmail: smtpFromEmail || null,
          smtpFromName: smtpFromName || null,
          emailTemplates: emailTemplates || '{}',
          platformName: platformName || 'Commercio SaaS',
          platformLogo: platformLogo || null,
          supportEmail: supportEmail || null,
          supportPhone: supportPhone || null,
          supportAddress: supportAddress || null,
        },
      })
    } else {
      // Create new settings
      settings = await db.siteSettings.create({
        data: {
          companyId: companyId || null,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          seoKeywords: seoKeywords || null,
          smtpHost: smtpHost || null,
          smtpPort: smtpPort || null,
          smtpUser: smtpUser || null,
          smtpPassword: smtpPassword || null,
          smtpFromEmail: smtpFromEmail || null,
          smtpFromName: smtpFromName || null,
          emailTemplates: emailTemplates || '{}',
          platformName: platformName || 'Commercio SaaS',
          platformLogo: platformLogo || null,
          supportEmail: supportEmail || null,
          supportPhone: supportPhone || null,
          supportAddress: supportAddress || null,
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des paramètres' },
      { status: 500 }
    )
  }
}