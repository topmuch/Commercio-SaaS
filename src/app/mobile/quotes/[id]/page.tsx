'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, FileText, Clock, Package, ChevronRight,
  Loader2, AlertCircle, Phone, MessageCircle, Building2, MapPin,
  ShoppingBag, RefreshCw, CalendarClock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useOnlineStatus } from '@/hooks/use-online-status'

interface QuoteItem {
  id: string
  productId: string
  product?: { name: string; reference: string }
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface QuoteDetail {
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
    id: string
    companyName: string
    contactName: string
    phone: string
    whatsapp: string | null
    city: string | null
    address: string | null
  }
  commercial: { name: string } | null
  items: QuoteItem[]
}

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function MobileQuoteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const quoteId = params.id as string
  const isOnline = useOnlineStatus()

  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Devis non trouvé')
      }
      const json = await res.json()
      setQuote(json.data || json)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [quoteId])

  useEffect(() => {
    fetchQuote()
  }, [fetchQuote])

  // ── Convert quote to order ──
  const handleConvertToOrder = async () => {
    if (!quote || !isOnline) return
    if (!confirm(`Convertir le devis ${quote.number} en commande ?`)) return
    setConverting(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Erreur')
      }
      const json = await res.json()
      // Navigate to the new order
      const newOrderId = json.data?.order?.id
      if (newOrderId) {
        router.push(`/mobile/orders/${newOrderId}`)
      } else {
        router.push('/mobile/orders')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de la conversion'
      alert(msg)
    } finally {
      setConverting(false)
    }
  }

  // ── Send via WhatsApp ──
  const handleSendWhatsApp = () => {
    if (!quote?.client?.whatsapp) return
    const itemsText = quote.items
      ?.map((item) => `• ${item.product?.name || 'Produit'} : ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.totalPrice)}`)
      .join('\n') || ''
    const message = encodeURIComponent(
      `Bonjour ${quote.client.contactName},\n\nVoici votre devis ${quote.number} :\n\n${itemsText}\n\nTotal : ${formatCurrency(quote.total)}\n\nCe devis est valide jusqu'au ${quote.validUntil ? formatDate(quote.validUntil) : 'date non définie'}.\n\nCordialement.`
    )
    window.open(`https://wa.me/${quote.client!.whatsapp!.replace(/[^0-9]/g, '')}?text=${message}`, '_blank')
  }

  if (loading) return <DetailSkeleton />

  if (error || !quote) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50">
            <ArrowLeft className="h-4 w-4 text-slate-400" />
          </button>
          <h2 className="text-lg font-bold text-slate-100">Devis</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <AlertCircle className="h-12 w-12 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">{error || 'Devis non trouvé'}</p>
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

  const config = statusConfig(quote.status)
  const itemsTotal = quote.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 active:bg-slate-700">
          <ArrowLeft className="h-4 w-4 text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-100 truncate">{quote.number}</h2>
          <p className="text-xs text-slate-500">Détail du devis</p>
        </div>
        <Badge variant="outline" className={cn('text-[10px] px-2 py-0 border shrink-0', config.bg, config.color)}>
          {config.label}
        </Badge>
      </div>

      <div className="flex-1 px-4 pb-4 space-y-3">
        {/* Client info card */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <Building2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate">{quote.client?.companyName || '—'}</h3>
              <p className="text-xs text-slate-400">{quote.client?.contactName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Phone className="h-3 w-3 text-slate-600" />
                <span className="text-xs text-slate-500">{quote.client?.phone || '—'}</span>
              </div>
              {quote.client?.city && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3 w-3 text-slate-600" />
                  <span className="text-xs text-slate-500">{quote.client.city}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Quote info */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Créé le</span>
            <span className="text-xs text-slate-300 font-medium">{formatDate(quote.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Commercial</span>
            <span className="text-xs text-slate-300 font-medium">{quote.commercial?.name || '—'}</span>
          </div>
          {quote.validUntil && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarClock className="h-3 w-3 text-slate-600" />
                <span className="text-xs text-slate-500">Valide jusqu&apos;au</span>
              </div>
              <span className={cn(
                'text-xs font-medium',
                new Date(quote.validUntil) < new Date() ? 'text-red-400' : 'text-slate-300',
              )}>
                {formatDate(quote.validUntil)}
                {new Date(quote.validUntil) < new Date() && ' (expiré)'}
              </span>
            </div>
          )}
          {quote.notes && (
            <div className="rounded-lg bg-slate-700/30 p-3">
              <p className="text-xs text-slate-400">{quote.notes}</p>
            </div>
          )}
        </Card>

        {/* Line items */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-500" />
            Articles ({quote.items?.length || 0})
          </h3>
          <div className="space-y-2">
            {quote.items?.map((item, idx) => (
              <div key={item.id || idx} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm text-slate-200 truncate">{item.product?.name || `Produit #${idx + 1}`}</p>
                  <p className="text-[11px] text-slate-500">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
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
          {quote.discount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Remise</span>
              <span className="text-sm text-red-400">-{formatCurrency(quote.discount)}</span>
            </div>
          )}
          {quote.tax > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Taxe</span>
              <span className="text-sm text-slate-300">{formatCurrency(quote.tax)}</span>
            </div>
          )}
          <div className="border-t border-slate-700/50 pt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-100">Total</span>
            <span className="text-lg font-bold text-emerald-400">{formatCurrency(quote.total)}</span>
          </div>
        </Card>

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Convert to order (only when accepted) */}
          {quote.status === 'accepted' && (
            <button
              onClick={handleConvertToOrder}
              disabled={converting || !isOnline}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-white py-3 text-sm font-semibold active:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {converting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {converting ? 'Conversion en cours...' : 'Convertir en commande'}
            </button>
          )}

          {/* Send via WhatsApp */}
          {quote.client?.whatsapp && (
            <button
              onClick={handleSendWhatsApp}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-3 text-emerald-400 text-sm font-semibold active:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Envoyer par WhatsApp
            </button>
          )}
        </div>
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
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  )
}
