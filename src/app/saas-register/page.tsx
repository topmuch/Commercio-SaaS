'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Check, X, Loader2, ArrowLeft } from 'lucide-react'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '0 FCFA',
    features: ['3 utilisateurs', '50 clients', '200 produits', 'Carte territoriale', 'Boutique WhatsApp'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '29 000 FCFA/mois',
    features: ['15 utilisateurs', 'Clients illimités', '2000 produits', 'Rapports avancés', 'IA Assistant', 'Support prioritaire'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Sur mesure',
    features: ['Utilisateurs illimités', 'Tout du Pro +', 'API access', 'Intégrations personnalisées', 'Account manager dédié'],
  },
]

export default function SaasRegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') || 'starter'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(planParam)
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/saas/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          address: formData.address,
          plan: selectedPlan,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'inscription')
      }

      // Rediriger vers la page de login avec succès
      router.push('/login?registered=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">Créer votre compte</h1>
          <p className="text-slate-400">Rejoignez Commercio et gérez votre entreprise efficacement</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Formulaire d'inscription */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Informations de l'entreprise</CardTitle>
                <CardDescription className="text-slate-400">
                  Remplissez les informations pour créer votre compte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="text-slate-300">Nom de l'entreprise *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        required
                        placeholder="Ma Société SARL"
                        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-300">Email de l'entreprise *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="contact@masociete.com"
                        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-slate-300">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+221 77 000 00 00"
                        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-slate-300">Adresse</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Dakar, Sénégal"
                        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-300">Mot de passe *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        placeholder="••••••••"
                        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-slate-300">Confirmer le mot de passe *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                        placeholder="••••••••"
                        className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="pt-4">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Création en cours...
                        </>
                      ) : (
                        'Créer mon compte'
                      )}
                    </Button>
                  </div>

                  <p className="text-center text-slate-400 text-sm">
                    Déjà inscrit?{' '}
                    <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
                      Se connecter
                    </Link>
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sélection du plan */}
          <div>
            <Card className="bg-slate-800/50 border-slate-700 sticky top-4">
              <CardHeader>
                <CardTitle className="text-white">Choisissez votre plan</CardTitle>
                <CardDescription className="text-slate-400">
                  Sélectionnez le plan adapté à vos besoins
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup value={selectedPlan} onValueChange={setSelectedPlan}>
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                          selectedPlan === plan.id
                            ? 'border-emerald-500 bg-emerald-500/10'
                            : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" />
                        <Label htmlFor={plan.id} className="cursor-pointer">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-white">{plan.name}</h3>
                            <span className="text-emerald-400 font-medium">{plan.price}</span>
                          </div>
                          <ul className="space-y-1">
                            {plan.features.map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                                <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}