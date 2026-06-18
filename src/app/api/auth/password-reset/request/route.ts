import { NextRequest, NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/password-reset'

/**
 * POST /api/auth/password-reset/request
 * Request a password reset token for a given email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Email invalide' },
        { status: 400 }
      )
    }

    // Request password reset (always returns success for security)
    const result = await requestPasswordReset(email)

    if (result.success) {
      // Always return success message (don't reveal if user exists)
      return NextResponse.json({
        message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation',
        userId: result.userId, // Only for development/testing
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Erreur lors de la demande de réinitialisation' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error requesting password reset:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}