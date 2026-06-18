/**
 * Plan Feature Access Control
 *
 * This file provides functions to check if a company's plan has access to specific features.
 */

import { db } from '@/lib/db'
import { getCompanyId } from '@/lib/auth'

export type PlanId = 'starter' | 'pro' | 'enterprise'

export interface PlanFeatures {
  plan: PlanId
  hasAIAssistant: boolean
  hasAdvancedReports: boolean
  hasPrioritySupport: boolean
  hasAPIAccess: boolean
}

/**
 * Get current company plan and features
 */
export async function getCompanyFeatures(): Promise<PlanFeatures> {
  const companyId = await getCompanyId()

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { plan: true },
  })

  const plan = (company?.plan as PlanId) || 'starter'

  return {
    plan,
    hasAIAssistant: plan === 'pro' || plan === 'enterprise',
    hasAdvancedReports: plan === 'pro' || plan === 'enterprise',
    hasPrioritySupport: plan === 'pro' || plan === 'enterprise',
    hasAPIAccess: plan === 'enterprise',
  }
}

/**
 * Check if the company has access to a specific feature
 */
export async function hasFeatureAccess(feature: keyof PlanFeatures): Promise<boolean> {
  const features = await getCompanyFeatures()
  return features[feature] as boolean
}

/**
 * Get upgrade message for a feature
 */
export function getUpgradeMessage(feature: keyof PlanFeatures): string {
  const messages: Record<string, string> = {
    hasAIAssistant: 'L\'Assistant IA est disponible avec les plans Pro et Enterprise.',
    hasAdvancedReports: 'Les Rapports Avancés sont disponibles avec les plans Pro et Enterprise.',
    hasPrioritySupport: 'Le Support Prioritaire est disponible avec les plans Pro et Enterprise.',
    hasAPIAccess: 'L\'accès API est disponible uniquement avec le plan Enterprise.',
  }
  return messages[feature] || 'Cette fonctionnalité nécessite une mise à niveau de votre abonnement.'
}