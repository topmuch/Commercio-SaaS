'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, TrendingUp, Users, Building2, CreditCard, Loader2, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'

interface CompanyData {
  id: string
  name: string
  email: string
  plan: string
  createdAt: string
  _count: {
    users: number
    clients: number
    products: number
    orders: number
  }
}

interface SubscriptionData {
  id: string
  plan: string
  status: string
  startDate: string
  endDate: string | null
  company: {
    id: string
    name: string
    email: string
  }
}

export default function SaasAdminPage() {
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<CompanyData[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('companies')
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError('')

    try {
      const [companiesRes, subscriptionsRes] = await Promise.all([
        fetch('/api/saas/admin/companies'),
        fetch('/api/saas/admin/subscriptions'),
      ])

      if (!companiesRes.ok || !subscriptionsRes.ok) {
        throw new Error('Erreur lors du chargement des données')
      }

      const companiesData = await companiesRes.json()
      const subscriptionsData = await subscriptionsRes.json()

      setCompanies(companiesData.data || [])
      setSubscriptions(subscriptionsData.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const filteredCompanies = companies.filter(
    (company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredSubscriptions = subscriptions.filter((sub) =>
    sub.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.company.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStats = () => {
    const totalRevenue = subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => {
        if (s.plan === 'pro') return sum + 29000
        return sum
      }, 0)

    const activeSubscriptions = subscriptions.filter((s) => s.status === 'active').length
    const trialSubscriptions = subscriptions.filter(
      (s) => s.status === 'active' && s.plan === 'pro'
    ).length
    const freeSubscriptions = subscriptions.filter((s) => s.plan === 'starter').length

    return {
      totalRevenue,
      activeSubscriptions,
      trialSubscriptions,
      freeSubscriptions,
    }
  }

  const stats = getStats()

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Actif</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Annulé</Badge>
      case 'suspended':
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Suspendu</Badge>
      case 'past_due':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">En retard</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'starter':
        return <Badge variant="secondary">Starter</Badge>
      case 'pro':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Pro</Badge>
      case 'enterprise':
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Enterprise</Badge>
      default:
        return <Badge>{plan}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">SaaS Admin Dashboard</h1>
          <p className="text-slate-400">Gestion des tenants et abonnements</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Entreprises
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{companies.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Abonnements actifs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.activeSubscriptions}</div>
            <p className="text-sm text-slate-400 mt-1">
              {stats.freeSubscriptions} gratuits, {stats.trialSubscriptions} essais
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Revenus mensuels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalRevenue.toLocaleString()} FCFA</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Utilisateurs totaux
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {companies.reduce((sum, c) => sum + c._count.users, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Rechercher une entreprise..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-slate-800/50 border-slate-700 text-white"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="companies">Entreprises</TabsTrigger>
          <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
        </TabsList>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Liste des entreprises</CardTitle>
              <CardDescription className="text-slate-400">
                {filteredCompanies.length} entreprise{filteredCompanies.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Entreprise</TableHead>
                      <TableHead className="text-slate-300">Email</TableHead>
                      <TableHead className="text-slate-300">Plan</TableHead>
                      <TableHead className="text-slate-300">Utilisateurs</TableHead>
                      <TableHead className="text-slate-300">Clients</TableHead>
                      <TableHead className="text-slate-300">Produits</TableHead>
                      <TableHead className="text-slate-300">Commandes</TableHead>
                      <TableHead className="text-slate-300">Créé le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow key={company.id} className="border-slate-700/50">
                        <TableCell className="text-white font-medium">{company.name}</TableCell>
                        <TableCell className="text-slate-300">{company.email}</TableCell>
                        <TableCell>{getPlanBadge(company.plan)}</TableCell>
                        <TableCell className="text-white">{company._count.users}</TableCell>
                        <TableCell className="text-white">{company._count.clients}</TableCell>
                        <TableCell className="text-white">{company._count.products}</TableCell>
                        <TableCell className="text-white">{company._count.orders}</TableCell>
                        <TableCell className="text-slate-400">
                          {new Date(company.createdAt).toLocaleDateString('fr-FR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Liste des abonnements</CardTitle>
              <CardDescription className="text-slate-400">
                {filteredSubscriptions.length} abonnement{filteredSubscriptions.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Entreprise</TableHead>
                      <TableHead className="text-slate-300">Email</TableHead>
                      <TableHead className="text-slate-300">Plan</TableHead>
                      <TableHead className="text-slate-300">Statut</TableHead>
                      <TableHead className="text-slate-300">Date de début</TableHead>
                      <TableHead className="text-slate-300">Date de fin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((sub) => (
                      <TableRow key={sub.id} className="border-slate-700/50">
                        <TableCell className="text-white font-medium">{sub.company.name}</TableCell>
                        <TableCell className="text-slate-300">{sub.company.email}</TableCell>
                        <TableCell>{getPlanBadge(sub.plan)}</TableCell>
                        <TableCell>{getStatusBadge(sub.status)}</TableCell>
                        <TableCell className="text-slate-400">
                          {new Date(sub.startDate).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {sub.endDate ? new Date(sub.endDate).toLocaleDateString('fr-FR') : '∞'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}