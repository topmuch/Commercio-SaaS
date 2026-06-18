'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Package, Clock, ChevronRight,
  Loader2, AlertCircle, Phone, MessageCircle, Building2, MapPin,
  ShoppingBag, CheckCircle2, Truck, PackageCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useOnlineStatus } from '@/hooks/use-online-status'

// ─── Types ───
interface OrderItem {
  id: string
  productId: string
  product?: { name: string; reference: string }
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface OrderDetail {
  id: string
  number: string
  status: string
  total: number
  discount: number
  tax: number
  notes: string | null
  createdAt: string
  updatedAt: string
  client: {
    companyName: string
    contactName: string
    phone: string
    whatsapp: string | null
    city: string | null
    address: string | null
  }
  commercial: { name: string } | null
  items: OrderItem[]
}

// ─── Helpers ───
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function statusConfig(status: string) {
  const map: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    new: { label: 'Nouvelle', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: 'clock' },
    validated: { label: 'Validée', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: 'check' },
    preparation: { label: 'En préparation', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: 'package' },
    shipped: { label: 'Expédiée', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', icon: 'truck' },
    delivered: { label: 'Livrée', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: 'check-circle' },
  }
  return map[status] || { label: status, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', icon: 'clock' }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

const STATUS_STEPS = ['new', 'validated', 'preparation', 'shipped', 'delivered'] as const

// ─── Main Component ───
export default function MobileOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string
  const isOnline = useOnlineStatus()

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Commande non trouvée')
      }
      const json = await res.json()
      setOrder(json.data || json)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  // ── Mark as delivered ──
  const handleMarkDelivered = async () => {
    if (!order || !isOnline) return
    if (!confirm('Marquer cette commande comme livrée ?')) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur')
      }
      const json = await res.json()
      setOrder(json.data || json)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
      alert(msg)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <DetailSkeleton />

  if (error || !order) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50">
            <ArrowLeft className="h-4 w-4 text-slate-400" />
          </button>
          <h2 className="text-lg font-bold text-slate-100">Commande</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <AlertCircle className="h-12 w-12 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">{error || 'Commande non trouvée'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        </div>
      </div>
    )
  }

  const config = statusConfig(order.status)
  const currentStepIndex = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number])
  const itemsTotal = order.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 active:bg-slate-700">
          <ArrowLeft className="h-4 w-4 text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-100 truncate">{order.number}</h2>
          <p className="text-xs text-slate-500">Détail de la commande</p>
        </div>
        <Badge variant="outline" className={cn('text-[10px] px-2 py-0 border shrink-0', config.bg, config.color)}>
          {config.label}
        </Badge>
      </div>

      <div className="flex-1 px-4 pb-4 space-y-3">
        {/* Status tracker */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4">
          <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Suivi de la commande</h3>
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, idx) => {
              const stepConfig = statusConfig(step)
              const isCompleted = idx <= currentStepIndex
              const isCurrent = idx === currentStepIndex
              const labels = ['Nouvelle', 'Validée', 'Prép.', 'Exp.', 'Livrée']
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                      isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-700/50 text-slate-500',
                      isCurrent && 'ring-2 ring-emerald-500/30 ring-offset-1 ring-offset-slate-800',
                    )}>
                      {isCompleted && step !== 'new' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCurrent ? (
                        <Clock className="h-4 w-4" />
                      ) : (
                        <span className="text-[10px]">{idx + 1}</span>
                      )}
                    </div>
                    <span className={cn(
                      'text-[10px] mt-1.5 text-center leading-tight',
                      isCompleted ? 'text-emerald-400' : 'text-slate-600',
                    )}>
                      {labels[idx]}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={cn(
                      'h-0.5 flex-1 mx-1 rounded-full -mt-4',
                      idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-700/50',
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* Client info card */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <Building2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate">{order.client?.companyName || '—'}</h3>
              <p className="text-xs text-slate-400">{order.client?.contactName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Phone className="h-3 w-3 text-slate-600" />
                <span className="text-xs text-slate-500">{order.client?.phone || '—'}</span>
              </div>
              {order.client?.city && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3 w-3 text-slate-600" />
                  <span className="text-xs text-slate-500">{order.client.city}</span>
                </div>
              )}
            </div>
          </div>
          {/* WhatsApp action */}
          {order.client?.whatsapp && (
            <button
              onClick={() => window.open(`https://wa.me/${order.client!.whatsapp!.replace(/[^0-9]/g, '')}`, '_blank')}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-emerald-400 text-sm font-medium active:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Contacter via WhatsApp
            </button>
          )}
        </Card>

        {/* Order info */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Créée le</span>
            <span className="text-xs text-slate-300 font-medium">{formatDate(order.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Modifiée le</span>
            <span className="text-xs text-slate-300 font-medium">{formatDate(order.updatedAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Commercial</span>
            <span className="text-xs text-slate-300 font-medium">{order.commercial?.name || '—'}</span>
          </div>
          {order.notes && (
            <div className="rounded-lg bg-slate-700/30 p-3">
              <p className="text-xs text-slate-400">{order.notes}</p>
            </div>
          )}
        </Card>

        {/* Line items */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-500" />
            Articles ({order.items?.length || 0})
          </h3>
          <div className="space-y-2">
            {order.items?.map((item, idx) => (
              <div key={item.id || idx} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm text-slate-200 truncate">{item.product?.name || `Produit #${idx + 1}`}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-100 shrink-0">
                  {formatCurrency(item.totalPrice)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Totals */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Sous-total</span>
            <span className="text-sm text-slate-300">{formatCurrency(itemsTotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Remise</span>
              <span className="text-sm text-red-400">-{formatCurrency(order.discount)}</span>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Taxe</span>
              <span className="text-sm text-slate-300">{formatCurrency(order.tax)}</span>
            </div>
          )}
          <div className="border-t border-slate-700/50 pt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-100">Total</span>
            <span className="text-lg font-bold text-emerald-400">{formatCurrency(order.total)}</span>
          </div>
        </Card>

        {/* Mark as delivered button (only when shipped) */}
        {order.status === 'shipped' && (
          <button
            onClick={handleMarkDelivered}
            disabled={updating || !isOnline}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-white py-3 text-sm font-semibold active:bg-emerald-600 transition-colors disabled:opacity-50"
          >
            {updating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PackageCheck className="h-4 w-4" />
            )}
            {updating ? 'Mise à jour...' : 'Marquer comme livrée'}
          </button>
        )}
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex-1 px-4 pb-4 space-y-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  )
}
