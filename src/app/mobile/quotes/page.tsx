'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, Plus, FileText, ChevronRight, Clock,
  Package, Filter, WifiOff, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useOnlineStatus } from '@/hooks/use-online-status'

// ─── Types ───
interface Quote {
  id: string
  number: string
  status: string
  total: number
  discount: number
  tax: number
  notes: string | null
  validUntil: string | null
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
    draft: { label: 'Brouillon', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
    sent: { label: 'Envoyé', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    accepted: { label: 'Accepté', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    refused: { label: 'Refusé', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
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
  { key: '', label: 'Tous' },
  { key: 'draft', label: 'Brouillon' },
  { key: 'sent', label: 'Envoyé' },
  { key: 'accepted', label: 'Accepté' },
  { key: 'refused', label: 'Refusé' },
]

// ─── Main Component ───
export default function MobileQuotesPage() {
  const router = useRouter()
  const isOnline = useOnlineStatus()

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [pullDown, setPullDown] = useState(false)
  const [error, setError] = useState(false)

  const fetchQuotes = useCallback(async (status?: string) => {
    try {
      setError(false)
      const params = new URLSearchParams({ limit: '20' })
      if (status) params.set('status', status)
      const res = await fetch(`/api/quotes?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setQuotes(json.data || [])
      }
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchQuotes(activeTab)
      setLoading(false)
    }
    load()
  }, [activeTab, fetchQuotes])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchQuotes(activeTab)
    setRefreshing(false)
  }, [activeTab, fetchQuotes])

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
            <h2 className="text-lg font-bold text-slate-100">Devis</h2>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              {quotes.length}
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

      {/* Error banner */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <WifiOff className="h-12 w-12 text-red-400 mb-3" />
          <p className="text-sm text-slate-400 mb-4">Erreur lors du chargement des données</p>
          <Button variant="outline" size="sm" onClick={() => fetchQuotes(activeTab)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Réessayer
          </Button>
        </div>
      )}

      {/* Quotes list */}
      <div className="flex-1 px-4 pb-4">
        {!error && loading && !refreshing ? (
          <QuotesSkeleton />
        ) : !error && quotes.length === 0 ? (
          <EmptyState onCreateQuote={() => router.push('/mobile/quotes/new')} />
        ) : (
          <div className="space-y-2">
            {quotes.map(quote => {
              const config = statusConfig(quote.status)
              return (
                <button
                  key={quote.id}
                  onClick={() => router.push(`/mobile/quotes/${quote.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3.5 text-left active:bg-slate-700/60 transition-colors"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
                    <FileText className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-100 truncate">{quote.number}</p>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', config.bg, config.color)}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{quote.client?.companyName || '—'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-slate-600" />
                      <span className="text-[11px] text-slate-500">{timeAgo(quote.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-100">{formatCurrency(quote.total)}</p>
                    <p className="text-[11px] text-slate-500">FCFA</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB — Create new quote */}
      <div className="fixed bottom-20 right-4 pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => router.push('/mobile/quotes/new')}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 active:bg-emerald-600 transition-colors"
        >
          <Plus className="h-6 w-6 text-white" />
        </button>
      </div>
    </div>
  )
}

// ─── Empty State ───
function EmptyState({ onCreateQuote }: { onCreateQuote: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800/40 mb-4">
        <FileText className="h-10 w-10 text-slate-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-300 mb-1">Aucun devis</h3>
      <p className="text-sm text-slate-500 text-center mb-6">
        Commencez par créer votre premier devis pour vos clients.
      </p>
      <button
        onClick={onCreateQuote}
        className="flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-white active:bg-emerald-600 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Créer un devis
      </button>
    </div>
  )
}

// ─── Skeleton ───
function QuotesSkeleton() {
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
