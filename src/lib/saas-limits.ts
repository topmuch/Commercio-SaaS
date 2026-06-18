import { db } from '@/lib/db'
import { getPlanLimits, isPlanUnlimited } from '@/lib/saas-plans'
import { getCompanyId } from '@/lib/auth'

/**
 * Vérifie si l'entreprise a atteint la limite d'utilisateurs
 */
export async function checkUserLimit(): Promise<{ allowed: boolean; current: number; max: number }> {
  try {
    const companyId = await getCompanyId()
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    })

    if (!company) {
      return { allowed: false, current: 0, max: 0 }
    }

    const limits = getPlanLimits(company.plan)

    // Si illimité, autoriser
    if (isPlanUnlimited(company.plan, 'users')) {
      return { allowed: true, current: 0, max: -1 }
    }

    // Compter les utilisateurs actifs
    const current = await db.user.count({
      where: { companyId, active: true },
    })

    return {
      allowed: current < limits.maxUsers,
      current,
      max: limits.maxUsers,
    }
  } catch (error) {
    console.error('[checkUserLimit] Error:', error)
    return { allowed: false, current: 0, max: 0 }
  }
}

/**
 * Vérifie si l'entreprise a atteint la limite de clients
 */
export async function checkClientLimit(): Promise<{ allowed: boolean; current: number; max: number }> {
  try {
    const companyId = await getCompanyId()
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    })

    if (!company) {
      return { allowed: false, current: 0, max: 0 }
    }

    const limits = getPlanLimits(company.plan)

    // Si illimité, autoriser
    if (isPlanUnlimited(company.plan, 'clients')) {
      return { allowed: true, current: 0, max: -1 }
    }

    // Compter les clients
    const current = await db.client.count({
      where: { companyId },
    })

    return {
      allowed: current < limits.maxClients,
      current,
      max: limits.maxClients,
    }
  } catch (error) {
    console.error('[checkClientLimit] Error:', error)
    return { allowed: false, current: 0, max: 0 }
  }
}

/**
 * Vérifie si l'entreprise a atteint la limite de produits
 */
export async function checkProductLimit(): Promise<{ allowed: boolean; current: number; max: number }> {
  try {
    const companyId = await getCompanyId()
    const company = await db.company.findUnique({
      where: { id: companyId },
      select: { plan: true },
    })

    if (!company) {
      return { allowed: false, current: 0, max: 0 }
    }

    const limits = getPlanLimits(company.plan)

    // Si illimité, autoriser
    if (isPlanUnlimited(company.plan, 'products')) {
      return { allowed: true, current: 0, max: -1 }
    }

    // Compter les produits actifs
    const current = await db.product.count({
      where: { companyId, status: 'active' },
    })

    return {
      allowed: current < limits.maxProducts,
      current,
      max: limits.maxProducts,
    }
  } catch (error) {
    console.error('[checkProductLimit] Error:', error)
    return { allowed: false, current: 0, max: 0 }
  }
}

/**
 * Vérifie toutes les limites du plan
 */
export async function checkAllLimits() {
  const [users, clients, products] = await Promise.all([
    checkUserLimit(),
    checkClientLimit(),
    checkProductLimit(),
  ])

  return {
    users,
    clients,
    products,
  }
}

/**
 * Vérifie si l'abonnement de l'entreprise est actif et valide
 */
export async function checkSubscriptionStatus(): Promise<{
  active: boolean
  inTrial: boolean
  trialDaysLeft: number
  subscriptionEndDate: Date | null
  needsPayment: boolean
}> {
  try {
    const companyId = await getCompanyId()
    const subscription = await db.subscription.findFirst({
      where: { companyId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    })

    if (!subscription) {
      return {
        active: false,
        inTrial: false,
        trialDaysLeft: 0,
        subscriptionEndDate: null,
        needsPayment: false,
      }
    }

    const now = new Date()
    const inTrial = subscription.trialEndDate && subscription.trialEndDate > now
    const trialDaysLeft = subscription.trialEndDate
      ? Math.ceil((subscription.trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0
    const subscriptionEndDate = subscription.endDate
    const isExpired = subscription.endDate && subscription.endDate < now
    const isFreePlan = subscription.plan === 'starter'

    return {
      active: !isExpired,
      inTrial: !!inTrial,
      trialDaysLeft,
      subscriptionEndDate,
      needsPayment: !isFreePlan && isExpired,
    }
  } catch (error) {
    console.error('[checkSubscriptionStatus] Error:', error)
    return {
      active: false,
      inTrial: false,
      trialDaysLeft: 0,
      subscriptionEndDate: null,
      needsPayment: false,
    }
  }
}

/**
 * Génère un message d'erreur en cas de dépassement de limite
 */
export function getLimitErrorMessage(type: 'users' | 'clients' | 'products', current: number, max: number): string {
  const messages = {
    users: `Vous avez atteint la limite de ${max} utilisateurs. Veuillez mettre à niveau votre plan.`,
    clients: `Vous avez atteint la limite de ${max} clients. Veuillez mettre à niveau votre plan.`,
    products: `Vous avez atteint la limite de ${max} produits. Veuillez mettre à niveau votre plan.`,
  }
  return messages[type]
}