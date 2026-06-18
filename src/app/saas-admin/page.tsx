'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Search, TrendingUp, Users, Building2, CreditCard, Loader2, 
  RefreshCw, AlertCircle, CheckCircle, Plus, Ban, Trash2, 
  Settings, MoreHorizontal, MessageCircle, Shield, FileText, Mail,
  Phone, Globe, Image as ImageIcon, Lock, Unlock, X, Bell
} from 'lucide-react'
import { toast } from 'sonner'

interface CompanyData {
  id: string
  name: string
  email: string
  phone: string | null
  plan: string
  status?: 'active' | 'suspended'
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
  const [creating, setCreating] = useState(false)

  // Dialog states
  const [createCompanyDialog, setCreateCompanyDialog] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null)
  const [companyActionDialog, setCompanyActionDialog] = useState<'suspend' | 'activate' | 'delete' | null>(null)

  // New company form
  const [newCompany, setNewCompany] = useState({
    name: '',
    email: '',
    phone: '',
    plan: 'starter' as 'starter' | 'pro' | 'enterprise',
    whatsapp: '',
  })

  // Platform settings
  const [platformSettings, setPlatformSettings] = useState({
    companyName: 'Commercio',
    companyEmail: 'contact@commercio.com',
    companyPhone: '+221 77 123 45 67',
    companyAddress: 'Dakar, Sénégal',
    seoTitle: 'Commercio - ERP CRM Gestion Commerciale',
    seoDescription: 'Solution ERP CRM complète pour la gestion commerciale',
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    emailSignature: '',
    enableEmailNotifications: true,
    enableWhatsAppNotifications: true,
  })

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

  const handleCreateCompany = async () => {
    if (!newCompany.name || !newCompany.email) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/saas/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompany.name,
          email: newCompany.email,
          phone: newCompany.phone,
          plan: newCompany.plan,
          whatsapp: newCompany.whatsapp,
        }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur lors de la création')
      }

      const json = await res.json()
      toast.success('Entreprise créée avec succès')
      
      // Send WhatsApp if number provided
      if (json.data?.accessCode && newCompany.whatsapp) {
        const cleanPhone = newCompany.whatsapp.replace(/[^0-9]/g, '')
        const message = encodeURIComponent(
          `🎉 *Bienvenue sur Commercio!*\n\nBonjour,\n\nVotre compte a été créé avec succès.\n\n📱 *Code d'accès:* ${json.data.accessCode}\n\n🔗 *URL:* ${process.env.NEXTAUTH_URL || 'https://votre-domaine.com'}\n\nVeuillez utiliser ce code pour vous connecter.\n\nCordialement,\nL'équipe Commercio`
        )
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank')
      }

      setNewCompany({ name: '', email: '', phone: '', plan: 'starter', whatsapp: '' })
      setCreateCompanyDialog(false)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  const handleCompanyAction = async (action: 'suspend' | 'activate' | 'delete') => {
    if (!selectedCompany) return

    try {
      const res = await fetch(`/api/saas/admin/companies/${selectedCompany.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur lors de l\'action')
      }

      const messages = {
        suspend: 'Compte suspendu avec succès',
        activate: 'Compte activé avec succès',
        delete: 'Compte supprimé avec succès',
      }

      toast.success(messages[action])
      setCompanyActionDialog(null)
      setSelectedCompany(null)
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    }
  }

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/saas/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(platformSettings),
      })

      if (!res.ok) {
        throw new Error('Erreur lors de la sauvegarde')
      }

      toast.success('Paramètres sauvegardés avec succès')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
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
    const suspendedCompanies = companies.filter((c) => c.status === 'suspended').length

    return {
      totalRevenue,
      activeSubscriptions,
      trialSubscriptions,
      freeSubscriptions,
      suspendedCompanies,
    }
  }

  const stats = getStats()

  const getStatusBadge = (status?: string) => {
    if (!status) {
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Actif</Badge>
    }
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Actif</Badge>
      case 'suspended':
        return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">Suspendu</Badge>
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
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
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
      <div className="grid md:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Entreprises
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{companies.length}</div>
            <p className="text-xs text-slate-400 mt-1">
              {stats.suspendedCompanies} suspendu{stats.suspendedCompanies > 1 ? 's' : ''}
            </p>
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

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardDescription className="text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Statut plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">Opérationnel</div>
            <div className="flex items-center gap-1 mt-1">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              <span className="text-xs text-slate-400">Tous les systèmes OK</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Rechercher une entreprise..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800/50 border-slate-700 text-white"
          />
        </div>
        <Dialog open={createCompanyDialog} onOpenChange={setCreateCompanyDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle entreprise
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle entreprise</DialogTitle>
              <DialogDescription>
                Créez un compte entreprise et envoyez les identifiants via WhatsApp
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Nom de l'entreprise *</Label>
                <Input
                  id="name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="Ex: Boutique Exemple"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newCompany.email}
                  onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                  placeholder="contact@exemple.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={newCompany.phone}
                  onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                  placeholder="+221 77 123 45 67"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp (pour envoi code)</Label>
                <Input
                  id="whatsapp"
                  value={newCompany.whatsapp}
                  onChange={(e) => setNewCompany({ ...newCompany, whatsapp: e.target.value })}
                  placeholder="+221 77 123 45 67"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Le code d'accès sera envoyé via WhatsApp
                </p>
              </div>
              <div>
                <Label htmlFor="plan">Plan initial</Label>
                <Select
                  value={newCompany.plan}
                  onValueChange={(v: 'starter' | 'pro' | 'enterprise') => setNewCompany({ ...newCompany, plan: v })}
                >
                  <SelectTrigger id="plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter (Gratuit)</SelectItem>
                    <SelectItem value="pro">Pro (29 000 FCFA/mois)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (Sur mesure)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateCompanyDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateCompany} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="companies">Entreprises</TabsTrigger>
          <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
          </TabsTrigger>
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
                      <TableHead className="text-slate-300">Statut</TableHead>
                      <TableHead className="text-slate-300">Utilisateurs</TableHead>
                      <TableHead className="text-slate-300">Clients</TableHead>
                      <TableHead className="text-slate-300">Produits</TableHead>
                      <TableHead className="text-slate-300">Commandes</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow key={company.id} className="border-slate-700/50">
                        <TableCell className="text-white font-medium">{company.name}</TableCell>
                        <TableCell className="text-slate-300">{company.email}</TableCell>
                        <TableCell>{getPlanBadge(company.plan)}</TableCell>
                        <TableCell>{getStatusBadge(company.status)}</TableCell>
                        <TableCell className="text-white">{company._count.users}</TableCell>
                        <TableCell className="text-white">{company._count.clients}</TableCell>
                        <TableCell className="text-white">{company._count.products}</TableCell>
                        <TableCell className="text-white">{company._count.orders}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {company.status !== 'suspended' ? (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-400"
                                onClick={() => {
                                  setSelectedCompany(company)
                                  setCompanyActionDialog('suspend')
                                }}
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 hover:bg-emerald-500/10 hover:text-emerald-400"
                                onClick={() => {
                                  setSelectedCompany(company)
                                  setCompanyActionDialog('activate')
                                }}
                              >
                                <Unlock className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 hover:bg-red-500/10 hover:text-red-400"
                              onClick={() => {
                                setSelectedCompany(company)
                                setCompanyActionDialog('delete')
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Company Info */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Informations de l'entreprise
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Paramètres globaux de la plateforme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Nom de la société</Label>
                  <Input
                    id="companyName"
                    value={platformSettings.companyName}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, companyName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="companyEmail">Email de contact</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={platformSettings.companyEmail}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, companyEmail: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="companyPhone">Téléphone</Label>
                  <Input
                    id="companyPhone"
                    value={platformSettings.companyPhone}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, companyPhone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="companyAddress">Adresse</Label>
                  <Textarea
                    id="companyAddress"
                    value={platformSettings.companyAddress}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, companyAddress: e.target.value })}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* SEO Settings */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  SEO
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Optimisation pour les moteurs de recherche
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="seoTitle">Titre SEO</Label>
                  <Input
                    id="seoTitle"
                    value={platformSettings.seoTitle}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, seoTitle: e.target.value })}
                    placeholder="Titre de votre page"
                  />
                </div>
                <div>
                  <Label htmlFor="seoDescription">Description SEO</Label>
                  <Textarea
                    id="seoDescription"
                    value={platformSettings.seoDescription}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, seoDescription: e.target.value })}
                    rows={3}
                    placeholder="Description pour les résultats de recherche"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Email Settings */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Configuration Email
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Paramètres SMTP pour l'envoi d'emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="smtpHost">Serveur SMTP</Label>
                  <Input
                    id="smtpHost"
                    value={platformSettings.smtpHost}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, smtpHost: e.target.value })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpPort">Port SMTP</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={platformSettings.smtpPort}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, smtpPort: e.target.value })}
                    placeholder="587"
                  />
                </div>
                <div>
                  <Label htmlFor="smtpUser">Utilisateur SMTP</Label>
                  <Input
                    id="smtpUser"
                    value={platformSettings.smtpUser}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, smtpUser: e.target.value })}
                    placeholder="votre@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="emailSignature">Signature email</Label>
                  <Textarea
                    id="emailSignature"
                    value={platformSettings.emailSignature}
                    onChange={(e) => setPlatformSettings({ ...platformSettings, emailSignature: e.target.value })}
                    rows={3}
                    placeholder="Cordialement,\nL'équipe Commercio"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Gestion des notifications automatiques
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifications par email</Label>
                    <p className="text-xs text-slate-400">Envoyer les notifications par email</p>
                  </div>
                  <Switch
                    checked={platformSettings.enableEmailNotifications}
                    onCheckedChange={(checked) => setPlatformSettings({ ...platformSettings, enableEmailNotifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifications WhatsApp</Label>
                    <p className="text-xs text-slate-400">Envoyer les notifications via WhatsApp</p>
                  </div>
                  <Switch
                    checked={platformSettings.enableWhatsAppNotifications}
                    onCheckedChange={(checked) => setPlatformSettings({ ...platformSettings, enableWhatsAppNotifications: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} className="gap-2">
              <CheckCircle className="w-4 h-4" />
              Sauvegarder les paramètres
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Company Action Dialog */}
      <Dialog open={!!companyActionDialog} onOpenChange={() => setCompanyActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {companyActionDialog === 'suspend' && 'Suspendre le compte'}
              {companyActionDialog === 'activate' && 'Activer le compte'}
              {companyActionDialog === 'delete' && 'Supprimer le compte'}
            </DialogTitle>
            <DialogDescription>
              {companyActionDialog === 'suspend' && (
                <span>
                  Êtes-vous sûr de vouloir suspendre le compte de <strong>{selectedCompany?.name}</strong>?
                  <br />
                  L'accès sera bloqué pour tous les utilisateurs de cette entreprise.
                </span>
              )}
              {companyActionDialog === 'activate' && (
                <span>
                  Voulez-vous réactiver le compte de <strong>{selectedCompany?.name}</strong>?
                </span>
              )}
              {companyActionDialog === 'delete' && (
                <span className="text-red-400">
                  ⚠️ Cette action est irréversible. Êtes-vous sûr de vouloir supprimer le compte de <strong>{selectedCompany?.name}</strong>?
                  <br />
                  Toutes les données seront perdues.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompanyActionDialog(null)}>
              Annuler
            </Button>
            <Button
              variant={companyActionDialog === 'delete' ? 'destructive' : 'default'}
              onClick={() => companyActionDialog && handleCompanyAction(companyActionDialog)}
            >
              {companyActionDialog === 'suspend' && (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Suspendre
                </>
              )}
              {companyActionDialog === 'activate' && (
                <>
                  <Unlock className="w-4 h-4 mr-2" />
                  Activer
                </>
              )}
              {companyActionDialog === 'delete' && (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}