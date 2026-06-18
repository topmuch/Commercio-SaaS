// Wave API configuration
export interface WaveCheckoutRequest {
  amount: number
  currency: string
  client_reference_id: string // subscription ID
  success_url: string
  cancel_url: string
  metadata?: Record<string, unknown>
}

export interface WaveCheckoutResponse {
  checkout_url: string
  checkout_session_id: string
}

const WAVE_API_BASE_URL = 'https://api.wave.com/v1'
const WAVE_SANDBOX_API_BASE_URL = 'https://api.sandbox.wave.com/v1'

// Use sandbox mode by default for testing
const USE_SANDBOX = true
const API_BASE_URL = USE_SANDBOX ? WAVE_SANDBOX_API_BASE_URL : WAVE_API_BASE_URL

/**
 * Create a Wave checkout session
 */
export async function createWaveCheckout(data: WaveCheckoutRequest): Promise<WaveCheckoutResponse> {
  const apiKey = process.env.WAVE_API_KEY || ''
  const apiSecret = process.env.WAVE_API_SECRET || ''

  if (!apiKey || !apiSecret) {
    throw new Error('Wave API credentials not configured')
  }

  try {
    const response = await fetch(`${API_BASE_URL}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: data.amount,
        currency: data.currency,
        client_reference_id: data.client_reference_id,
        success_url: data.success_url,
        cancel_url: data.cancel_url,
        metadata: data.metadata || {},
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create Wave checkout session')
    }

    const result = await response.json()
    return {
      checkout_url: result.checkout_url,
      checkout_session_id: result.checkout_session_id,
    }
  } catch (error) {
    console.error('[createWaveCheckout] Error:', error)
    throw error
  }
}

/**
 * Verify a Wave webhook signature
 */
export function verifyWaveWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const digest = hmac.digest('hex')
  return digest === signature
}

/**
 * Format amount for Wave (in smallest currency unit, so multiply by 100 for FCFA)
 */
export function formatAmountForWave(amount: number): number {
  return Math.round(amount * 100)
}

/**
 * Parse amount from Wave (divide by 100)
 */
export function parseAmountFromWave(amount: number): number {
  return amount / 100
}

/**
 * Get payment status from Wave webhook event type
 */
export function getPaymentStatusFromWaveEvent(eventType: string): 'completed' | 'failed' | 'refunded' | 'pending' {
  switch (eventType) {
    case 'checkout.session.completed':
    case 'payment.successful':
      return 'completed'
    case 'checkout.session.expired':
    case 'payment.failed':
      return 'failed'
    case 'payment.refunded':
      return 'refunded'
    default:
      return 'pending'
  }
}