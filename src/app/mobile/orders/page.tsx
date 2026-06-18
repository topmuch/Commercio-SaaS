'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, Plus, ShoppingBag, ChevronRight, Clock,
  Package, Filter, WifiOff, Loader2, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useOnlineStatus } from '@/hooks/use-online-status'

// ─── Types ───
interface Order {
  id: string
  number: string
  status: string
  total: number
  notes: string | null
  createdAt: string
  client: {
    companyName: string
    contactName: string
    phone: string
    whatsapp: string | null
    city: string | null
  }
  commercial: { name: string } | null
  itemCount: number
}

// ─── Helpers ───
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function statusConfig(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    new: { label: 'Nouvelle', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    validated: { label: 'Validée', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    preparation: { label: 'En préparation', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    shipped: { label: 'Expédiée', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    delivered: { label: 'Livrée', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  }
  return map[status] || { label: status, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' }
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

// ─── Tab filters ───
const tabs = [
  { key: 'all', label: 'Toutes' },
  { key: 'new', label: 'En attente' },
  { key: 'validated', label: 'Confirmées' },
  { key: 'delivered', label: 'Livré' },
]

// ─── Main Component ───
export default function MobileOrdersPage() {
  const router = useRouter()
  const isOnline = useOnlineStatus()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [showFilter, setShowFilter] = useState(false)
  const [pullDown, setPullDown] = useState(false)
  const [error, setError] = useState(false)

  const fetchOrders = useCallback(async (status?: string) => {
    try {
      setError(false)
      const params = new URLSearchParams({ limit: '50' })
      if (status && status !== 'all') params.set('status', status)
      const res = await fetch(`/api/mobile/orders?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setOrders(json.orders || [])
      }
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchOrders(activeTab)
      setLoading(false)
    }
    load()
  }, [activeTab, fetchOrders])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchOrders(activeTab)
    setRefreshing(false)
  }, [activeTab, fetchOrders])

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    setShowFilter(false)
  }, [])

  // Touch handling for pull-to-refresh
  const touchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      setPullDown(true)
    }
  }, [])

  const touchEnd = useCallback(() => {
    if (pullDown) {
      handleRefresh()
      setPullDown(false)
    }
  }, [pullDown, handleRefresh])

  return (
    <div className="flex flex-col min-h-full" onTouchStart={touchStart} onTouchEnd={touchEnd}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">Commandes</h2>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              {orders.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {!isOnline && (
              <WifiOff className="h-4 w-4 text-red-400" />
            )}
            <button
              onClick={() => setShowFilter(!showFilter)}
              aria-label="Filtrer"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                showFilter
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-slate-800/80 border border-slate-700/50 text-slate-400 active:bg-slate-700'
              )}
            >
              <Filter className="h-4 w-4" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Rafraîchir"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 active:bg-slate-700 transition-colors"
            >
              <RefreshCw className={cn('h-4 w-4 text-slate-400', refreshing && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* Pull to refresh indicator */}
      {pullDown && (
        <div className="flex justify-center py-2">
          <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
        </div>
      )}

      {/* Tab filters */}
      {showFilter && (
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'shrink-0 min-h-[36px] rounded-lg px-3 text-xs font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 active:bg-slate-700/60'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <WifiOff className="h-12 w-12 text-red-400 mb-3" />
          <p className="text-sm text-slate-400 mb-4">Erreur lors du chargement des données</p>
          <Button variant="outline" size="sm" onClick={() => fetchOrders(activeTab)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Réessayer
          </Button>
        </div>
      )}

      {/* Orders list */}
      <div className="flex-1 px-4 pb-4">
        {!error && loading && !refreshing ? (
          <OrdersSkeleton />
        ) : !error && orders.length === 0 ? (
          <EmptyState onCreateOrder={() => router.push('/mobile/orders/new')} />
        ) : (
          <div className="space-y-2">
            {orders.map(order => {
              const config = statusConfig(order.status)
              return (
                <button
                  key={order.id}
                  onClick={() => router.push(`/mobile/orders/${order.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3.5 text-left active:bg-slate-700/60 transition-colors"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
                    <Package className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-100 truncate">{order.number}</p>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', config.bg, config.color)}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{order.client?.companyName || '—'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-slate-600" />
                      <span className="text-[11px] text-slate-500">{timeAgo(order.createdAt)}</span>
                      <span className="text-[11px] text-slate-600">·</span>
                      <span className="text-[11px] text-slate-500">{order.itemCount} article{order.itemCount > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-100">{formatCurrency(order.total)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Empty State ───
function EmptyState({ onCreateOrder }: { onCreateOrder: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800/40 mb-4">
        <ShoppingBag className="h-10 w-10 text-slate-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-300 mb-1">Aucune commande</h3>
      <p className="text-sm text-slate-500 text-center mb-6">
        Commencez par créer votre première commande pour vos clients.
      </p>
      <button
        onClick={onCreateOrder}
        className="flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-white active:bg-emerald-600 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Créer une commande
      </button>
    </div>
  )
}

// ─── Skeleton ───
function OrdersSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-800/40 border border-slate-700/30 p-3.5">
          <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-20" />
          <ChevronRight className="h-4 w-4 text-slate-700 shrink-0" />
        </div>
      ))}
    </div>
  )
}
