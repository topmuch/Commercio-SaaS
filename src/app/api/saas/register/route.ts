import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'

// Configuration des plans
const PLANS = {
  starter: {
    name: 'Starter',
    price: 0,
    maxUsers: 3,
    maxClients: 50,
    maxProducts: 200,
    trialDays: 0,
  },
  pro: {
    name: 'Pro',
    price: 29000,
    maxUsers: 15,
    maxClients: -1, // illimité
    maxProducts: 2000,
    trialDays: 14,
  },
  enterprise: {
    name: 'Enterprise',
    price: 0, // sur mesure
    maxUsers: -1,
    maxClients: -1,
    maxProducts: -1,
    trialDays: 0,
  },
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      companyName,
      email,
      password,
      phone,
      plan,
      address,
    } = body

    // Validation
    if (!companyName || !email || !password) {
      return NextResponse.json(
        { error: 'Le nom de l\'entreprise, l\'email et le mot de passe sont obligatoires.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 }
      )
    }

    // Valider le plan
    const selectedPlan = plan || 'starter'
    if (!PLANS[selectedPlan as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: 'Plan invalide' },
        { status: 400 }
      )
    }

    // Vérifier si l'email de l'entreprise existe déjà
    const existingCompany = await db.company.findUnique({
      where: { email },
    })
    if (existingCompany) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà.' },
        { status: 409 }
      )
    }

    // Créer l'entreprise
    const company = await db.company.create({
      data: {
        name: companyName,
        email,
        phone,
        address,
        plan: selectedPlan,
      },
    })

    // Créer l'admin user
    const user = await db.user.create({
      data: {
        name: companyName, // Par défaut, le nom de l'utilisateur = nom de l'entreprise
        email,
        password: await bcrypt.hash(password, 10),
        role: 'admin',
        active: true,
        companyId: company.id,
        phone: phone || null,
      },
    })

    // Créer l'abonnement
    const planConfig = PLANS[selectedPlan as keyof typeof PLANS]
    const now = new Date()
    let endDate = null
    let trialEndDate = null

    // Si plan payant avec essai
    if (planConfig.trialDays > 0) {
      trialEndDate = new Date(now)
      trialEndDate.setDate(trialEndDate.getDate() + planConfig.trialDays)
      endDate = trialEndDate
    } else if (planConfig.price > 0) {
      // Sans essai, abonnement mensuel
      endDate = new Date(now)
      endDate.setMonth(endDate.getMonth() + 1)
    }

    const subscription = await db.subscription.create({
      data: {
        companyId: company.id,
        plan: selectedPlan,
        status: 'active',
        startDate: now,
        endDate,
        trialEndDate,
        autoRenew: planConfig.price > 0,
      },
    })

    return NextResponse.json(
      {
        data: {
          company: {
            id: company.id,
            name: company.name,
            email: company.email,
            plan: company.plan,
          },
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          subscription: {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            trialEndDate: subscription.trialEndDate,
            endDate: subscription.endDate,
          },
        },
        message: 'Compte créé avec succès!',
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('[SaaS Register] Error:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET - Récupérer les informations des plans
export async function GET() {
  try {
    return NextResponse.json({
      data: Object.entries(PLANS).map(([key, config]) => ({
        id: key,
        ...config,
      })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}