'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  MessageSquare,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  Paperclip,
  MoreVertical,
  Filter,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'
type TicketCategory = 'technical' | 'billing' | 'feature' | 'bug' | 'question'

interface Ticket {
  id: string
  subject: string
  priority: TicketPriority
  status: TicketStatus
  category: TicketCategory
  createdAt: string
  updatedAt: string
  _count: {
    messages: number
  }
  messages: Array<{
    content: string
    createdAt: string
  }>
}

interface NewTicketData {
  subject: string
  description: string
  priority: TicketPriority
  category: TicketCategory
}

// ── Helpers ───────────────────────────────────────────────────────────

const statusConfig: Record<TicketStatus, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'Ouvert', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', icon: Clock },
  in_progress: { label: 'En cours', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20', icon: AlertCircle },
  resolved: { label: 'Résolu', color: 'bg-green-500/10 text-green-700 border-green-500/20', icon: CheckCircle },
  closed: { label: 'Fermé', color: 'bg-slate-500/10 text-slate-700 border-slate-500/20', icon: XCircle },
}

const priorityConfig: Record<TicketPriority, { label: string; color: string }> = {
  low: { label: 'Basse', color: 'bg-slate-100 text-slate-700' },
  normal: { label: 'Normale', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
}

const categoryConfig: Record<TicketCategory, { label: string }> = {
  technical: { label: 'Technique' },
  billing: { label: 'Facturation' },
  feature: { label: 'Fonctionnalité' },
  bug: { label: 'Bug' },
  question: { label: 'Question' },
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Create Ticket Dialog ───────────────────────────────────────────────

function CreateTicketDialog({
  open,
  onOpenChange,
  onCreate,
  hasPrioritySupport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: NewTicketData) => Promise<void>
  hasPrioritySupport: boolean
}) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TicketPriority>('normal')
  const [category, setCategory] = useState<TicketCategory>('technical')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setIsSubmitting(true)
    try {
      await onCreate({ subject, description, priority, category })
      setSubject('')
      setDescription('')
      setPriority('normal')
      setCategory('technical')
      onOpenChange(false)
      toast.success('Ticket créé avec succès')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur lors de la création'
      toast.error('Erreur', { description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un ticket de support</DialogTitle>
          <DialogDescription>
            Décrivez votre problème et notre équipe vous répondra dans les plus brefs délais.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Sujet *</label>
            <Input
              placeholder="Résumé court du problème"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Catégorie *</label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Priorité</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([key, { label }]) => {
                    const isHighPriority = key === 'high' || key === 'urgent'
                    return (
                      <SelectItem
                        key={key}
                        value={key}
                        disabled={!hasPrioritySupport && isHighPriority}
                      >
                        {label}
                        {!hasPrioritySupport && isHighPriority && ' (Pro/Enterprise)'}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Description *</label>
            <Textarea
              placeholder="Décrivez votre problème en détail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                'Créer le ticket'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Ticket Card Component ──────────────────────────────────────────────

function TicketCard({ ticket, onClick }: { ticket: Ticket; onClick: () => void }) {
  const StatusIcon = statusConfig[ticket.status].icon
  const priorityInfo = priorityConfig[ticket.priority]
  const statusInfo = statusConfig[ticket.status]
  const categoryInfo = categoryConfig[ticket.category]

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground text-sm mb-2 truncate">{ticket.subject}</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={statusInfo.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className={priorityInfo.color}>
                {priorityInfo.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {categoryInfo.label}
              </Badge>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {ticket._count.messages} msg
          </Badge>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatDate(ticket.createdAt)}</span>
          {ticket.messages.length > 0 && (
            <span className="truncate max-w-[200px]">
              {ticket.messages[0].content.substring(0, 50)}...
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ─────────────────────────────────────────────────────

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [hasPrioritySupport, setHasPrioritySupport] = useState(false)
  const [isProOrHigher, setIsProOrHigher] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.append('status', filterStatus)
      if (filterPriority !== 'all') params.append('priority', filterPriority)

      const res = await fetch(`/api/support/tickets?${params.toString()}`)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur lors du chargement')
      }
      const json = await res.json()
      setTickets(json.data || [])

      // Check plan features
      const planRes = await fetch('/api/saas/subscription')
      if (planRes.ok) {
        const planData = await planRes.json()
        const plan = planData.data?.plan || 'starter'
        setHasPrioritySupport(plan === 'pro' || plan === 'enterprise')
        setIsProOrHigher(plan === 'pro' || plan === 'enterprise')
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erreur inconnue'
      toast.error('Erreur', { description: msg })
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterPriority])

  const handleCreateTicket = async (data: NewTicketData) => {
    setCreating(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur lors de la création')
      }

      await fetchTickets()
    } catch (error: unknown) {
      throw error
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  const filteredTickets = tickets.filter((ticket) => {
    if (filterStatus !== 'all' && ticket.status !== filterStatus) return false
    if (filterPriority !== 'all' && ticket.priority !== filterPriority) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold text-foreground">Support Technique</h2>
            <p className="text-xs text-muted-foreground">
              {isProOrHigher ? 'Support prioritaire inclus' : 'Support standard'}
            </p>
          </div>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nouveau Ticket
            </Button>
          </DialogTrigger>
          <CreateTicketDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onCreate={handleCreateTicket}
            hasPrioritySupport={hasPrioritySupport}
          />
        </Dialog>
      </div>

      {/* ── Filters ───────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="resolved">Résolu</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les priorités</SelectItem>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="normal">Normale</SelectItem>
                  <SelectItem value="high">Haute</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto text-sm text-muted-foreground">
              {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Tickets List ──────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Aucun ticket</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {filterStatus !== 'all' || filterPriority !== 'all'
                ? 'Aucun ticket ne correspond à vos filtres'
                : 'Créez votre premier ticket de support'}
            </p>
            {filterStatus === 'all' && filterPriority === 'all' && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un ticket
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="grid grid-cols-1 gap-3 pr-4">
            {filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {/* ── Ticket Detail Dialog ──────────────────────── */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
            <DialogHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-base">{selectedTicket.subject}</DialogTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={statusConfig[selectedTicket.status].color}>
                      {statusConfig[selectedTicket.status].label}
                    </Badge>
                    <Badge variant="outline" className={priorityConfig[selectedTicket.priority].color}>
                      {priorityConfig[selectedTicket.priority].label}
                    </Badge>
                  </div>
                </div>
              </div>
              <DialogDescription className="mt-2">
                Créé le {formatDate(selectedTicket.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 -mx-4 px-4">
              <div className="space-y-4">
                {selectedTicket.messages.map((msg, i) => (
                  <Card key={i} className="p-3">
                    <p className="text-sm text-foreground">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">{formatDate(msg.createdAt)}</p>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="border-t pt-4">
              <div className="flex gap-2">
                <Input placeholder="Votre réponse..." />
                <Button size="icon">
                  <Send className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline">
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}