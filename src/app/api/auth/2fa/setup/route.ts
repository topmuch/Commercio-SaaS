import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { setupTwoFactor } from '@/lib/two-factor'
import { db } from '@/lib/db'

/**
 * POST /api/auth/2fa/setup
 * Initialize 2FA setup (generates secret and QR code URL)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()
    const appName = body.appName || 'Commercio SaaS'

    // Setup 2FA
    const result = await setupTwoFactor(userId, appName)

    if (!result) {
      return NextResponse.json(
        { error: 'Erreur lors de l\'initialisation du 2FA' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      secret: result.secret,
      qrCodeURL: result.qrCodeURL,
    })
  } catch (error) {
    console.error('Error setting up 2FA:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/auth/2fa/setup
 * Check 2FA status
 */
export async function GET() {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id

    // Get user 2FA status
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      enabled: user.twoFactorEnabled,
    })
  } catch (error) {
    console.error('Error getting 2FA status:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}