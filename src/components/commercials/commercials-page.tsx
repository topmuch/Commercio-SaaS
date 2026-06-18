'use client'

import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Target,
  Trophy,
  TrendingUp,
  Users,
  Phone,
  Mail,
  Award,
  BarChart3,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Pencil,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { CommercialFormModal } from './commercial-form-modal'
import type { Commercial } from '@/lib/types'

function formatCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' CFA'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = [
  'bg-orange-500',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-500',
  'bg-cyan-600',
  'bg-violet-600',
]

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length]
}

function getTargetColor(percent: number): string {
  if (percent >= 80) return 'bg-emerald-500'
  if (percent >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function getTargetTextColor(percent: number): string {
  if (percent >= 80) return 'text-emerald-600'
  if (percent >= 50) return 'text-amber-600'
  return 'text-red-600'
}

// ====== PODIUM COMPONENT ======
function RankingPodium({ commercials }: { commercials: Commercial[] }) {
  const [gold, silver, bronze] = commercials.length >= 3
    ? [commercials[0], commercials[1], commercials[2]]
    : commercials.length >= 2
      ? [commercials[0], commercials[1], null]
      : commercials.length >= 1
        ? [commercials[0], null, null]
        : [null, null, null]

  const podiumOrder = [silver, gold, bronze] // 2nd, 1st, 3rd

  const medalColors = ['from-gray-300 to-gray-400', 'from-yellow-400 to-amber-500', 'from-amber-600 to-amber-800']
  const medalEmojis = ['🥈', '🥇', '🥉']
  const podiumHeights = ['h-32', 'h-40', 'h-28']
  const podiumLabels = ['2ème', '1er', '3ème']

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-card/80">
      <CardContent className="p-6">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Trophy className="h-6 w-6 text-amber-500" />
          <h3 className="text-lg font-bold text-foreground">Classement des Commerciaux</h3>
        </div>
        <div className="flex items-end justify-center gap-4 sm:gap-6">
          {podiumOrder.map((commercial, index) => (
            <div key={index} className="flex flex-col items-center flex-1 max-w-[140px]">
              {/* Avatar & Info */}
              <div className="flex flex-col items-center mb-3">
                <div className={`relative mb-2`}>
                  <div
                    className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${commercial ? getAvatarColor(commercials.indexOf(commercial!)) : 'bg-gray-400'}`}
                  >
                    {commercial ? getInitials(commercial.name) : '?'}
                  </div>
                  <div
                    className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br ${medalColors[index]} flex items-center justify-center text-sm shadow-md`}
                  >
                    {medalEmojis[index]}
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground text-center truncate w-full">
                  {commercial?.name || '—'}
                </p>
                {commercial && (
                  <p className="text-xs font-bold text-amber-600 mt-0.5">
                    {formatCFA(commercial._revenue || 0)}
                  </p>
                )}
              </div>
              {/* Podium Bar */}
              <div
                className={`w-full rounded-t-xl bg-gradient-to-t ${medalColors[index]} ${podiumHeights[index]} flex flex-col items-center justify-center shadow-md`}
              >
                <span className="text-white font-bold text-lg">{podiumLabels[index]}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ====== KPI ROW ======
function KPIRow({ commercials }: { commercials: Commercial[] }) {
  const totalRevenue = commercials.reduce((sum, c) => sum + (c._revenue || 0), 0)
  const totalClients = commercials.reduce((sum, c) => sum + (c._count?.clients || 0), 0)
  const targetsAchieved = commercials.filter(
    (c) => (c._targetPercent || 0) >= 80
  ).length
  const targetPercentTotal =
    commercials.length > 0
      ? Math.round(
          commercials.reduce((sum, c) => sum + (c._targetPercent || 0), 0) /
            commercials.length
        )
      : 0

  const kpis = [
    {
      label: 'CA Équipe',
      value: formatCFA(totalRevenue),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      label: 'Clients gérés',
      value: totalClients.toString(),
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
      label: 'Objectifs atteints',
      value: `${targetsAchieved}/${commercials.length} (${targetPercentTotal}%)`,
      icon: Target,
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon
        return (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${kpi.bg}`}>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                <p className="text-sm font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ====== COMMERCIAL CARD ======
function CommercialCard({
  commercial,
  index,
  onClick,
  onEdit,
}: {
  commercial: Commercial
  index: number
  onClick: () => void
  onEdit: () => void
}) {
  const targetPercent = commercial._targetPercent || 0
  const revenueTarget = commercial.targets?.find((t) => t.type === 'revenue')

  return (
    <Card
      className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header: Avatar + Name */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar className={`h-12 w-12 border-2 border-white shadow-md ${getAvatarColor(index)}`}>
            <AvatarFallback className="text-white font-bold text-sm">
              {getInitials(commercial.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-foreground truncate">{commercial.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <a
                href={`tel:${commercial.phone}`}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3 w-3" />
                {commercial.phone}
              </a>
              <span className="text-muted-foreground/30">|</span>
              <a
                href={`mailto:${commercial.email}`}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail className="h-3 w-3" />
                {commercial.email}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Modifier"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <Badge
              variant="secondary"
              className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] font-semibold"
            >
              #{index + 1}
            </Badge>
          </div>
        </div>

        {/* Revenue */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground font-medium">Chiffre d&apos;affaires</span>
            <span className="text-sm font-bold text-emerald-600">{formatCFA(commercial._revenue || 0)}</span>
          </div>
        </div>

        {/* Target Progress */}
        {revenueTarget && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground font-medium">Objectif</span>
              <span className={`text-xs font-bold ${getTargetTextColor(targetPercent)}`}>
                {targetPercent}%
              </span>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getTargetColor(targetPercent)}`}
                style={{ width: `${Math.min(targetPercent, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">
                Atteint: {formatCFA(revenueTarget.achieved || 0)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Objectif: {formatCFA(revenueTarget.value)}
              </span>
            </div>
          </div>
        )}

        <Separator className="my-3" />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-orange-500" />
              <span className="text-sm font-bold text-foreground">{commercial._count?.clients || 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Clients</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <BarChart3 className="h-3 w-3 text-violet-500" />
              <span className="text-sm font-bold text-foreground">{commercial._count?.orders || 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Commandes</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <MapPin className="h-3 w-3 text-emerald-500" />
              <span className="text-sm font-bold text-foreground">{commercial._count?.visits || 0}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Visites</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ====== COMMERCIAL DETAIL DIALOG ======
function CommercialDetailDialog({
  commercial,
  open,
  onOpenChange,
}: {
  commercial: Commercial | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  if (!commercial) return null
  const revenueTarget = commercial.targets?.find((t) => t.type === 'revenue')
  const clientsTarget = commercial.targets?.find((t) => t.type === 'clients')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-amber-300">
              <AvatarFallback className="bg-amber-500 text-white font-bold">
                {getInitials(commercial.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-lg">{commercial.name}</span>
              <p className="text-xs text-muted-foreground font-normal">
                {commercial.email} {commercial.phone && `• ${commercial.phone}`}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="portfolio" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="portfolio" className="flex-1 text-xs">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Portefeuille Clients
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex-1 text-xs">
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="objectives" className="flex-1 text-xs">
              <Target className="h-3.5 w-3.5 mr-1.5" />
              Objectifs
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 text-xs">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Activité
            </TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="border-0 bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{commercial._count?.clients || 0}</p>
                    <p className="text-xs text-muted-foreground">Clients totaux</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{commercial._count?.orders || 0}</p>
                    <p className="text-xs text-muted-foreground">Commandes</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{commercial._count?.visits || 0}</p>
                    <p className="text-xs text-muted-foreground">Visites</p>
                  </CardContent>
                </Card>
                <Card className="border-0 bg-muted/50">
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{formatCFA(commercial._revenue || 0)}</p>
                    <p className="text-xs text-muted-foreground">CA Total</p>
                  </CardContent>
                </Card>
              </div>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Répartition
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">CA moyen par client</span>
                        <span className="font-semibold">
                          {commercial._count?.clients
                            ? formatCFA((commercial._revenue || 0) / (commercial._count?.clients || 1))
                            : formatCFA(0)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Commandes moy. par client</span>
                        <span className="font-semibold">
                          {commercial._count?.clients
                            ? ((commercial._count?.orders || 0) / (commercial._count?.clients || 1)).toFixed(1)
                            : '0'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Panier moyen</span>
                        <span className="font-semibold">
                          {commercial._count?.orders
                            ? formatCFA((commercial._revenue || 0) / (commercial._count?.orders || 1))
                            : formatCFA(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="mt-4">
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-violet-500" />
                    Performance Globale
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Chiffre d&apos;affaires</span>
                      <span className="text-sm font-bold text-emerald-600">{formatCFA(commercial._revenue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Total commandes</span>
                      <span className="text-sm font-bold">{commercial._count?.orders || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-border/50">
                      <span className="text-sm text-muted-foreground">Taux d&apos;objectif</span>
                      <span className={`text-sm font-bold ${getTargetTextColor(commercial._targetPercent || 0)}`}>
                        {commercial._targetPercent || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Visites effectuées</span>
                      <span className="text-sm font-bold">{commercial._count?.visits || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="objectives" className="mt-4">
            <div className="space-y-4">
              {(commercial.targets || []).map((target) => {
                const percent = target.value > 0 ? Math.round((target.achieved / target.value) * 100) : 0
                return (
                  <Card key={target.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-violet-500" />
                          <span className="text-sm font-semibold capitalize">
                            {target.type === 'revenue' ? 'CA' : target.type === 'clients' ? 'Clients' : target.type}
                          </span>
                        </div>
                        <Badge
                          variant={percent >= 80 ? 'default' : 'secondary'}
                          className={percent >= 80
                            ? 'bg-emerald-500 text-white text-[10px]'
                            : percent >= 50
                              ? 'bg-amber-500 text-white text-[10px]'
                              : 'bg-red-500 text-white text-[10px]'
                          }
                        >
                          {percent}%
                        </Badge>
                      </div>
                      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getTargetColor(percent)}`}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Atteint:{' '}
                          {target.type === 'revenue'
                            ? formatCFA(target.achieved)
                            : `${target.achieved}`}
                        </span>
                        <span>
                          Objectif:{' '}
                          {target.type === 'revenue'
                            ? formatCFA(target.value)
                            : `${target.value}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(target.startDate).toLocaleDateString('fr-FR')} →{' '}
                          {new Date(target.endDate).toLocaleDateString('fr-FR')}
                        </span>
                        <Badge variant="outline" className="text-[9px] h-5 ml-auto">
                          {target.period}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              {(!commercial.targets || commercial.targets.length === 0) && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Aucun objectif défini</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Résumé d&apos;Activité
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/40">
                        <MapPin className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Visites terrain</p>
                        <p className="text-xs text-muted-foreground">{commercial._count?.visits || 0} visites</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950/40">
                        <BarChart3 className="h-4 w-4 text-violet-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Commandes passées</p>
                        <p className="text-xs text-muted-foreground">{commercial._count?.orders || 0} commandes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-950/40">
                        <Users className="h-4 w-4 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Clients actifs</p>
                        <p className="text-xs text-muted-foreground">{commercial._count?.clients || 0} clients</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ====== MAIN PAGE ======
export default function CommercialsPage() {
  const [selectedCommercial, setSelectedCommercial] = useState<Commercial | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCommercial, setEditingCommercial] = useState<Commercial | null>(null)

  const { data, isLoading, error } = useQuery<{ data: Commercial[]; count: number }>({
    queryKey: ['commercials'],
    queryFn: () => fetch('/api/commercials').then((r) => r.json()),
  })

  const commercials = data?.data || []

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Erreur lors du chargement des commerciaux</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            Commerciaux
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez votre équipe commerciale et suivez les performances
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setEditingCommercial(null)
              setFormOpen(true)
            }}
            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-md shadow-violet-500/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un commercial
          </Button>
          <Badge variant="secondary" className="bg-erp-orange/10 text-erp-orange text-xs">
            {commercials.length} commerciaux
          </Badge>
        </div>
      </div>

      {/* Ranking Podium */}
      {commercials.length >= 1 && <RankingPodium commercials={commercials} />}

      {/* KPI Row */}
      <KPIRow commercials={commercials} />

      {/* Commercial Cards Grid */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Tous les Commerciaux
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {commercials.map((commercial, index) => (
            <CommercialCard
              key={commercial.id}
              commercial={commercial}
              index={index}
              onClick={() => {
                setSelectedCommercial(commercial)
                setDialogOpen(true)
              }}
              onEdit={() => {
                setEditingCommercial(commercial)
                setFormOpen(true)
              }}
            />
          ))}
        </div>
        {commercials.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Aucun commercial trouvé</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      <CommercialFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingCommercial(null)
        }}
        commercial={editingCommercial}
      />

      {/* Detail Dialog */}
      <CommercialDetailDialog
        commercial={selectedCommercial}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
