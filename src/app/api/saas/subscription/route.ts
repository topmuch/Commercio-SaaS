import { db } from '@/lib/db'
import { getCompanyId, getAuthSession } from '@/lib/auth'
import { createWaveCheckout, formatAmountForWave } from '@/lib/wave'
import { SAAS_PLANS } from '@/lib/saas-plans'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/saas/subscription/upgrade - Initiate payment for plan upgrade
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession()
    const companyId = await getCompanyId()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { plan } = body

    // Validate plan
    if (!plan || !SAAS_PLANS[plan as keyof typeof SAAS_PLANS]) {
      return NextResponse.json(
        { error: 'Plan invalide' },
        { status: 400 }
      )
    }

    const planConfig = SAAS_PLANS[plan as keyof typeof SAAS_PLANS]

    // Get current subscription
    const currentSubscription = await db.subscription.findFirst({
      where: { companyId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    })

    // If already on this plan
    if (currentSubscription && currentSubscription.plan === plan) {
      return NextResponse.json(
        { error: 'Vous êtes déjà sur ce plan' },
        { status: 400 }
      )
    }

    // Check if Wave credentials are configured
    const apiKey = process.env.WAVE_API_KEY
    const apiSecret = process.env.WAVE_API_SECRET

    if (!apiKey || !apiSecret) {
      // Fallback: create subscription without payment (for demo)
      const subscription = await db.subscription.create({
        data: {
          companyId,
          plan,
          status: 'active',
          startDate: new Date(),
          endDate: plan === 'enterprise' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          trialEndDate: planConfig.trialDays > 0
            ? new Date(Date.now() + planConfig.trialDays * 24 * 60 * 60 * 1000)
            : null,
          autoRenew: planConfig.price > 0,
        },
      })

      // Update company plan
      await db.company.update({
        where: { id: companyId },
        data: { plan },
      })

      return NextResponse.json({
        data: {
          subscription,
          message: 'Abonnement créé avec succès (mode démo)',
        },
      })
    }

    // Create checkout session with Wave
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const checkout = await createWaveCheckout({
      amount: formatAmountForWave(planConfig.price),
      currency: planConfig.currency,
      client_reference_id: companyId,
      success_url: `${baseUrl}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard/subscription?canceled=true`,
      metadata: {
        companyId,
        plan,
        currentPlan: currentSubscription?.plan || 'none',
      },
    })

    // Create pending payment record
    await db.saasPayment.create({
      data: {
        subscriptionId: currentSubscription?.id || '', // Will be updated after payment
        companyId,
        amount: planConfig.price,
        currency: planConfig.currency,
        status: 'pending',
        waveCheckoutId: checkout.checkout_session_id,
      },
    })

    return NextResponse.json({
      data: {
        checkout_url: checkout.checkout_url,
        checkout_session_id: checkout.checkout_session_id,
      },
    })
  } catch (error: unknown) {
    console.error('[POST /api/saas/subscription/upgrade] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/saas/subscription - Get current subscription info
export async function GET() {
  try {
    const session = await getAuthSession()
    const companyId = await getCompanyId()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const subscription = await db.subscription.findFirst({
      where: { companyId, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    })

    // Get current usage
    const [userCount, clientCount, productCount] = await Promise.all([
      db.user.count({ where: { companyId, active: true } }),
      db.client.count({ where: { companyId } }),
      db.product.count({ where: { companyId, status: 'active' } }),
    ])

    const planConfig = SAAS_PLANS[company?.plan as keyof typeof SAAS_PLANS] || SAAS_PLANS.starter

    return NextResponse.json({
      data: {
        subscription,
        company: {
          plan: company?.plan || 'starter',
        },
        usage: {
          users: userCount,
          clients: clientCount,
          products: productCount,
        },
        limits: {
          users: planConfig.maxUsers,
          clients: planConfig.maxClients,
          products: planConfig.maxProducts,
        },
      },
    })
  } catch (error: unknown) {
    console.error('[GET /api/saas/subscription] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}