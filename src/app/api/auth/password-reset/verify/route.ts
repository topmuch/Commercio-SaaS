import { NextRequest, NextResponse } from 'next/server'
import { verifyResetToken } from '@/lib/password-reset'

/**
 * POST /api/auth/password-reset/verify
 * Verify if a reset token is valid
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    // Validate token
    if (!token || typeof token !== 'string' || token.length < 10) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 400 }
      )
    }

    // Verify token
    const tokenData = await verifyResetToken(token)

    if (tokenData) {
      return NextResponse.json({
        valid: true,
        userId: tokenData.userId,
      })
    } else {
      return NextResponse.json({
        valid: false,
        error: 'Token invalide ou expiré',
      })
    }
  } catch (error) {
    console.error('Error verifying reset token:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}