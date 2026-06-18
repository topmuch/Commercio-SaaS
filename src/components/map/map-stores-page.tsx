'use client'

import React, { useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin,
  Map,
  Filter,
  Store,
  Building2,
  Search,
  X,
  Layers,
  MessageCircle,
  Navigation,
  Loader2,
  TrendingUp,
  Globe,
  Users,
  Target,
  Trophy,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useAppStore } from '@/lib/store'

// ─── Leaflet Map Component (dynamically loaded, no SSR) ─────
const LeafletMap = dynamic(
  () => import('./leaflet-map').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] lg:h-[650px] flex items-center justify-center rounded-xl bg-muted/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Chargement de la carte...</span>
        </div>
      </div>
    ),
  }
)

// ─── Types ─────────────────────────────────────────────────────────────

interface MapClient {
  id: string
  companyName: string
  contactName: string
  phone: string
  whatsapp?: string
  address?: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
  sector?: string
  type: string
  status: string
  commercialName?: string
  commercialId?: string
  orderCount: number
  _revenue: number
}

interface RegionData {
  name: string
  clientCount: number
  revenue: number
}

interface ByType {
  type: string
  label: string
  count: number
}

interface StatusDist {
  status: string
  label: string
  count: number
  percentage: number
  color: string
}

interface RegionOverlay {
  name: string
  center: { lat: number; lng: number }
  radius: number
  clientCount: number
  revenue: number
  color: string
}

interface Coverage {
  regionsCovered: number
  totalRegions: number
  coveragePercent: number
  geoLocatedCount: number
  geoLocatedPercent: number
}

interface Commercial {
  id: string
  name: string
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' CFA'
}

function formatShortCFA(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`
  return `${amount}`
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'supermarche': return 'Supermarché'
    case 'grossiste': return 'Grossiste'
    case 'revendeur': return 'Revendeur'
    case 'boutique': return 'Boutique'
    default: return type
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'supermarche': return <Building2 className="h-4 w-4" />
    case 'grossiste': return <Store className="h-4 w-4" />
    default: return <Store className="h-4 w-4" />
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'supermarche': return 'bg-violet-500'
    case 'grossiste': return 'bg-amber-500'
    case 'revendeur': return 'bg-teal-500'
    case 'boutique': return 'bg-erp-orange'
    default: return 'bg-gray-500'
  }
}

// ─── Status config ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; emoji: string; dotClass: string; bgClass: string; textClass: string; color: string }> = {
  lead_rouge: {
    label: 'Leads Rouges',
    emoji: '🔴',
    dotClass: 'bg-red-500',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-500',
    color: '#ef4444',
  },
  negociation_orange: {
    label: 'Négociations',
    emoji: '🟠',
    dotClass: 'bg-orange-500',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-500',
    color: '#f97316',
  },
  client_vert: {
    label: 'Clients Verts',
    emoji: '🟢',
    dotClass: 'bg-green-500',
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-500',
    color: '#22c55e',
  },
}

// ─── Stat Card ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  dotClass,
  bgClass,
  textClass,
  subtitle,
}: {
  label: string
  value: number | string
  icon?: React.ElementType
  dotClass?: string
  bgClass?: string
  textClass?: string
  subtitle?: string
}) {
  return (
    <Card className="border-border/60 hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className={`text-2xl font-bold tracking-tight ${textClass || 'text-foreground'}`}>{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgClass || 'bg-muted'}`}>
            {Icon ? (
              <Icon className={`h-5 w-5 ${textClass || 'text-muted-foreground'}`} />
            ) : (
              <div className={`h-6 w-6 rounded-full ${dotClass || 'bg-muted-foreground'}`} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function MapStoresPage() {
  const [filterRegion, setFilterRegion] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterCommercial, setFilterCommercial] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)
  const setSelectedClient = useAppStore((s) => s.setSelectedClient)

  const { data, isLoading } = useQuery<{
    data: {
      clients: MapClient[]
      regions: RegionData[]
      byType: ByType[]
      commercials: Commercial[]
      totalClients: number
      totalRevenue: number
      statusDistribution: StatusDist[]
      regionOverlays: RegionOverlay[]
      topClients: MapClient[]
      coverage: Coverage
    }
    count: number
  }>({
    queryKey: ['map-stores'],
    queryFn: () => fetch('/api/map/stores').then((r) => r.json()),
  })

  const clients = data?.data?.clients || []
  const regions = data?.data?.regions || []
  const byType = data?.data?.byType || []
  const commercials = data?.data?.commercials || []
  const statusDistribution = data?.data?.statusDistribution || []
  const topClients = data?.data?.topClients || []
  const coverage = data?.data?.coverage

  // Filter clients
  const filteredClients = useMemo(
    () =>
      clients.filter((c) => {
        if (filterRegion !== 'all' && c.region !== filterRegion) return false
        if (filterStatus !== 'all' && c.status !== filterStatus) return false
        if (filterType !== 'all' && c.type !== filterType) return false
        if (filterCommercial !== 'all' && c.commercialId !== filterCommercial) return false
        if (
          searchQuery &&
          !c.companyName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(c.city && c.city.toLowerCase().includes(searchQuery.toLowerCase())) &&
          !c.contactName.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false
        return true
      }),
    [clients, filterRegion, filterStatus, filterType, filterCommercial, searchQuery]
  )

  // Stats per status
  const stats = useMemo(() => {
    const rouge = filteredClients.filter((c) => c.status === 'lead_rouge').length
    const orange = filteredClients.filter((c) => c.status === 'negociation_orange').length
    const vert = filteredClients.filter((c) => c.status === 'client_vert').length
    const geoCount = filteredClients.filter((c) => c.latitude && c.longitude).length
    const total = filteredClients.length
    const revenue = filteredClients.reduce((sum, c) => sum + c._revenue, 0)
    return { total, rouge, orange, vert, geoCount, revenue }
  }, [filteredClients])

  const handleClientSelect = useCallback((clientId: string) => {
    setSelectedClient(clientId)
    setCurrentPage('client-detail')
  }, [setCurrentPage, setSelectedClient])

  // Pipeline percentage (leads -> negociation -> client)
  const pipelinePercent = useMemo(() => {
    if (stats.total === 0) return 0
    return Math.round((stats.vert / stats.total) * 100)
  }, [stats])

  return (
    <div className="space-y-6">
      {/* ── Hero Header ───────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-erp-orange/10">
              <MapPin className="h-5 w-5 text-erp-orange" />
            </div>
            Carte Stratégique des Commerces
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 ml-[46px]">
            Vue d&apos;ensemble de votre réseau de distribution sur le territoire sénégalais
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="bg-erp-orange/10 text-erp-orange text-xs font-medium">
            <MapPin className="h-3 w-3 mr-1" />
            {stats.geoCount} géolocalisés / {stats.total} total
          </Badge>
          {coverage && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs font-medium">
              <Globe className="h-3 w-3 mr-1" />
              {coverage.regionsCovered}/{coverage.totalRegions} régions couvertes
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs font-medium">
            <TrendingUp className="h-3 w-3 mr-1" />
            {formatShortCFA(stats.revenue)} CA filtré
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs"
          >
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filtres
            {showFilters && <X className="h-3 w-3 ml-1.5" />}
          </Button>
        </div>
      </div>

      {/* ── Status Stats + Pipeline ───────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Points de Vente"
          value={stats.total}
          icon={Store}
          bgClass="bg-muted"
          textClass="text-foreground"
          subtitle={`${stats.geoCount} géolocalisés`}
        />
        <StatCard
          label="Leads Rouges"
          value={stats.rouge}
          dotClass="bg-red-500"
          bgClass="bg-red-500/10"
          textClass="text-red-500"
        />
        <StatCard
          label="Négociations"
          value={stats.orange}
          dotClass="bg-orange-500"
          bgClass="bg-orange-500/10"
          textClass="text-orange-500"
        />
        <StatCard
          label="Clients Verts"
          value={stats.vert}
          dotClass="bg-green-500"
          bgClass="bg-green-500/10"
          textClass="text-green-500"
          subtitle={`${pipelinePercent}% taux de conversion`}
        />
      </div>

      {/* ── Pipeline + Coverage ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline de conversion */}
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-erp-orange" />
                Pipeline de Conversion
              </h3>
              <Badge variant="secondary" className="text-[10px] font-medium">
                {pipelinePercent}% conversion
              </Badge>
            </div>
            <div className="space-y-3">
              {statusDistribution.map((s) => (
                <div key={s.status} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-xs font-medium text-foreground">{s.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{s.count}</span>
                      <span className="text-[10px] text-muted-foreground">({s.percentage}%)</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${s.percentage}%`,
                        backgroundColor: s.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients + Coverage */}
        <div className="space-y-4">
          {/* Coverage */}
          {coverage && (
            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Couverture Territoriale
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Régions couvertes</span>
                    <span className="text-sm font-bold text-foreground">{coverage.regionsCovered} / {coverage.totalRegions}</span>
                  </div>
                  <Progress value={coverage.coveragePercent} className="h-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Clients géolocalisés</span>
                    <span className="text-sm font-bold text-foreground">{coverage.geoLocatedCount} / {stats.total}</span>
                  </div>
                  <Progress value={coverage.geoLocatedPercent} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top clients quick view */}
          {topClients.length > 0 && (
            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Top Clients par CA
                  </h3>
                </div>
                <div className="space-y-2">
                  {topClients.slice(0, 3).map((client, idx) => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client.id)}
                      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-white text-[11px] font-bold ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate group-hover:text-erp-orange transition-colors">
                          {client.companyName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {client.city || client.region || '-'}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {formatShortCFA(client._revenue)}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      {showFilters && (
        <Card className="border-border/60">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Région
                </label>
                <Select value={filterRegion} onValueChange={setFilterRegion}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Toutes les régions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les régions</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.name} value={r.name}>
                        {r.name} ({r.clientCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                  Statut
                </label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="lead_rouge">🔴 Leads Rouges</SelectItem>
                    <SelectItem value="negociation_orange">🟠 Négociations</SelectItem>
                    <SelectItem value="client_vert">🟢 Clients Verts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                  Type
                </label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Tous les types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {byType.map((t) => (
                      <SelectItem key={t.type} value={t.type}>
                        {t.label} ({t.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                  <Users className="h-3 w-3 inline mr-1" />
                  Commercial
                </label>
                <Select value={filterCommercial} onValueChange={setFilterCommercial}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les commerciaux</SelectItem>
                    {commercials.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block font-medium">
                  <Search className="h-3 w-3 inline mr-1" />
                  Recherche
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nom, ville, contact..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Interactive Leaflet Map ────────────────────────── */}
      <Card className="border-border/60 overflow-hidden">
        <CardContent className="p-0 relative">
          {isLoading ? (
            <div className="h-[600px] lg:h-[650px] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Chargement des données cartographiques...</span>
              </div>
            </div>
          ) : (
            <LeafletMap clients={filteredClients} onClientSelect={handleClientSelect} />
          )}
        </CardContent>
      </Card>

      {/* ── Legend ──────────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            Légende & Actions
          </h3>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-red-500 border-2 border-white shadow-sm" />
              <span className="text-sm text-muted-foreground">Lead (Prospect)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
              <span className="text-sm text-muted-foreground">Négociation en cours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-green-500 border-2 border-white shadow-sm" />
              <span className="text-sm text-muted-foreground">Client actif</span>
            </div>
            <Separator orientation="vertical" className="h-5 hidden sm:block" />
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">WhatsApp direct</span>
            </div>
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Itinéraire Google Maps</span>
            </div>
            <Separator orientation="vertical" className="h-5 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-primary/20 border border-primary/40" />
              <span className="text-sm text-muted-foreground">Zone de couverture</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Region Breakdown ────────────────────────────────── */}
      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Map className="h-4 w-4 text-muted-foreground" />
              Répartition par Région ({filteredClients.length} points)
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ChevronRight className="h-3 w-3" />
              Cliquez pour filtrer
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {regions.map((region) => {
              const isActive = filterRegion === region.name
              const regionClients = filteredClients.filter((c) => c.region === region.name)

              return (
                <button
                  key={region.name}
                  onClick={() => setFilterRegion(isActive ? 'all' : region.name)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                    isActive
                      ? 'border-erp-orange/50 bg-erp-orange/5 ring-1 ring-erp-orange/20'
                      : 'border-border/50 hover:border-erp-orange/20 hover:bg-muted/30'
                  }`}
                >
                  <p className="text-xs font-semibold text-foreground truncate">{region.name}</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {regionClients.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatShortCFA(regionClients.reduce((s, c) => s + c._revenue, 0))} CA
                  </p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Client List ────────────────────────────────────── */}
      <Card className="border-border/60">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Store className="h-4 w-4 text-muted-foreground" />
              Points de vente filtrés ({filteredClients.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Cliquez sur un point pour voir sa fiche client
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
            {filteredClients.map((client) => {
              const statusCfg = STATUS_CONFIG[client.status] || {
                label: client.status,
                dotClass: 'bg-gray-500',
              }
              const hasGeo = client.latitude && client.longitude

              return (
                <button
                  key={client.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-erp-orange/30 hover:bg-muted/50 transition-all duration-150 text-left group"
                  onClick={() => handleClientSelect(client.id)}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-white ${getTypeColor(client.type)}`}>
                    {getTypeIcon(client.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate group-hover:text-erp-orange transition-colors">
                        {client.companyName}
                      </span>
                      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusCfg.dotClass}`} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span>{client.contactName}</span>
                      {client.city && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {client.city}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={`text-[9px] h-4 px-1.5 ${getTypeColor(client.type)} text-white`}>
                        {getTypeLabel(client.type)}
                      </Badge>
                      {client._revenue > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{formatCFA(client._revenue)}</span>
                      )}
                      {client.orderCount > 0 && (
                        <span className="text-[10px] text-muted-foreground">({client.orderCount} cmd)</span>
                      )}
                      {!hasGeo && (
                        <span className="text-[9px] text-red-400 font-medium ml-auto">Non géolocalisé</span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {filteredClients.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <MapPin className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Aucun point de vente trouvé</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => { setFilterRegion('all'); setFilterStatus('all'); setFilterType('all'); setFilterCommercial('all'); setSearchQuery('') }}>
                  Réinitialiser les filtres
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
