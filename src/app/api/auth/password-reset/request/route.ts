import { NextRequest, NextResponse } from 'next/server'
import { requestPasswordReset } from '@/lib/password-reset'
import {
  checkRateLimitForRequest,
  recordFailedAttempt,
  recordSuccessfulAttempt,
  getRateLimitHeaders,
} from '@/lib/rate-limit'

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

    const emailLower = email.toLowerCase()

    // Check rate limit for password reset requests
    const rateLimitCheck = await checkRateLimitForRequest('password_reset', emailLower)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Trop de tentatives. Veuillez réessayer plus tard.',
          retryAfter: rateLimitCheck.blockedUntil,
        },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitCheck),
        }
      )
    }

    // Request password reset (always returns success for security)
    const result = await requestPasswordReset(emailLower)

    if (result.success) {
      // Record successful attempt and reset rate limit
      await recordSuccessfulAttempt(emailLower, 'password_reset')

      // Always return success message (don't reveal if user exists)
      return NextResponse.json(
        {
          message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation',
          userId: result.userId, // Only for development/testing
        },
        {
          headers: getRateLimitHeaders(rateLimitCheck),
        }
      )
    } else {
      // Record failed attempt
      await recordFailedAttempt(emailLower, 'password_reset', result.error)

      return NextResponse.json(
        { error: result.error || 'Erreur lors de la demande de réinitialisation' },
        {
          status: 500,
          headers: getRateLimitHeaders(rateLimitCheck),
        }
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