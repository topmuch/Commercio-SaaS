/**
 * Two-Factor Authentication (2FA) Utilities
 *
 * Provides utilities for TOTP (Time-based One-Time Password) generation and verification,
 * backup codes management, and 2FA setup.
 */

import { randomBytes, createHmac } from 'crypto'
import { db } from './db'
import { hashPassword, verifyPassword } from './auth'
import { createHash } from 'crypto'

/**
 * TOTP Settings
 */
const TOTP_PERIOD = 30 // Time window in seconds (standard is 30)
const TOTP_DIGITS = 6 // Number of digits in OTP
const TOTP_ALGORITHM = 'sha1' // Standard for TOTP
const BACKUP_CODES_COUNT = 10 // Number of backup codes to generate
const BACKUP_CODE_LENGTH = 8 // Length of each backup code

/**
 * Base32 encoding/decoding
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Encode a buffer to base32
 */
function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

/**
 * Decode base32 to buffer
 */
function base32Decode(input: string): Buffer {
  input = input.toUpperCase().replace(/[^A-Z2-7]/g, '')

  let bits = 0
  let value = 0
  const output: number[] = []

  for (let i = 0; i < input.length; i++) {
    const index = BASE32_ALPHABET.indexOf(input[i])
    if (index === -1) continue

    value = (value << 5) | index
    bits += 5

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }

  return Buffer.from(output)
}

/**
 * Generate a secure random TOTP secret (base32 encoded)
 */
export function generateTOTPSecret(): string {
  const buffer = randomBytes(20) // 160 bits = 20 bytes (standard for TOTP)
  return base32Encode(buffer)
}

/**
 * Get current time counter for TOTP
 */
function getTimeCounter(): bigint {
  return BigInt(Math.floor(Date.now() / 1000 / TOTP_PERIOD))
}

/**
 * Generate TOTP code for a given secret
 */
export function generateTOTP(secret: string, counter?: bigint): string {
  const decodedSecret = base32Decode(secret)
  const timeCounter = counter || getTimeCounter()

  // Convert counter to 8-byte buffer (big-endian)
  const buffer = Buffer.alloc(8)
  let counterValue = timeCounter
  for (let i = 7; i >= 0; i--) {
    buffer[i] = Number(counterValue & BigInt(0xff))
    counterValue >>= BigInt(8)
  }

  // HMAC-SHA1
  const hmac = createHmac(TOTP_ALGORITHM, decodedSecret)
  hmac.update(buffer)
  const digest = hmac.digest()

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)

  const truncatedCode = code % Math.pow(10, TOTP_DIGITS)
  return truncatedCode.toString().padStart(TOTP_DIGITS, '0')
}

/**
 * Verify TOTP code with allowed time drift
 */
export function verifyTOTP(secret: string, token: string, window: number = 1): boolean {
  // Validate token format
  if (!/^\d{6}$/.test(token)) {
    return false
  }

  const currentCounter = getTimeCounter()

  // Check current and adjacent windows (for clock drift)
  for (let i = -window; i <= window; i++) {
    const counter = currentCounter + BigInt(i)
    const expectedToken = generateTOTP(secret, counter)
    if (expectedToken === token) {
      return true
    }
  }

  return false
}

/**
 * Generate OTPAuth URL for QR code
 * Format: otpauth://totp/Label:Account?secret=Secret&issuer=Issuer
 */
export function generateOTPAuthURL(
  appName: string,
  accountName: string,
  secret: string,
  issuer?: string
): string {
  const label = `${issuer ? `${issuer}:` : ''}${accountName}`
  const encodedLabel = encodeURIComponent(label)
  const encodedApp = encodeURIComponent(appName)

  return `otpauth://totp/${encodedLabel}?secret=${secret}&issuer=${encodedApp}`
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = []

  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    const buffer = randomBytes(Math.ceil(BACKUP_CODE_LENGTH / 2))
    let code = buffer.toString('hex').toUpperCase().substring(0, BACKUP_CODE_LENGTH)

    // Format code with spaces for readability (XXXX XXXX)
    if (code.length >= 8) {
      code = `${code.substring(0, 4)} ${code.substring(4, 8)}`
    }

    codes.push(code)
  }

  return codes
}

/**
 * Encrypt data (simple XOR encryption for demonstration - in production, use AES)
 */
export function encryptData(data: string, key: string): string {
  const keyBuffer = createHash('sha256').update(key).digest()
  const dataBuffer = Buffer.from(data)
  const encrypted = Buffer.alloc(dataBuffer.length)

  for (let i = 0; i < dataBuffer.length; i++) {
    encrypted[i] = dataBuffer[i] ^ keyBuffer[i % keyBuffer.length]
  }

  return encrypted.toString('base64')
}

/**
 * Decrypt data
 */
export function decryptData(encryptedData: string, key: string): string {
  const keyBuffer = createHash('sha256').update(key).digest()
  const encryptedBuffer = Buffer.from(encryptedData, 'base64')
  const decrypted = Buffer.alloc(encryptedBuffer.length)

  for (let i = 0; i < encryptedBuffer.length; i++) {
    decrypted[i] = encryptedBuffer[i] ^ keyBuffer[i % keyBuffer.length]
  }

  return decrypted.toString()
}

/**
 * Setup 2FA for a user
 */
export async function setupTwoFactor(
  userId: string,
  appName: string = 'Commercio SaaS'
): Promise<{ secret: string; qrCodeURL: string } | null> {
  try {
    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!user) {
      return null
    }

    // Generate TOTP secret
    const secret = generateTOTPSecret()

    // Generate OTPAuth URL for QR code
    const qrCodeURL = generateOTPAuthURL(appName, user.email, secret, appName)

    // Encrypt and store secret (temporarily, until verified)
    const encryptedSecret = encryptData(secret, process.env.NEXTAUTH_SECRET || 'default-key')

    // Store encrypted secret (but don't enable 2FA yet)
    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorEnabled: false,
      },
    })

    return { secret, qrCodeURL }
  } catch (error) {
    console.error('Error setting up 2FA:', error)
    return null
  }
}

/**
 * Verify and enable 2FA for a user
 */
export async function enableTwoFactor(
  userId: string,
  token: string,
  appName: string = 'Commercio SaaS'
): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  try {
    // Get user with secret
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorSecret: true,
        twoFactorEnabled: true,
      },
    })

    if (!user || !user.twoFactorSecret) {
      return { success: false, error: '2FA non configuré' }
    }

    if (user.twoFactorEnabled) {
      return { success: false, error: '2FA déjà activé' }
    }

    // Decrypt secret
    const secret = decryptData(user.twoFactorSecret, process.env.NEXTAUTH_SECRET || 'default-key')

    // Verify token
    const isValid = verifyTOTP(secret, token)
    if (!isValid) {
      return { success: false, error: 'Token invalide' }
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes()

    // Encrypt backup codes
    const encryptedBackupCodes = encryptData(
      JSON.stringify(backupCodes),
      process.env.NEXTAUTH_SECRET || 'default-key'
    )

    // Enable 2FA and store backup codes
    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: encryptedBackupCodes,
      },
    })

    return { success: true, backupCodes }
  } catch (error) {
    console.error('Error enabling 2FA:', error)
    return { success: false, error: 'Erreur lors de l\'activation du 2FA' }
  }
}

/**
 * Disable 2FA for a user
 */
export async function disableTwoFactor(
  userId: string,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    })

    if (!user) {
      return { success: false, error: 'Utilisateur non trouvé' }
    }

    // If 2FA is enabled, verify token
    if (user.twoFactorEnabled && token) {
      if (!user.twoFactorSecret) {
        return { success: false, error: 'Secret 2FA introuvable' }
      }

      const secret = decryptData(user.twoFactorSecret, process.env.NEXTAUTH_SECRET || 'default-key')
      const isValid = verifyTOTP(secret, token) || verifyBackupCode(userId, token)

      if (!isValid) {
        return { success: false, error: 'Token invalide' }
      }
    }

    // Disable 2FA
    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error disabling 2FA:', error)
    return { success: false, error: 'Erreur lors de la désactivation du 2FA' }
  }
}

/**
 * Verify 2FA token for login
 */
export async function verifyTwoFactorToken(
  userId: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    })

    if (!user) {
      return { success: false, error: 'Utilisateur non trouvé' }
    }

    if (!user.twoFactorEnabled) {
      return { success: false, error: '2FA non activé' }
    }

    if (!user.twoFactorSecret) {
      return { success: false, error: 'Secret 2FA introuvable' }
    }

    // Try TOTP verification
    const secret = decryptData(user.twoFactorSecret, process.env.NEXTAUTH_SECRET || 'default-key')
    const isValidTOTP = verifyTOTP(secret, token)

    if (isValidTOTP) {
      return { success: true }
    }

    // Try backup code verification
    const isValidBackup = await verifyBackupCode(userId, token)

    if (isValidBackup) {
      return { success: true }
    }

    return { success: false, error: 'Token invalide' }
  } catch (error) {
    console.error('Error verifying 2FA token:', error)
    return { success: false, error: 'Erreur lors de la vérification du 2FA' }
  }
}

/**
 * Verify backup code
 */
async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  try {
    // Get user
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        twoFactorBackupCodes: true,
      },
    })

    if (!user || !user.twoFactorBackupCodes) {
      return false
    }

    // Decrypt backup codes
    const backupCodesStr = decryptData(user.twoFactorBackupCodes, process.env.NEXTAUTH_SECRET || 'default-key')
    const backupCodes: string[] = JSON.parse(backupCodesStr)

    // Check if code matches (remove spaces for comparison)
    const normalizedCode = code.replace(/\s/g, '').toUpperCase()
    const normalizedCodes = backupCodes.map((c) => c.replace(/\s/g, '').toUpperCase())

    const codeIndex = normalizedCodes.indexOf(normalizedCode)
    if (codeIndex === -1) {
      return false
    }

    // Remove used backup code
    backupCodes.splice(codeIndex, 1)

    // Update user with remaining codes
    const encryptedBackupCodes = encryptData(
      JSON.stringify(backupCodes),
      process.env.NEXTAUTH_SECRET || 'default-key'
    )

    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: encryptedBackupCodes,
      },
    })

    return true
  } catch (error) {
    console.error('Error verifying backup code:', error)
    return false
  }
}

/**
 * Check if user has 2FA enabled
 */
export async function hasTwoFactorEnabled(userId: string): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    })

    return user?.twoFactorEnabled || false
  } catch (error) {
    console.error('Error checking 2FA status:', error)
    return false
  }
}

/**
 * Get remaining backup codes count
 */
export async function getRemainingBackupCodesCount(userId: string): Promise<number> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { twoFactorBackupCodes: true },
    })

    if (!user || !user.twoFactorBackupCodes) {
      return 0
    }

    const backupCodesStr = decryptData(user.twoFactorBackupCodes, process.env.NEXTAUTH_SECRET || 'default-key')
    const backupCodes: string[] = JSON.parse(backupCodesStr)

    return backupCodes.length
  } catch (error) {
    console.error('Error getting backup codes count:', error)
    return 0
  }
}

/**
 * Regenerate backup codes (requires TOTP verification)
 */
export async function regenerateBackupCodes(
  userId: string,
  token: string
): Promise<{ success: boolean; backupCodes?: string[]; error?: string }> {
  try {
    // Verify TOTP first
    const verification = await verifyTwoFactorToken(userId, token)
    if (!verification.success) {
      return { success: false, error: 'Token invalide' }
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes()

    // Encrypt backup codes
    const encryptedBackupCodes = encryptData(
      JSON.stringify(backupCodes),
      process.env.NEXTAUTH_SECRET || 'default-key'
    )

    // Update user with new codes
    await db.user.update({
      where: { id: userId },
      data: {
        twoFactorBackupCodes: encryptedBackupCodes,
      },
    })

    return { success: true, backupCodes }
  } catch (error) {
    console.error('Error regenerating backup codes:', error)
    return { success: false, error: 'Erreur lors de la régénération des codes' }
  }
}