'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, Plus, ChevronRight, Clock, WifiOff, Loader2,
  FileText, Filter, TrendingUp, TrendingDown, AlertCircle,
  CreditCard, DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useOnlineStatus } from '@/hooks/use-online-status'

// ─── Types ───
interface Invoice {
  id: string
  number: string
  status: string
  total: number
  paidAmount: number
  notes: string | null
  dueDate: string | null
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

interface Kpi {
  totalInvoiced: number
  totalPaid: number
  totalUnpaid: number
}

interface StatusCounts {
  all: number
  unpaid: number
  partially_paid: number
  paid: number
  overdue: number
}

// ─── Helpers ───
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function statusConfig(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    unpaid: { label: 'Impayé', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    partially_paid: { label: 'Partiel', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    paid: { label: 'Payé', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    overdue: { label: 'En retard', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
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

function formatDueDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Tab filters ───
const tabs = [
  { key: '', label: 'Tous' },
  { key: 'unpaid', label: 'Impayé' },
  { key: 'partially_paid', label: 'Partiel' },
  { key: 'paid', label: 'Payé' },
  { key: 'overdue', label: 'En retard' },
]

// ─── Main Component ───
export default function MobileInvoicesPage() {
  const router = useRouter()
  const isOnline = useOnlineStatus()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [pullDown, setPullDown] = useState(false)
  const [error, setError] = useState(false)

  // KPI data
  const [kpi, setKpi] = useState<Kpi | null>(null)
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0,
    unpaid: 0,
    partially_paid: 0,
    paid: 0,
    overdue: 0,
  })

  const fetchInvoices = useCallback(async (status?: string) => {
    try {
      setError(false)
      const params = new URLSearchParams({ limit: '20' })
      if (status) params.set('status', status)
      const res = await fetch(`/api/invoices?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setInvoices(json.data || [])
        if (json.kpi) {
          setKpi(json.kpi)
        }
        if (json.statusCounts) {
          setStatusCounts(json.statusCounts)
        }
      }
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await fetchInvoices(activeTab)
      setLoading(false)
    }
    load()
  }, [activeTab, fetchInvoices])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchInvoices(activeTab)
    setRefreshing(false)
  }, [activeTab, fetchInvoices])

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

  const invoiceCount = invoices.length

  return (
    <div className="flex flex-col min-h-full" onTouchStart={touchStart} onTouchEnd={touchEnd}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">Factures</h2>
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              {statusCounts[activeTab as keyof StatusCounts] || invoiceCount}
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

      {/* KPI Summary */}
      {kpi && activeTab === '' && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-[10px] font-medium text-slate-500">Total facturé</span>
              </div>
              <p className="text-sm font-bold text-slate-100 truncate">{formatCurrency(kpi.totalInvoiced)}</p>
            </div>
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                <span className="text-[10px] font-medium text-slate-500">Total payé</span>
              </div>
              <p className="text-sm font-bold text-green-400 truncate">{formatCurrency(kpi.totalPaid)}</p>
            </div>
            <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[10px] font-medium text-slate-500">Total impayé</span>
              </div>
              <p className="text-sm font-bold text-red-400 truncate">{formatCurrency(kpi.totalUnpaid)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <WifiOff className="h-12 w-12 text-red-400 mb-3" />
          <p className="text-sm text-slate-400 mb-4">Erreur lors du chargement des données</p>
          <Button variant="outline" size="sm" onClick={() => fetchInvoices(activeTab)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Réessayer
          </Button>
        </div>
      )}

      {/* Invoices list */}
      <div className="flex-1 px-4 pb-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {!error && loading && !refreshing ? (
          <InvoicesSkeleton />
        ) : !error && invoices.length === 0 ? (
          <EmptyState onCreateInvoice={() => router.push('/mobile/invoices/new')} />
        ) : (
          <div className="space-y-2">
            {invoices.map(invoice => {
              const config = statusConfig(invoice.status)
              const paidPercent = invoice.total > 0 ? Math.min(100, Math.round((invoice.paidAmount / invoice.total) * 100)) : 0
              return (
                <button
                  key={invoice.id}
                  onClick={() => router.push(`/mobile/invoices/${invoice.id}`)}
                  className="flex w-full items-start gap-3 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3.5 text-left active:bg-slate-700/60 transition-colors"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
                    <FileText className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Number + status badge */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-slate-100 truncate">{invoice.number}</p>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border shrink-0', config.bg, config.color)}>
                        {config.label}
                      </Badge>
                    </div>

                    {/* Client */}
                    <p className="text-xs text-slate-400 truncate">{invoice.client?.companyName || '—'}</p>

                    {/* Dates */}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-slate-600" />
                      <span className="text-[11px] text-slate-500">{timeAgo(invoice.createdAt)}</span>
                      {invoice.dueDate && (
                        <>
                          <span className="text-[11px] text-slate-600">·</span>
                          <span className="text-[11px] text-slate-500">Échéance: {formatDueDate(invoice.dueDate)}</span>
                        </>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-500">{paidPercent}% payé</span>
                        <span className="text-[10px] text-slate-500">{formatCurrency(invoice.paidAmount)} / {formatCurrency(invoice.total)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-700/50 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            paidPercent === 100
                              ? 'bg-green-500'
                              : paidPercent > 0
                                ? 'bg-amber-500'
                                : 'bg-slate-600'
                          )}
                          style={{ width: `${paidPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pt-0.5">
                    <p className="text-sm font-bold text-slate-100">{formatCurrency(invoice.total)}</p>
                    {invoice.status === 'paid' && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <CreditCard className="h-3 w-3 text-green-500" />
                        <span className="text-[10px] text-green-400">Soldé</span>
                      </div>
                    )}
                    {invoice.status === 'overdue' && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <AlertCircle className="h-3 w-3 text-purple-400" />
                        <span className="text-[10px] text-purple-400">En retard</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 shrink-0 mt-2" />
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
function EmptyState({ onCreateInvoice }: { onCreateInvoice: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-800/40 mb-4">
        <FileText className="h-10 w-10 text-slate-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-300 mb-1">Aucune facture</h3>
      <p className="text-sm text-slate-500 text-center mb-6">
        Commencez par créer votre première facture pour vos clients.
      </p>
      <button
        onClick={onCreateInvoice}
        className="flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-white active:bg-emerald-600 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Créer une facture
      </button>
    </div>
  )
}

// ─── Skeleton ───
function InvoicesSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-800/40 border border-slate-700/30 p-3.5">
          <Skeleton className="h-11 w-11 rounded-lg shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-20" />
            <div className="h-1.5 w-full rounded-full bg-slate-700/50 mt-1" />
          </div>
          <Skeleton className="h-4 w-20" />
          <ChevronRight className="h-4 w-4 text-slate-700 shrink-0" />
        </div>
      ))}
    </div>
  )
}
