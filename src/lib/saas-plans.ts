// Configuration des plans SaaS
export const SAAS_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    displayName: 'Starter',
    price: 0,
    currency: 'XOF',
    billingPeriod: 'mois',
    maxUsers: 3,
    maxClients: 50,
    maxProducts: 200,
    features: [
      '3 utilisateurs',
      '50 clients',
      '200 produits',
      'Carte territoriale',
      'Boutique WhatsApp',
    ],
    trialDays: 0,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    displayName: 'Pro (Populaire)',
    price: 29000,
    currency: 'XOF',
    billingPeriod: 'mois',
    maxUsers: 15,
    maxClients: -1, // illimité
    maxProducts: 2000,
    features: [
      '15 utilisateurs',
      'Clients illimités',
      '2000 produits',
      'Rapports avancés',
      'IA Assistant',
      'Support prioritaire',
    ],
    trialDays: 14,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    displayName: 'Enterprise (Sur mesure)',
    price: 0, // sur mesure
    currency: 'XOF',
    billingPeriod: 'mois',
    maxUsers: -1,
    maxClients: -1,
    maxProducts: -1,
    features: [
      'Utilisateurs illimités',
      'Tout du Pro +',
      'API access',
      'Intégrations personnalisées',
      'Account manager dédié',
      'SLA garanti',
    ],
    trialDays: 0,
  },
}

export type PlanId = keyof typeof SAAS_PLANS

export interface PlanLimits {
  maxUsers: number
  maxClients: number
  maxProducts: number
}

export function getPlanConfig(planId: string) {
  return SAAS_PLANS[planId as PlanId] || SAAS_PLANS.starter
}

export function getPlanLimits(planId: string): PlanLimits {
  const config = getPlanConfig(planId)
  return {
    maxUsers: config.maxUsers,
    maxClients: config.maxClients,
    maxProducts: config.maxProducts,
  }
}

export function isPlanUnlimited(planId: string, type: 'users' | 'clients' | 'products'): boolean {
  const limits = getPlanLimits(planId)
  return limits[`max${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof PlanLimits] === -1
}