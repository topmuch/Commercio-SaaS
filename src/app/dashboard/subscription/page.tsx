'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, X, ArrowUpRight, CreditCard, TrendingUp, Users, ShoppingBag, Package, AlertCircle, Loader2 } from 'lucide-react'
import { SAAS_PLANS } from '@/lib/saas-plans'

interface SubscriptionData {
  subscription: any
  company: { plan: string }
  usage: { users: number; clients: number; products: number }
  limits: { users: number; clients: number; products: number }
}

export default function SubscriptionPage() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    try {
      const response = await fetch('/api/saas/subscription')
      if (!response.ok) throw new Error('Erreur lors du chargement')
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async (planId: string) => {
    if (planId === data?.company.plan) return

    setUpgrading(true)
    setError('')

    try {
      const response = await fetch('/api/saas/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Erreur lors de la mise à niveau')
      }

      const result = await response.json()

      // If checkout URL returned, redirect to payment
      if (result.data?.checkout_url) {
        window.location.href = result.data.checkout_url
      } else {
        // Demo mode, reload data
        await loadSubscriptionData()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setUpgrading(false)
    }
  }

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0 // Unlimited
    return Math.min((current / max) * 100, 100)
  }

  const getUsageColor = (current: number, max: number) => {
    const percentage = getUsagePercentage(current, max)
    if (percentage >= 90) return 'text-red-400'
    if (percentage >= 70) return 'text-amber-400'
    return 'text-emerald-400'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  const currentPlan = data?.company.plan || 'starter'
  const currentPlanConfig = SAAS_PLANS[currentPlan as keyof typeof SAAS_PLANS]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Gestion de l'abonnement</h1>
        <p className="text-slate-400">Gérez votre plan et votre utilisation</p>
      </div>

      {/* Payment Success/Error Messages */}
      {success && (
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <Check className="w-5 h-5" />
              <p>Paiement réussi! Votre abonnement a été activé.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {canceled && (
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertCircle className="w-5 h-5" />
              <p>Paiement annulé. Vous pouvez essayer à nouveau.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="current" className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="current">Abonnement actuel</TabsTrigger>
          <TabsTrigger value="usage">Utilisation</TabsTrigger>
          <TabsTrigger value="plans">Plans et tarifs</TabsTrigger>
        </TabsList>

        {/* Current Plan Tab */}
        <TabsContent value="current" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Votre plan actuel</CardTitle>
              <CardDescription className="text-slate-400">
                {currentPlanConfig.name} - {currentPlanConfig.price === 0 ? 'Gratuit' : `${currentPlanConfig.price.toLocaleString()} FCFA/${currentPlanConfig.billingPeriod}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Users className="w-4 h-4" />
                    Utilisateurs
                  </div>
                  <div className={`text-2xl font-bold ${getUsageColor(data?.usage.users || 0, data?.limits.users || 0)}`}>
                    {data?.usage.users || 0} / {data?.limits.users === -1 ? '∞' : data?.limits.users}
                  </div>
                  {data?.limits.users !== -1 && (
                    <Progress value={getUsagePercentage(data?.usage.users || 0, data?.limits.users || 0)} className="h-2" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <ShoppingBag className="w-4 h-4" />
                    Clients
                  </div>
                  <div className={`text-2xl font-bold ${getUsageColor(data?.usage.clients || 0, data?.limits.clients || 0)}`}>
                    {data?.usage.clients || 0} / {data?.limits.clients === -1 ? '∞' : data?.limits.clients}
                  </div>
                  {data?.limits.clients !== -1 && (
                    <Progress value={getUsagePercentage(data?.usage.clients || 0, data?.limits.clients || 0)} className="h-2" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Package className="w-4 h-4" />
                    Produits
                  </div>
                  <div className={`text-2xl font-bold ${getUsageColor(data?.usage.products || 0, data?.limits.products || 0)}`}>
                    {data?.usage.products || 0} / {data?.limits.products === -1 ? '∞' : data?.limits.products}
                  </div>
                  {data?.limits.products !== -1 && (
                    <Progress value={getUsagePercentage(data?.usage.products || 0, data?.limits.products || 0)} className="h-2" />
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Statut</span>
                  <Badge className={data?.subscription?.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
                    {data?.subscription?.status === 'active' ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                {data?.subscription?.trialEndDate && data?.subscription.trialEndDate > new Date() && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-slate-400">Période d'essai</span>
                    <span className="text-sm text-amber-400">
                      Jusqu'au {new Date(data.subscription.trialEndDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Utilisation détaillée</CardTitle>
              <CardDescription className="text-slate-400">
                Aperçu de votre utilisation actuelle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { label: 'Utilisateurs', icon: Users, current: data?.usage.users || 0, max: data?.limits.users || 0 },
                  { label: 'Clients', icon: ShoppingBag, current: data?.usage.clients || 0, max: data?.limits.clients || 0 },
                  { label: 'Produits', icon: Package, current: data?.usage.products || 0, max: data?.limits.products || 0 },
                ].map((item) => {
                  const Icon = item.icon
                  const percentage = getUsagePercentage(item.current, item.max)
                  const isNearLimit = item.max !== -1 && percentage >= 90

                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isNearLimit ? 'text-red-400' : 'text-slate-400'}`} />
                          <span className="text-sm text-slate-300">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isNearLimit ? 'text-red-400' : 'text-white'}`}>
                            {item.current} / {item.max === -1 ? '∞' : item.max}
                          </span>
                          {isNearLimit && (
                            <Badge variant="destructive" className="text-xs">
                              Limite atteinte
                            </Badge>
                          )}
                        </div>
                      </div>
                      {item.max !== -1 && (
                        <Progress value={percentage} className="h-2" />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            {Object.values(SAAS_PLANS).map((plan) => (
              <Card
                key={plan.id}
                className={`bg-slate-800/50 border-2 ${
                  currentPlan === plan.id
                    ? 'border-emerald-500 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-700'
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-white">{plan.displayName}</CardTitle>
                    {currentPlan === plan.id && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        Actuel
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-slate-400">
                    {plan.price === 0 ? 'Gratuit' : `${plan.price.toLocaleString()} FCFA/${plan.billingPeriod}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={currentPlan === plan.id || upgrading}
                    className={`w-full ${
                      currentPlan === plan.id
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {upgrading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Traitement...
                      </>
                    ) : currentPlan === plan.id ? (
                      'Plan actuel'
                    ) : (
                      <>
                        Mettre à niveau
                        <ArrowUpRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}