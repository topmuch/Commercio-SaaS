'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Search,
  Plus,
  Filter,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/lib/store'
import type { Client, Commercial } from '@/lib/types'

// Format number as CFA Francs
function formatCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' CFA'
}

const typeLabels: Record<string, string> = {
  boutique: 'Boutique',
  revendeur: 'Revendeur',
  supermarche: 'Supermarché',
  grossiste: 'Grossiste',
}

const typeColors: Record<string, string> = {
  boutique: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  revendeur: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  supermarche: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  grossiste: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
}

const statusLabels: Record<string, string> = {
  lead_rouge: 'Lead Rouge',
  negociation_orange: 'Négociation Orange',
  client_vert: 'Client Vert',
}

const statusColors: Record<string, string> = {
  lead_rouge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  negociation_orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  client_vert: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

interface ClientWithRevenue extends Client {
  revenue: number
}

export default function ClientsPage() {
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const setSelectedClient = useAppStore((s) => s.setSelectedClient)

  const [clients, setClients] = useState<ClientWithRevenue[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const limit = 20

  // Dialog state
  const [showNewClient, setShowNewClient] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deleteClient, setDeleteClient] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [commercials, setCommercials] = useState<Commercial[]>([])
  const [newClient, setNewClient] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    region: '',
    sector: '',
    type: 'boutique',
    status: 'client_vert',
    notes: '',
    commercialId: '',
  })

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (regionFilter) params.set('region', regionFilter)
      params.set('page', String(page))
      params.set('limit', String(limit))

      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      setClients(data.clients || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
      if (data.statusCounts) setStatusCounts(data.statusCounts)
    } catch {
      setClients([])
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, typeFilter, regionFilter, page])

  const fetchCommercials = useCallback(async () => {
    try {
      const res = await fetch('/api/commercials')
      if (res.ok) {
        const data = await res.json()
        setCommercials(data.commercials || [])
      }
    } catch {
      // Fallback: empty list
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    fetchCommercials()
  }, [fetchCommercials])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, typeFilter, regionFilter])

  const handleCreateClient = async () => {
    if (!newClient.companyName || !newClient.contactName || !newClient.phone) return
    setCreating(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClient,
          commercialId: newClient.commercialId || null,
        }),
      })
      if (res.ok) {
        toast.success('Client créé avec succès')
        setShowNewClient(false)
        setNewClient({
          companyName: '',
          contactName: '',
          phone: '',
          whatsapp: '',
          email: '',
          address: '',
          city: '',
          region: '',
          sector: '',
          type: 'boutique',
          status: 'client_vert',
          notes: '',
          commercialId: '',
        })
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de la création du client.')
      }
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  const handleEditClient = (client: Client) => {
    setEditingClient(client)
    setNewClient({
      companyName: client.companyName,
      contactName: client.contactName,
      phone: client.phone,
      whatsapp: client.whatsapp || '',
      email: client.email || '',
      address: client.address || '',
      city: client.city || '',
      region: client.region || '',
      sector: client.sector || '',
      type: client.type,
      status: client.status,
      notes: client.notes || '',
      commercialId: client.commercialId || '',
    })
    setShowNewClient(true)
  }

  const handleUpdateClient = async () => {
    if (!editingClient || !newClient.companyName || !newClient.contactName || !newClient.phone) return
    setCreating(true)
    try {
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newClient,
          commercialId: newClient.commercialId || null,
        }),
      })
      if (res.ok) {
        toast.success('Client modifié avec succès')
        setShowNewClient(false)
        setEditingClient(null)
        setNewClient({
          companyName: '',
          contactName: '',
          phone: '',
          whatsapp: '',
          email: '',
          address: '',
          city: '',
          region: '',
          sector: '',
          type: 'boutique',
          status: 'client_vert',
          notes: '',
          commercialId: '',
        })
        fetchClients()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de la modification du client.')
      }
    } catch {
      toast.error('Erreur lors de la modification')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteClient = async () => {
    if (!deleteClient) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/clients/${deleteClient.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Client supprimé avec succès')
        setDeleteClient(null)
        fetchClients()
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
    }
  }

  const handleViewDetail = (clientId: string) => {
    setSelectedClient(clientId)
    setCurrentPage('client-detail')
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Search & Filter Bar */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, téléphone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous</SelectItem>
                  <SelectItem value="lead_rouge">Lead Rouge</SelectItem>
                  <SelectItem value="negociation_orange">Négociation Orange</SelectItem>
                  <SelectItem value="client_vert">Client Vert</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous</SelectItem>
                  <SelectItem value="boutique">Boutique</SelectItem>
                  <SelectItem value="revendeur">Revendeur</SelectItem>
                  <SelectItem value="supermarche">Supermarché</SelectItem>
                  <SelectItem value="grossiste">Grossiste</SelectItem>
                </SelectContent>
              </Select>

              <Select value={regionFilter} onValueChange={(v) => setRegionFilter(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Région" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Toutes</SelectItem>
                  <SelectItem value="Dakar">Dakar</SelectItem>
                  <SelectItem value="Thiès">Thiès</SelectItem>
                  <SelectItem value="Saint-Louis">Saint-Louis</SelectItem>
                  <SelectItem value="Louga">Louga</SelectItem>
                  <SelectItem value="Diourbel">Diourbel</SelectItem>
                  <SelectItem value="Fatick">Fatick</SelectItem>
                  <SelectItem value="Kaolack">Kaolack</SelectItem>
                  <SelectItem value="Kaffrine">Kaffrine</SelectItem>
                  <SelectItem value="Tambacounda">Tambacounda</SelectItem>
                  <SelectItem value="Kolda">Kolda</SelectItem>
                  <SelectItem value="Ziguinchor">Ziguinchor</SelectItem>
                  <SelectItem value="Sédhiou">Sédhiou</SelectItem>
                  <SelectItem value="Kédougou">Kédougou</SelectItem>
                  <SelectItem value="Matam">Matam</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  setSearch('')
                  setStatusFilter('')
                  setTypeFilter('')
                  setRegionFilter('')
                }}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Réinitialiser
              </Button>
            </div>

            {/* New Client Button */}
            <Button
              onClick={() => setShowNewClient(true)}
              className="gap-2 bg-erp-orange hover:bg-erp-orange/90 text-white"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau Client</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-erp-orange/10">
                <Users className="h-5 w-5 text-erp-orange" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {statusCounts['client_vert'] || 0}
                </p>
                <p className="text-xs text-muted-foreground">Clients Verts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {statusCounts['lead_rouge'] || 0}
                </p>
                <p className="text-xs text-muted-foreground">Leads Rouges</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {statusCounts['negociation_orange'] || 0}
                </p>
                <p className="text-xs text-muted-foreground">Négociations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-erp-orange" />
            Liste des Clients
            <Badge variant="secondary" className="ml-auto text-xs">
              {total} résultats
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Users className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">Aucun client trouvé.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => setShowNewClient(true)}
              >
                <Plus className="h-4 w-4" />
                Créer un client
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[200px]">Société</TableHead>
                      <TableHead className="w-[150px]">Responsable</TableHead>
                      <TableHead className="w-[130px]">Téléphone</TableHead>
                      <TableHead className="w-[100px]">Ville</TableHead>
                      <TableHead className="w-[100px]">Type</TableHead>
                      <TableHead className="w-[90px]">Statut</TableHead>
                      <TableHead className="w-[130px]">Commercial</TableHead>
                      <TableHead className="w-[120px] text-right">CA</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleViewDetail(client.id)}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{client.companyName}</span>
                            {client._count && (
                              <span className="text-[11px] text-muted-foreground">
                                {client._count.orders} cmd · {client._count.quotes} devis · {client._count.invoices} fac
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{client.contactName}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            {client.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {client.city || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[11px] font-medium ${typeColors[client.type] || ''}`}
                          >
                            {typeLabels[client.type] || client.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-[11px] font-medium ${statusColors[client.status] || ''}`}
                          >
                            {statusLabels[client.status] || client.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {client.commercial?.name || 'Non assigné'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-medium">
                            {formatCFA(client.revenue)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDetail(client.id)
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditClient(client)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteClient(client)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-2 p-4">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleViewDetail(client.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{client.companyName}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] shrink-0 ${statusColors[client.status] || ''}`}
                        >
                          {statusLabels[client.status] || client.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{client.contactName}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </span>
                        {client.city && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {client.city}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${typeColors[client.type] || ''}`}
                        >
                          {typeLabels[client.type] || client.type}
                        </Badge>
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatCFA(client.revenue)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewDetail(client.id)
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages} ({total} clients)
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (page <= 3) {
                        pageNum = i + 1
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = page - 2 + i
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* New Client Dialog */}
      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-erp-orange" />
              {editingClient ? 'Modifier le Client' : 'Nouveau Client'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="md:col-span-2">
              <Label htmlFor="companyName">Société *</Label>
              <Input
                id="companyName"
                placeholder="Nom de la société"
                value={newClient.companyName}
                onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="contactName">Responsable *</Label>
              <Input
                id="contactName"
                placeholder="Nom du responsable"
                value={newClient.contactName}
                onChange={(e) => setNewClient({ ...newClient, contactName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                placeholder="+221 77 000 00 00"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                placeholder="+221 77 000 00 00"
                value={newClient.whatsapp}
                onChange={(e) => setNewClient({ ...newClient, whatsapp: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemple.com"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={newClient.type}
                onValueChange={(v) => setNewClient({ ...newClient, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boutique">Boutique</SelectItem>
                  <SelectItem value="revendeur">Revendeur</SelectItem>
                  <SelectItem value="supermarche">Supermarché</SelectItem>
                  <SelectItem value="grossiste">Grossiste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                placeholder="Adresse complète"
                value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                placeholder="Ville"
                value={newClient.city}
                onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="region">Région</Label>
              <Input
                id="region"
                placeholder="Région"
                value={newClient.region}
                onChange={(e) => setNewClient({ ...newClient, region: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="sector">Secteur</Label>
              <Input
                id="sector"
                placeholder="Secteur d'activité"
                value={newClient.sector}
                onChange={(e) => setNewClient({ ...newClient, sector: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="status">Statut</Label>
              <Select
                value={newClient.status}
                onValueChange={(v) => setNewClient({ ...newClient, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_vert">Client Vert</SelectItem>
                  <SelectItem value="lead_rouge">Lead Rouge</SelectItem>
                  <SelectItem value="negociation_orange">Négociation Orange</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="commercial">Commercial assigné</Label>
              <Select
                value={newClient.commercialId}
                onValueChange={(v) => setNewClient({ ...newClient, commercialId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Non assigné</SelectItem>
                  {commercials.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Notes sur le client..."
                rows={3}
                value={newClient.notes}
                onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNewClient(false)}
              disabled={creating}
            >
              Annuler
            </Button>
            <Button
              onClick={editingClient ? handleUpdateClient : handleCreateClient}
              disabled={
                creating ||
                !newClient.companyName ||
                !newClient.contactName ||
                !newClient.phone
              }
              className="bg-erp-orange hover:bg-erp-orange/90 text-white"
            >
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingClient ? 'Modifier le client' : 'Créer le client'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteClient} onOpenChange={(open) => { if (!open) setDeleteClient(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment supprimer <strong>{deleteClient?.companyName}</strong> ?
              Cette action est irréversible et supprimera toutes les données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
