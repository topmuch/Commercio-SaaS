import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getCompanyId, isAdmin } from '@/lib/auth'

// GET /api/store-settings
export async function GET() {
  try {
    const companyId = await getCompanyId()

    let settings = await db.storeSettings.findUnique({
      where: { companyId },
    })

    // Create default settings if not exists
    if (!settings) {
      // Verify the company exists before creating settings
      const company = await db.company.findUnique({ where: { id: companyId } })
      if (!company) {
        return NextResponse.json(
          { error: 'Entreprise introuvable. Veuillez contacter l\'administrateur.' },
          { status: 404 }
        )
      }
      settings = await db.storeSettings.create({
        data: {
          companyId,
          whatsappNumber: '+221770000000',
          storeTitle: 'Boutique DistribuSN',
          currency: 'XOF',
          isActive: true,
        },
      })
    }

    return NextResponse.json({ data: settings })
  } catch (error: unknown) {
    console.error('[GET /api/store-settings] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur lors du chargement des paramètres'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/store-settings
export async function PUT(request: Request) {
  try {
    const companyId = await getCompanyId()

    // SECURITY: Only admin/director/super_admin can modify store settings (including SMTP)
    // In demo mode (no session), admin access is automatically granted.
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Accès refusé. Seuls les administrateurs peuvent modifier les paramètres de la boutique.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      // Boutique
      whatsappNumber,
      storeTitle,
      storeDescription,
      currency,
      isActive,
      publicSlug,
      // Identité visuelle
      logoUrl,
      primaryColor,
      // Entreprise
      companyLogo,
      companyName,
      companyAddress,
      // SEO
      seoTitle,
      seoDescription,
      seoImage,
      // Email
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      emailFrom,
      emailSignature,
    } = body

    // Validate slug format
    if (publicSlug !== undefined && publicSlug !== null && publicSlug !== '') {
      const slug = String(publicSlug).trim()
      if (slug.length < 3) {
        return NextResponse.json(
          { error: "L'identifiant doit contenir au moins 3 caractères" },
          { status: 400 }
        )
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
        return NextResponse.json(
          { error: "L'identifiant ne peut contenir que des lettres, chiffres, tirets et underscores" },
          { status: 400 }
        )
      }
      // Check uniqueness (publicSlug is @unique in schema)
      try {
        const existing = await db.storeSettings.findFirst({
          where: {
            publicSlug: slug,
            NOT: { companyId },
          },
        })
        if (existing) {
          return NextResponse.json(
            { error: 'Cet identifiant est déjà utilisé par une autre boutique' },
            { status: 409 }
          )
        }
      } catch {
        // Ignore uniqueness check errors, let upsert handle it
      }
    }

    // Build update data — only include fields that are explicitly provided
    const updateData: Record<string, unknown> = {}

    // Boutique
    if (whatsappNumber !== undefined) updateData.whatsappNumber = whatsappNumber
    if (storeTitle !== undefined) updateData.storeTitle = storeTitle
    if (storeDescription !== undefined) updateData.storeDescription = storeDescription
    if (currency !== undefined) updateData.currency = currency
    if (isActive !== undefined) updateData.isActive = isActive
    if (publicSlug !== undefined) updateData.publicSlug = publicSlug === '' ? null : publicSlug || null

    // Identité visuelle
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor

    // Entreprise
    if (companyLogo !== undefined) updateData.companyLogo = companyLogo
    if (companyName !== undefined) updateData.companyName = companyName
    if (companyAddress !== undefined) updateData.companyAddress = companyAddress

    // SEO
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle
    if (seoDescription !== undefined) updateData.seoDescription = seoDescription
    if (seoImage !== undefined) updateData.seoImage = seoImage

    // Email
    if (smtpHost !== undefined) updateData.smtpHost = smtpHost
    if (smtpPort !== undefined) updateData.smtpPort = smtpPort ? parseInt(smtpPort, 10) : null
    if (smtpUser !== undefined) updateData.smtpUser = smtpUser
    if (smtpPass !== undefined) updateData.smtpPass = smtpPass
    if (emailFrom !== undefined) updateData.emailFrom = emailFrom
    if (emailSignature !== undefined) updateData.emailSignature = emailSignature

    // Verify the company exists before upserting settings
    const companyExists = await db.company.findUnique({ where: { id: companyId } })
    if (!companyExists) {
      return NextResponse.json(
        { error: 'Entreprise introuvable. Veuillez contacter l\'administrateur.' },
        { status: 404 }
      )
    }

    // Use findOrCreate pattern instead of upsert to avoid FK race conditions
    let settings = await db.storeSettings.findUnique({
      where: { companyId },
    })

    if (settings) {
      // Update existing settings
      settings = await db.storeSettings.update({
        where: { companyId },
        data: updateData,
      })
    } else {
      // Create new settings
      settings = await db.storeSettings.create({
        data: {
          companyId,
          whatsappNumber: String(whatsappNumber || '+221770000000'),
          storeTitle: String(storeTitle || 'Boutique DistribuSN'),
          storeDescription: storeDescription ? String(storeDescription) : null,
          currency: String(currency || 'XOF'),
          isActive: isActive !== undefined ? Boolean(isActive) : true,
          publicSlug: publicSlug ? String(publicSlug) : null,
          // Entreprise
          companyLogo: companyLogo || null,
          companyName: companyName || null,
          companyAddress: companyAddress || null,
          // SEO
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          seoImage: seoImage || null,
          // Email
          smtpHost: smtpHost || null,
          smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
          smtpUser: smtpUser || null,
          smtpPass: smtpPass || null,
          emailFrom: emailFrom || null,
          emailSignature: emailSignature || null,
        },
      })
    }

    return NextResponse.json({ data: settings })
  } catch (error: unknown) {
    console.error('Error updating store settings:', error)
    const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour des paramètres'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
