'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  PhoneCall,
  FileText,
  ShoppingCart,
  Receipt,
  Calendar,
  Clock,
  Save,
  Loader2,
  Building2,
  User,
  Globe,
  Package,
  Users,
  CreditCard,
  MessageCircle,
  StickyNote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useAppStore } from '@/lib/store'
import type { Client, Order, Quote, Invoice, Visit, Discussion, Payment } from '@/lib/types'

function formatCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' CFA'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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
  new: 'Nouvelle',
  validated: 'Validée',
  preparation: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  refused: 'Refusé',
  paid: 'Payée',
  partially_paid: 'Partiellement payée',
  unpaid: 'Non payée',
  overdue: 'En retard',
  planned: 'Planifiée',
  completed: 'Terminée',
  cancelled: 'Annulée',
  message: 'Message',
  call: 'Appel',
  note: 'Note',
  whatsapp: 'WhatsApp',
  incoming: 'Entrant',
  outgoing: 'Sortant',
  pending: 'En attente',
  failed: 'Échoué',
}

const orderStatusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  validated: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  preparation: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

const quoteStatusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  sent: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  refused: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

const invoiceStatusColors: Record<string, string> = {
  paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  partially_paid: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  overdue: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

const discussionTypeIcon: Record<string, React.ReactNode> = {
  message: <MessageSquare className="h-3.5 w-3.5" />,
  call: <PhoneCall className="h-3.5 w-3.5" />,
  note: <StickyNote className="h-3.5 w-3.5" />,
  whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
}

interface ClientStats {
  totalRevenue: number
  totalPaid: number
  totalOrdersRevenue: number
  totalQuotesValue: number
  totalPayments: number
  ordersCount: number
  quotesCount: number
  invoicesCount: number
  visitsCount: number
  discussionsCount: number
  paymentsCount: number
}

interface ClientDetailData extends Omit<Client, 'commercial'> {
  commercial: {
    id: string
    name: string
    email: string
    phone?: string
    role: string
  } | null
  orders: Order[]
  quotes: Quote[]
  invoices: Invoice[]
  visits: Visit[]
  discussions: Discussion[]
  payments: Payment[]
  stats: ClientStats
}

export default function ClientDetail() {
  const selectedClientId = useAppStore((s) => s.selectedClientId)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  const [client, setClient] = useState<ClientDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const fetchClient = useCallback(async () => {
    if (!selectedClientId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${selectedClientId}`)
      if (res.ok) {
        const data = await res.json()
        setClient(data.client)
        setNotes(data.client.notes || '')
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false)
    }
  }, [selectedClientId])

  useEffect(() => {
    fetchClient()
  }, [fetchClient])

  const handleSaveNotes = async () => {
    if (!selectedClientId) return
    setSavingNotes(true)
    try {
      await fetch(`/api/clients/${selectedClientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
    } catch {
      // Error handled silently
    } finally {
      setSavingNotes(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement du client...</span>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Users className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">Client non trouvé.</p>
        <Button variant="outline" className="mt-4" onClick={() => setCurrentPage('clients')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à la liste
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage('clients')}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{client.companyName}</h2>
          <p className="text-sm text-muted-foreground">{client.contactName}</p>
        </div>
        <Badge
          variant="secondary"
          className={statusLabels[client.status] ? (client.status === 'client_vert' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : client.status === 'lead_rouge' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400') : ''}
        >
          {statusLabels[client.status] || client.status}
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-erp-orange/10">
                <ShoppingCart className="h-4 w-4 text-erp-orange" />
              </div>
              <div>
                <p className="text-lg font-bold">{client.stats.ordersCount}</p>
                <p className="text-[10px] text-muted-foreground">Commandes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-sky-100 dark:bg-sky-900/20">
                <FileText className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{client.stats.quotesCount}</p>
                <p className="text-[10px] text-muted-foreground">Devis</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-violet-100 dark:bg-violet-900/20">
                <Receipt className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{client.stats.invoicesCount}</p>
                <p className="text-[10px] text-muted-foreground">Factures</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-green-100 dark:bg-green-900/20">
                <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCFA(client.stats.totalRevenue)}</p>
                <p className="text-[10px] text-muted-foreground">CA Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/20">
                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{client.stats.visitsCount}</p>
                <p className="text-[10px] text-muted-foreground">Visites</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-rose-100 dark:bg-rose-900/20">
                <MessageSquare className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{client.stats.discussionsCount}</p>
                <p className="text-[10px] text-muted-foreground">Discussions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
            <Building2 className="h-3.5 w-3.5 hidden sm:block" />
            Vue d&apos;ensemble
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1.5 text-xs sm:text-sm">
            <ShoppingCart className="h-3.5 w-3.5 hidden sm:block" />
            Commandes
          </TabsTrigger>
          <TabsTrigger value="quotes" className="gap-1.5 text-xs sm:text-sm">
            <FileText className="h-3.5 w-3.5 hidden sm:block" />
            Devis
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1.5 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5 hidden sm:block" />
            Factures
          </TabsTrigger>
          <TabsTrigger value="visits" className="gap-1.5 text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5 hidden sm:block" />
            Visites
          </TabsTrigger>
          <TabsTrigger value="discussions" className="gap-1.5 text-xs sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5 hidden sm:block" />
            Discussions
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5 text-xs sm:text-sm">
            <StickyNote className="h-3.5 w-3.5 hidden sm:block" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Client Info */}
            <Card className="border-border/50 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-erp-orange" />
                  Informations du Client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoRow icon={<Building2 className="h-4 w-4" />} label="Société" value={client.companyName} />
                  <InfoRow icon={<User className="h-4 w-4" />} label="Responsable" value={client.contactName} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="Téléphone" value={client.phone} />
                  <InfoRow icon={<MessageCircle className="h-4 w-4" />} label="WhatsApp" value={client.whatsapp || '-'} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={client.email || '-'} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="Adresse" value={client.address || '-'} />
                  <InfoRow icon={<Globe className="h-4 w-4" />} label="Ville" value={client.city || '-'} />
                  <InfoRow icon={<Globe className="h-4 w-4" />} label="Région" value={client.region || '-'} />
                  <InfoRow icon={<Package className="h-4 w-4" />} label="Secteur" value={client.sector || '-'} />
                  <InfoRow icon={<Building2 className="h-4 w-4" />} label="Type" value={typeLabels[client.type] || client.type} />
                  <InfoRow icon={<Calendar className="h-4 w-4" />} label="Créé le" value={formatDateShort(client.createdAt)} />
                </div>
                {client.type && (
                  <div className="mt-4">
                    <Badge
                      variant="secondary"
                      className={typeColors[client.type] || ''}
                    >
                      {typeLabels[client.type] || client.type}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Commercial & Revenue */}
            <div className="space-y-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-erp-orange" />
                    Commercial Assigné
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {client.commercial ? (
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-erp-orange/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-erp-orange">
                          {client.commercial.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{client.commercial.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {client.commercial.role?.replace('_', ' ')}
                        </p>
                        {client.commercial.phone && (
                          <p className="text-xs text-muted-foreground">{client.commercial.phone}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun commercial assigné</p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-erp-orange" />
                    Chiffre d&apos;Affaires
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CA Total</span>
                    <span className="font-semibold">{formatCFA(client.stats.totalRevenue)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CA Commandes</span>
                    <span className="font-medium">{formatCFA(client.stats.totalOrdersRevenue)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valeur Devis</span>
                    <span className="font-medium">{formatCFA(client.stats.totalQuotesValue)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Payé</span>
                    <span className="font-medium text-green-600">{formatCFA(client.stats.totalPaid)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Solde Restant</span>
                    <span className="font-medium text-destructive">
                      {formatCFA(client.stats.totalRevenue - client.stats.totalPaid)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-erp-orange" />
                Commandes
                <Badge variant="secondary" className="ml-auto text-xs">
                  {client.orders.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {client.orders.length === 0 ? (
                <EmptyState message="Aucune commande pour ce client." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>N° Commande</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Commercial</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Remise</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium text-sm">{order.number}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[11px] ${orderStatusColors[order.status] || ''}`}>
                              {statusLabels[order.status] || order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {order.commercial?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCFA(order.total)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {order.discount > 0 ? `${order.discount}%` : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateShort(order.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quotes Tab */}
        <TabsContent value="quotes">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-erp-orange" />
                Devis
                <Badge variant="secondary" className="ml-auto text-xs">
                  {client.quotes.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {client.quotes.length === 0 ? (
                <EmptyState message="Aucun devis pour ce client." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>N° Devis</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Commercial</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Valide jusqu&apos;au</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.quotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell className="font-medium text-sm">{quote.number}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[11px] ${quoteStatusColors[quote.status] || ''}`}>
                              {statusLabels[quote.status] || quote.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {quote.commercial?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCFA(quote.total)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {quote.validUntil ? formatDateShort(quote.validUntil) : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateShort(quote.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Receipt className="h-4 w-4 text-erp-orange" />
                Factures
                <Badge variant="secondary" className="ml-auto text-xs">
                  {client.invoices.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {client.invoices.length === 0 ? (
                <EmptyState message="Aucune facture pour ce client." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>N° Facture</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Commercial</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Payé</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {client.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium text-sm">{invoice.number}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`text-[11px] ${invoiceStatusColors[invoice.status] || ''}`}>
                              {statusLabels[invoice.status] || invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {invoice.commercial?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium text-sm">
                            {formatCFA(invoice.total)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-green-600">
                            {formatCFA(invoice.paid)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {invoice.dueDate ? formatDateShort(invoice.dueDate) : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateShort(invoice.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-erp-orange" />
                Historique des Visites
                <Badge variant="secondary" className="ml-auto text-xs">
                  {client.visits.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.visits.length === 0 ? (
                <EmptyState message="Aucune visite enregistrée." />
              ) : (
                <div className="relative space-y-0">
                  {/* Timeline */}
                  <div className="space-y-4">
                    {client.visits.map((visit, index) => (
                      <div key={visit.id} className="flex gap-4">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                              visit.type === 'visit'
                                ? 'bg-erp-orange/10 text-erp-orange'
                                : visit.type === 'call'
                                ? 'bg-sky-100 dark:bg-sky-900/20 text-sky-600'
                                : 'bg-amber-100 dark:bg-amber-900/20 text-amber-600'
                            }`}
                          >
                            {visit.type === 'visit' ? (
                              <MapPin className="h-4 w-4" />
                            ) : visit.type === 'call' ? (
                              <PhoneCall className="h-4 w-4" />
                            ) : (
                              <StickyNote className="h-4 w-4" />
                            )}
                          </div>
                          {index < client.visits.length - 1 && (
                            <div className="w-px h-full bg-border mt-1" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-6">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              className={`text-[11px] w-fit ${
                                visit.status === 'completed'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : visit.status === 'planned'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}
                            >
                              {statusLabels[visit.status] || visit.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(visit.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {visit.notes || 'Aucune note'}
                          </p>
                          {visit.commercial && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Par {visit.commercial.name}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discussions Tab */}
        <TabsContent value="discussions">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-erp-orange" />
                Discussions
                <Badge variant="secondary" className="ml-auto text-xs">
                  {client.discussions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.discussions.length === 0 ? (
                <EmptyState message="Aucune discussion enregistrée." />
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {client.discussions.map((discussion) => {
                    const isIncoming = discussion.direction === 'incoming'
                    return (
                      <div
                        key={discussion.id}
                        className={`flex gap-3 ${isIncoming ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                            isIncoming
                              ? 'bg-muted rounded-tl-none'
                              : 'bg-erp-orange/10 rounded-tr-none'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              {discussionTypeIcon[discussion.type]}
                              {statusLabels[discussion.type] || discussion.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {isIncoming ? '↑ Entrant' : '↓ Sortant'}
                            </span>
                          </div>
                          <p className="text-sm">{discussion.content}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(discussion.createdAt)}
                            </span>
                            {discussion.commercial && (
                              <span className="text-[10px] text-muted-foreground">
                                · {discussion.commercial.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-erp-orange" />
                  Notes du Client
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="gap-1.5 bg-erp-orange hover:bg-erp-orange/90 text-white"
                >
                  {savingNotes ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Sauvegarder
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez vos notes sur ce client..."
                rows={12}
                className="resize-y"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper Components
function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Package className="h-8 w-8 mb-2 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
