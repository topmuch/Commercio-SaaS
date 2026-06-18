'use client'

import React, { useState, useEffect } from 'react'
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  Send,
  ShieldAlert,
  Ban,
  Trash2,
  CheckCircle,
  Loader2,
  RefreshCw,
  Users,
  ShoppingBag,
  FileText,
  Receipt,
  MessageSquare,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Company {
  id: string
  name: string
  email: string
  phone: string | null
  whatsapp: string | null
  address: string | null
  plan: string
  status: string
  createdAt: string
  updatedAt: string
  _count: {
    users: number
    clients: number
    orders: number
    quotes: number
    invoices: number
  }
}

const statusLabels: Record<string, string> = {
  active: 'Actif',
  suspended: 'Suspendu',
  deleted: 'Supprimé',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const planLabels: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Entreprise',
}

export default function SuperAdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    plan: 'starter',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    sendWhatsApp: true,
  })

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      const statusParam = statusFilter !== 'all' ? statusFilter : ''
      const res = await fetch(`/api/super-admin/companies?status=${statusParam}`)
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.companies)
      }
    } catch (error) {
      console.error('Error fetching companies:', error)
      toast.error('Erreur lors du chargement des entreprises')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [statusFilter])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchCompanies()
    setRefreshing(false)
    toast.success('Liste actualisée')
  }

  const handleCreateCompany = async () => {
    try {
      const res = await fetch('/api/super-admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('Entreprise créée avec succès!')

        // Open WhatsApp link if requested
        if (data.whatsappLink) {
          window.open(data.whatsappLink, '_blank')
        }

        setCreateDialogOpen(false)
        setFormData({
          name: '',
          email: '',
          phone: '',
          whatsapp: '',
          address: '',
          plan: 'starter',
          adminName: '',
          adminEmail: '',
          adminPassword: '',
          sendWhatsApp: true,
        })
        fetchCompanies()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Erreur lors de la création')
      }
    } catch (error) {
      console.error('Error creating company:', error)
      toast.error('Erreur lors de la création')
    }
  }

  const handleUpdateStatus = async (companyId: string, status: string) => {
    try {
      const res = await fetch(`/api/super-admin/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (res.ok) {
        toast.success(`Entreprise ${status === 'active' ? 'activée' : 'suspendue'} avec succès`)
        fetchCompanies()
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Error updating company:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return

    try {
      const res = await fetch(`/api/super-admin/companies/${selectedCompany.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Entreprise supprimée avec succès')
        setDeleteDialogOpen(false)
        setSelectedCompany(null)
        fetchCompanies()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Error deleting company:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleSendAccessCode = async (company: Company) => {
    if (!company.whatsapp) {
      toast.error('Aucun numéro WhatsApp configuré')
      return
    }

    setSendingWhatsApp(company.id)
    try {
      const message = `Bonjour, voici vos informations de connexion pour ${company.name}.`
      const whatsappLink = `https://wa.me/${company.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`

      window.open(whatsappLink, '_blank')
      toast.success('Ouvert dans WhatsApp')
    } catch (error) {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSendingWhatsApp(null)
    }
  }

  const filteredCompanies = companies.filter((company) => {
    const query = searchQuery.toLowerCase()
    return (
      company.name.toLowerCase().includes(query) ||
      company.email.toLowerCase().includes(query) ||
      (company.phone && company.phone.includes(query))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Entreprises</h1>
          <p className="text-muted-foreground">Gérez toutes les entreprises de la plateforme</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle Entreprise
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email, téléphone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="suspended">Suspendus</SelectItem>
                <SelectItem value="deleted">Supprimés</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Entreprises ({filteredCompanies.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Building2 className="h-10 w-10 mb-3 opacity-30" />
              <p>Aucune entreprise trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Utilisateurs</TableHead>
                    <TableHead className="text-right">Clients</TableHead>
                    <TableHead className="text-right">Commandes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-sm text-muted-foreground">{company.email}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{company.phone || '-'}</div>
                      </TableCell>
                      <TableCell>
                        {company.whatsapp ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                            onClick={() => handleSendAccessCode(company)}
                            disabled={sendingWhatsApp === company.id}
                          >
                            {sendingWhatsApp === company.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            <span className="hidden sm:inline">Envoyer</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{planLabels[company.plan] || company.plan}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[company.status] || ''}>
                          {statusLabels[company.status] || company.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 text-sm">
                          <Users className="h-3.5 w-3.5" />
                          {company._count.users}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{company._count.clients}</TableCell>
                      <TableCell className="text-right">{company._count.orders}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {company.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                              onClick={() => handleUpdateStatus(company.id, 'suspended')}
                              title="Suspendre"
                            >
                              <Ban className="h-4 w-4 text-amber-600" />
                            </Button>
                          )}
                          {company.status === 'suspended' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-green-50 dark:hover:bg-green-900/20"
                              onClick={() => handleUpdateStatus(company.id, 'active')}
                              title="Réactiver"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => {
                              setSelectedCompany(company)
                              setDeleteDialogOpen(true)
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Company Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une Nouvelle Entreprise</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l'entreprise *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Mon Entreprise SARL"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email de l'entreprise *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contact@entreprise.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+221 77 123 45 67"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp (pour envoi code)</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  placeholder="+221 77 123 45 67"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Rue du Commerce, Dakar, Sénégal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan">Plan *</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value) => setFormData({ ...formData, plan: value })}
                >
                  <SelectTrigger id="plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Entreprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4">Administrateur Principal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Nom complet *</Label>
                  <Input
                    id="adminName"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    placeholder="admin@entreprise.com"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="adminPassword">Mot de passe *</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    placeholder="Mot de passe"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sendWhatsApp"
                checked={formData.sendWhatsApp}
                onChange={(e) => setFormData({ ...formData, sendWhatsApp: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="sendWhatsApp" className="cursor-pointer">
                Envoyer le code d'accès par WhatsApp
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCompany}>
              Créer l'Entreprise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'entreprise "{selectedCompany?.name}" ? Cette action désactivera l'entreprise et tous ses utilisateurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCompany} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}