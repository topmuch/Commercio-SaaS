import { NextRequest, NextResponse } from 'next/server'
import { verifyTwoFactorToken } from '@/lib/two-factor'

/**
 * POST /api/auth/2fa/verify
 * Verify 2FA token (for login or other operations)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, token } = body

    // Validate inputs
    if (!userId || !token) {
      return NextResponse.json(
        { error: 'User ID et token requis' },
        { status: 400 }
      )
    }

    // Verify 2FA token
    const result = await verifyTwoFactorToken(userId, token)

    if (result.success) {
      return NextResponse.json({
        success: true,
      })
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error verifying 2FA token:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}