import { NextRequest, NextResponse } from 'next/server'
import { resetPassword, verifyResetToken, validatePasswordMin } from '@/lib/password-reset'

/**
 * POST /api/auth/password-reset/confirm
 * Reset password using a valid token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password, confirmPassword } = body

    // Validate token
    if (!token || typeof token !== 'string' || token.length < 10) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 400 }
      )
    }

    // Validate password
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Le mot de passe est requis' },
        { status: 400 }
      )
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Les mots de passe ne correspondent pas' },
        { status: 400 }
      )
    }

    // Validate password strength
    const validation = validatePasswordMin(password)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0] },
        { status: 400 }
      )
    }

    // Reset password
    const result = await resetPassword(token, password)

    if (result.success) {
      return NextResponse.json({
        message: 'Mot de passe réinitialisé avec succès',
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Erreur lors de la réinitialisation' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error confirming password reset:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}