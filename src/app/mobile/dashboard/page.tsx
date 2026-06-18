'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Phone, Navigation, User, Package, TrendingUp,
  Target, Clock, ChevronRight, RefreshCw, ArrowRight,
  MessageCircle, ClipboardList, Map, Zap, WifiOff, Wifi,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

// ─── Types ───
interface DashboardData {
  user: { id: string; name: string; email: string; phone: string; role: string; avatar?: string }
  todayVisits: {
    id: string; type: string; notes: string; status: string;
    latitude: number | null; longitude: number | null;
    createdAt: string;
    client: { companyName: string; contactName: string; status: string; city: string; address: string; latitude: number | null; longitude: number | null; phone: string; whatsapp: string | null }
  }[]
  todayOrderCount: number
  todayRevenue: number
  monthlyStats: {
    revenue: number; orderCount: number; activeClients: number;
    visitRate: number; totalVisits: number
  }
  targets: {
    visits: { target: number; achieved: number } | null
    revenue: { target: number; achieved: number } | null
  }
  tourClients: {
    id: string; companyName: string; contactName: string; status: string;
    city: string; address: string | null; latitude: number | null;
    longitude: number | null; phone: string; whatsapp: string | null;
    _count: { visits: number }
  }[]
  recentActivity: {
    id: string; type: 'visit' | 'order'; label: string; createdAt: string
  }[]
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin}min`
  if (diffH < 24) return `Il y a ${diffH}h`
  if (diffD === 1) return 'Hier'
  if (diffD < 7) return `Il y a ${diffD}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function statusColor(status: string) {
  if (status === 'client_vert') return 'bg-emerald-500'
  if (status === 'negociation_orange') return 'bg-orange-500'
  return 'bg-red-500'
}

function statusLabel(status: string) {
  if (status === 'client_vert') return 'Vert'
  if (status === 'negociation_orange') return 'Orange'
  return 'Rouge'
}

function getTargetColor(achieved: number, target: number): string {
  const pct = target > 0 ? (achieved / target) * 100 : 0
  if (pct >= 75) return 'text-emerald-400'
  if (pct >= 50) return 'text-amber-400'
  return 'text-red-400'
}

function getProgressColor(achieved: number, target: number): string {
  const pct = target > 0 ? (achieved / target) * 100 : 0
  if (pct >= 75) return '[&>[data-slot=progress-indicator]]:bg-emerald-500'
  if (pct >= 50) return '[&>[data-slot=progress-indicator]]:bg-amber-500'
  return '[&>[data-slot=progress-indicator]]:bg-red-500'
}

// ─── Main Component ───
export default function MobileDashboardPage() {
  const router = useRouter()
  const { user: storeUser } = useAppStore()
  const geo = useGeolocation(false)
  const isOnline = useOnlineStatus()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile/dashboard')
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // Silently fail — show skeleton
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchDashboard()
      setLoading(false)
    }
    load()
  }, [fetchDashboard])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDashboard()
    setRefreshing(false)
  }

  const userFirstName = storeUser?.name?.split(' ')[0] || (data?.user?.name?.split(' ')[0]) || 'Agent'
  const greeting = new Date().getHours() < 18 ? 'Bonjour' : 'Bonsoir'
  const locationLabel = geo.latitude && geo.longitude
    ? `📍 ${geo.accuracy ? `±${Math.round(geo.accuracy)}m — ` : ''}Dakar, Sénégal`
    : '📍 Dakar, Sénégal'

  return (
    <div className="pb-4">
      {/* ── A. Header / Greeting ── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 mb-0.5">
              {isOnline ? (
                <span className="inline-flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-emerald-500" /> En ligne
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <WifiOff className="h-3 w-3 text-red-500" /> Hors-ligne
                </span>
              )}
            </p>
            <h2 className="text-xl font-bold text-slate-100">
              {greeting}, {userFirstName} 👋
            </h2>
            <p className="text-xs text-slate-500 mt-1">{locationLabel}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 active:bg-slate-700 transition-colors"
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4 text-slate-400', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <DashboardSkeleton />
      ) : data ? (
        <div className="space-y-4">
          {/* ── B. Daily Objectives Card ── */}
          <div className="px-4">
            <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-200">Objectifs du jour</h3>
              </div>

              <div className="space-y-3">
                {/* Visits target */}
                {data.targets.visits ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">Visites terrain</span>
                      <span className={cn('text-xs font-semibold', getTargetColor(data.targets.visits.achieved, data.targets.visits.target))}>
                        {data.todayVisits.length} / {data.targets.visits.target} visites
                      </span>
                    </div>
                    <Progress
                      value={Math.min((data.todayVisits.length / data.targets.visits.target) * 100, 100)}
                      className={cn('h-2', getProgressColor(data.todayVisits.length, data.targets.visits.target))}
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">Visites aujourd&apos;hui</span>
                      <span className="text-xs font-semibold text-emerald-400">
                        {data.todayVisits.length} visites
                      </span>
                    </div>
                    <Progress value={Math.min(data.todayVisits.length * 20, 100)} className="h-2" />
                  </div>
                )}

                {/* Revenue target */}
                {data.targets.revenue ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-slate-400">Chiffre d&apos;affaires</span>
                      <span className={cn('text-xs font-semibold', getTargetColor(data.todayRevenue, data.targets.revenue.target))}>
                        {formatCurrency(data.todayRevenue)} / {formatCurrency(data.targets.revenue.target)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min((data.todayRevenue / data.targets.revenue.target) * 100, 100)}
                      className={cn('h-2', getProgressColor(data.todayRevenue, data.targets.revenue.target))}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── F. Quick Actions Row ── */}
          <div className="px-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  const phone = (storeUser as { phone?: string } | undefined)?.phone || (data?.user as { phone?: string } | undefined)?.phone
                  if (phone) window.open(`tel:${phone}`)
                }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3 active:bg-slate-700/60 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                  <Phone className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-[10px] font-medium text-slate-400 text-center leading-tight">
                  Appeler<br />Manager
                </span>
              </button>
              <button
                onClick={() => window.open('https://wa.me/221781234567', '_blank')}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3 active:bg-slate-700/60 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                  <MessageCircle className="h-4 w-4 text-green-400" />
                </div>
                <span className="text-[10px] font-medium text-slate-400 text-center leading-tight">
                  WhatsApp<br />Pro
                </span>
              </button>
              <button
                onClick={() => router.push('/mobile/map')}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3 active:bg-slate-700/60 transition-colors"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <ClipboardList className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-[10px] font-medium text-slate-400 text-center leading-tight">
                  Voir Ma<br />Tournée
                </span>
              </button>
            </div>
          </div>

          {/* ── C. Today's Tour (Ma Tournée du Jour) ── */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Map className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Ma Tournée du Jour
                </h3>
              </div>
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                {data.tourClients.length} restants
              </Badge>
            </div>

            <div className="space-y-2">
              {data.tourClients.length === 0 ? (
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4 text-center">
                  <Zap className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-400">Tournée terminée !</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {data.todayVisits.length} visites effectuées aujourd&apos;hui
                  </p>
                </div>
              ) : (
                data.tourClients.map(client => (
                  <div
                    key={client.id}
                    className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', statusColor(client.status))} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-100 truncate">
                            {client.companyName}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {client.city || client.address || 'Non localisé'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                        <span className={cn('inline-block h-1.5 w-1.5 rounded-full mr-1', statusColor(client.status))} />
                        {statusLabel(client.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => window.open(`tel:${client.phone}`, '_self')}
                        className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 text-xs font-medium text-blue-400 active:bg-blue-500/20 transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Appeler
                      </button>
                      {client.latitude && client.longitude && (
                        <button
                          onClick={() => window.open(
                            `https://www.google.com/maps/dir/?api=1&destination=${client.latitude},${client.longitude}`,
                            '_blank'
                          )}
                          className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-500/10 text-xs font-medium text-violet-400 active:bg-violet-500/20 transition-colors"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          Itinéraire
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/mobile/visits/new?clientId=${client.id}`)}
                        className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 text-xs font-medium text-emerald-400 active:bg-emerald-500/20 transition-colors"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Visiter
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── D. Quick Stats Row ── */}
          <div className="px-4">
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                icon={<User className="h-4 w-4 text-emerald-500" />}
                label="Clients actifs"
                value={String(data.monthlyStats.activeClients)}
              />
              <StatCard
                icon={<Package className="h-4 w-4 text-blue-400" />}
                label="Commandes du mois"
                value={String(data.monthlyStats.orderCount)}
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4 text-amber-400" />}
                label="CA du mois"
                value={formatCurrency(data.monthlyStats.revenue)}
              />
              <StatCard
                icon={<Target className="h-4 w-4 text-violet-400" />}
                label="Taux de visite"
                value={`${data.monthlyStats.visitRate}%`}
              />
            </div>
          </div>

          {/* ── E. Recent Activity ── */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-200">Activité récente</h3>
              </div>
            </div>

            <div className="space-y-2">
              {data.recentActivity.length === 0 ? (
                <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4 text-center">
                  <p className="text-xs text-slate-500">Aucune activité récente</p>
                </div>
              ) : (
                data.recentActivity.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl bg-slate-800/40 border border-slate-700/30 p-3"
                  >
                    <div className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                      item.type === 'visit' ? 'bg-emerald-500/10' : 'bg-blue-500/10'
                    )}>
                      {item.type === 'visit' ? (
                        <MapPin className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Package className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{item.label}</p>
                      <p className="text-xs text-slate-500">{timeAgo(item.createdAt)}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Today summary */}
          <div className="px-4">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400 font-medium">Aujourd&apos;hui</p>
                  <p className="text-lg font-bold text-slate-100 mt-0.5">
                    {data.todayVisits.length} visites
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-400 font-medium">CA du jour</p>
                  <p className="text-lg font-bold text-slate-100 mt-0.5">
                    {formatCurrency(data.todayRevenue)}
                  </p>
                </div>
                <button
                  onClick={() => router.push('/mobile/visits/new')}
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/20 active:bg-emerald-600 transition-colors"
                >
                  <ArrowRight className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  )
}

// ─── Stat Card Component ───
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50">
          {icon}
        </div>
      </div>
      <p className="text-base font-bold text-slate-100 leading-tight">{value}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}

// ─── Skeleton Loader ───
function DashboardSkeleton() {
  return (
    <div className="space-y-4 px-4">
      {/* Greeting skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Objectives card skeleton */}
      <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2 w-full" />
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3 flex flex-col items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>

      {/* Tour skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3.5">
            <div className="flex items-center gap-2.5 mb-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-3 w-20 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
              <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3.5">
            <Skeleton className="h-8 w-8 rounded-lg mb-2" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
        ))}
      </div>

      {/* Activity skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3 flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
