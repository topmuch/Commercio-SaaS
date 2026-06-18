import { NextRequest, NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { disableTwoFactor } from '@/lib/two-factor'

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA (requires TOTP verification if enabled)
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

    // Disable 2FA
    const result = await disableTwoFactor(userId, token)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '2FA désactivé avec succès',
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error disabling 2FA:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}