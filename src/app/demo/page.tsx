'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LayoutDashboard, Eye, Shield, Clock } from 'lucide-react'

const features = [
  {
    icon: Eye,
    title: 'Exploration libre',
    description: 'Parcourez toutes les fonctionnalités sans engagement.',
  },
  {
    icon: Shield,
    title: 'Aucun risque',
    description: 'Aucune carte bancaire requise. Données simulées.',
  },
  {
    icon: Clock,
    title: 'Disponible 24/7',
    description: 'Accédez à la démo à tout moment, jour et nuit.',
  },
]

export default function DemoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/20 px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-0.5 hover:opacity-80 transition-opacity">
            <span className="text-3xl font-bold text-emerald-400">Teranga</span>
            <span className="text-3xl font-bold text-amber-400">Biz</span>
          </Link>
          <p className="mt-2 text-slate-400 text-sm">
            Découvrez Teranga Biz en action
          </p>
        </div>

        {/* Demo Card */}
        <Card className="bg-slate-900/50 border border-slate-800 rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-slate-50 text-center">Mode Démo</CardTitle>
            <CardDescription className="text-slate-400 text-center">
              Explorez le tableau de bord avec des données simulées. Aucune inscription requise.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Features */}
            <div className="space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-800"
                >
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <feature.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{feature.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link href="/dashboard" className="block">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-11 rounded-lg">
                <LayoutDashboard className="h-4 w-4" />
                Accéder au tableau de bord
              </Button>
            </Link>

            {/* Links */}
            <div className="text-center space-y-3 pt-2">
              <p className="text-slate-400 text-sm">
                Prêt à commencer ?{' '}
                <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                  Créer un compte gratuit
                </Link>
              </p>
              <div className="pt-3 border-t border-slate-800">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour à l&apos;accueil
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          © 2025 Teranga Biz — DistribuSN, Dakar, Sénégal
        </p>
      </div>
    </div>
  )
}
