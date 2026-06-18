import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { enableTwoFactor } from '@/lib/two-factor'

/**
 * POST /api/auth/2fa/enable
 * Enable 2FA with TOTP verification (generates backup codes)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const body = await request.json()
    const { token } = body

    // Validate token
    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token requis' },
        { status: 400 }
      )
    }

    // Enable 2FA
    const result = await enableTwoFactor(userId, token)

    if (result.success) {
      return NextResponse.json({
        success: true,
        backupCodes: result.backupCodes,
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error enabling 2FA:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}