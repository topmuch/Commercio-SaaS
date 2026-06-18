import { db } from '@/lib/db'
import { verifyWaveWebhookSignature, getPaymentStatusFromWaveEvent } from '@/lib/wave'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/saas/webhook/wave - Wave webhook handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-wave-signature') || ''

    const webhookSecret = process.env.WAVE_WEBHOOK_SECRET

    if (!webhookSecret) {
      console.error('[Wave Webhook] No webhook secret configured')
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }

    // Verify signature
    if (!verifyWaveWebhookSignature(body, signature, webhookSecret)) {
      console.error('[Wave Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    console.log('[Wave Webhook] Received event:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
      case 'payment.successful': {
        await handleSuccessfulPayment(event.data)
        break
      }
      case 'checkout.session.expired':
      case 'payment.failed': {
        await handleFailedPayment(event.data)
        break
      }
      case 'payment.refunded': {
        await handleRefundedPayment(event.data)
        break
      }
      default:
        console.log('[Wave Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    console.error('[Wave Webhook] Error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}

async function handleSuccessfulPayment(data: any) {
  const { client_reference_id, checkout_session_id, amount, currency } = data

  // Find the pending payment
  const payment = await db.saasPayment.findFirst({
    where: {
      waveCheckoutId: checkout_session_id,
      status: 'pending',
    },
  })

  if (!payment) {
    console.error('[Wave Webhook] Payment not found for checkout:', checkout_session_id)
    return
  }

  // Update payment status
  const updatedPayment = await db.saasPayment.update({
    where: { id: payment.id },
    data: {
      status: 'completed',
      wavePaymentId: data.payment_id,
      paidAt: new Date(),
    },
  })

  // Get subscription
  const subscription = await db.subscription.findUnique({
    where: { id: payment.subscriptionId },
  })

  if (!subscription) {
    console.error('[Wave Webhook] Subscription not found')
    return
  }

  // Calculate new end date (add 30 days)
  const now = new Date()
  const newEndDate = subscription.endDate && subscription.endDate > now
    ? new Date(subscription.endDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // Update subscription
  await db.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'active',
      endDate: newEndDate,
      waveCheckoutId: checkout_session_id,
    },
  })

  // Update company plan
  await db.company.update({
    where: { id: subscription.companyId },
    data: { plan: subscription.plan },
  })

  console.log('[Wave Webhook] Payment processed successfully:', updatedPayment.id)
}

async function handleFailedPayment(data: any) {
  const { checkout_session_id } = data

  // Find the pending payment
  const payment = await db.saasPayment.findFirst({
    where: {
      waveCheckoutId: checkout_session_id,
      status: 'pending',
    },
  })

  if (!payment) {
    return
  }

  // Update payment status
  await db.saasPayment.update({
    where: { id: payment.id },
    data: {
      status: 'failed',
    },
  })

  console.log('[Wave Webhook] Payment failed:', payment.id)
}

async function handleRefundedPayment(data: any) {
  const { payment_id } = data

  // Find the payment
  const payment = await db.saasPayment.findFirst({
    where: { wavePaymentId: payment_id },
  })

  if (!payment) {
    return
  }

  // Update payment status
  await db.saasPayment.update({
    where: { id: payment.id },
    data: {
      status: 'refunded',
    },
  })

  console.log('[Wave Webhook] Payment refunded:', payment.id)
}