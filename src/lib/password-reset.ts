/**
 * Password Reset Utilities
 *
 * Provides utilities for managing password reset tokens, validating requests,
 * and handling password reset flow.
 */

import { db } from './db'
import { hashPassword, verifyPassword } from './auth'
import { randomBytes, createHash } from 'crypto'

/**
 * Password reset token expiration time (1 hour in milliseconds)
 */
export const RESET_TOKEN_EXPIRATION = 60 * 60 * 1000 // 1 hour

/**
 * Password validation rules
 */
export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []

  // Minimum length
  if (password.length < 6) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères')
  }

  // Recommended: at least 8 characters
  if (password.length < 8) {
    errors.push('Il est recommandé d\'utiliser au moins 8 caractères')
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule')
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule')
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre')
  }

  // Check for special character (recommended)
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Il est recommandé d\'inclure un caractère spécial (!@#$%^&*...)')
  }

  // Check for common passwords (basic check)
  const commonPasswords = ['password', '123456', '123456789', 'qwerty', 'abc123', 'admin', 'welcome']
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Ce mot de passe est trop commun')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate password with minimum requirements only (for API use)
 */
export function validatePasswordMin(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (password.length < 6) {
    errors.push('Le mot de passe doit contenir au moins 6 caractères')
    return { valid: false, errors }
  }

  return { valid: true, errors: [] }
}

/**
 * Generate a secure random token for password reset
 */
export function generateResetToken(): { token: string; hashedToken: string } {
  const token = randomBytes(32).toString('hex')
  // Hash the token for storage
  const hashedToken = createHash('sha256').update(token).digest('hex')
  return { token, hashedToken }
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Create a password reset token for a user
 */
export async function createPasswordResetToken(userId: string): Promise<{ token: string; expiresAt: Date } | null> {
  try {
    // Generate token
    const { token, hashedToken } = generateResetToken()
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION)

    // Delete any existing unused tokens for this user
    await db.passwordResetToken.deleteMany({
      where: {
        userId,
        used: false,
      },
    })

    // Create new token
    await db.passwordResetToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt,
      },
    })

    return { token, expiresAt }
  } catch (error) {
    console.error('Error creating password reset token:', error)
    return null
  }
}

/**
 * Verify a password reset token
 */
export async function verifyResetToken(token: string): Promise<{ userId: string } | null> {
  try {
    const hashedToken = hashToken(token)

    // Find valid token
    const resetToken = await db.passwordResetToken.findUnique({
      where: {
        token: hashedToken,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            active: true,
          },
        },
      },
    })

    // Check if token exists
    if (!resetToken) {
      return null
    }

    // Check if token is already used
    if (resetToken.used) {
      return null
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      return null
    }

    // Check if user is active
    if (!resetToken.user.active) {
      return null
    }

    return { userId: resetToken.userId }
  } catch (error) {
    console.error('Error verifying reset token:', error)
    return null
  }
}

/**
 * Mark a reset token as used
 */
export async function markResetTokenAsUsed(token: string): Promise<boolean> {
  try {
    const hashedToken = hashToken(token)

    await db.passwordResetToken.update({
      where: {
        token: hashedToken,
      },
      data: {
        used: true,
      },
    })

    return true
  } catch (error) {
    console.error('Error marking reset token as used:', error)
    return false
  }
}

/**
 * Reset user password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify token
    const tokenData = await verifyResetToken(token)
    if (!tokenData) {
      return { success: false, error: 'Token invalide ou expiré' }
    }

    // Validate new password
    const validation = validatePasswordMin(newPassword)
    if (!validation.valid) {
      return { success: false, error: validation.errors[0] }
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword)

    // Update user password
    await db.user.update({
      where: {
        id: tokenData.userId,
      },
      data: {
        password: hashedPassword,
      },
    })

    // Mark token as used
    await markResetTokenAsUsed(token)

    return { success: true }
  } catch (error) {
    console.error('Error resetting password:', error)
    return { success: false, error: 'Erreur lors de la réinitialisation du mot de passe' }
  }
}

/**
 * Request password reset for an email
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    // Find user by email
    const user = await db.user.findFirst({
      where: {
        email: email.toLowerCase(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
      },
    })

    // Check if user exists
    if (!user) {
      // Don't reveal if user exists for security
      return { success: true }
    }

    // Check if user is active
    if (!user.active) {
      // Don't reveal if user is active for security
      return { success: true }
    }

    // Create reset token
    const tokenData = await createPasswordResetToken(user.id)
    if (!tokenData) {
      return { success: false, error: 'Erreur lors de la création du token de réinitialisation' }
    }

    // In a real application, you would send an email here
    // For now, we'll log the token for development
    console.log(`[Password Reset] Token for ${user.email}: ${tokenData.token}`)
    console.log(`[Password Reset] Expires at: ${tokenData.expiresAt.toISOString()}`)

    return { success: true, userId: user.id }
  } catch (error) {
    console.error('Error requesting password reset:', error)
    return { success: false, error: 'Erreur lors de la demande de réinitialisation' }
  }
}

/**
 * Clean up expired reset tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const result = await db.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        used: false,
      },
    })

    return result.count
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error)
    return 0
  }
}

/**
 * Check if a user has any active reset tokens
 */
export async function hasActiveResetToken(userId: string): Promise<boolean> {
  try {
    const count = await db.passwordResetToken.count({
      where: {
        userId,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    return count > 0
  } catch (error) {
    console.error('Error checking for active reset tokens:', error)
    return false
  }
}