'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, FileText, Clock, Package, ChevronRight,
  Loader2, AlertCircle, Phone, MessageCircle, Building2, MapPin,
  CreditCard, DollarSign, Calendar, Download, Printer, Mail,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useOnlineStatus } from '@/hooks/use-online-status'

// ─── Types ───
interface InvoiceItem {
  id: string
  productId: string
  product?: { name: string; reference: string }
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface Payment {
  id: string
  amount: number
  method: string
  reference: string | null
  status: string
  createdAt: string
}

interface InvoiceDetail {
  id: string
  number: string
  status: string
  total: number
  paid: number
  discount: number
  tax: number
  dueDate: string | null
  notes: string | null
  createdAt: string
  client: {
    companyName: string
    contactName: string
    phone: string
    whatsapp: string | null
    city: string | null
    address: string | null
    email: string | null
  }
  commercial: { name: string } | null
  items: InvoiceItem[]
  payments: Payment[]
}

// ─── Helpers ───
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function statusConfig(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    unpaid: { label: 'Impayée', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    partially_paid: { label: 'Partielle', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    paid: { label: 'Payée', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    overdue: { label: 'En retard', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  }
  return map[status] || { label: status, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    cash: 'Espèces',
    bank_transfer: 'Virement',
    check: 'Chèque',
    mobile_payment: 'Mobile Money',
  }
  return map[method] || method
}

// ─── Main Component ───
export default function MobileInvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string
  const isOnline = useOnlineStatus()

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoice = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Facture non trouvée')
      }
      const json = await res.json()
      setInvoice(json.data || json)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    fetchInvoice()
  }, [fetchInvoice])

  if (loading) return <DetailSkeleton />

  if (error || !invoice) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50">
            <ArrowLeft className="h-4 w-4 text-slate-400" />
          </button>
          <h2 className="text-lg font-bold text-slate-100">Facture</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <AlertCircle className="h-12 w-12 text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">{error || 'Facture non trouvée'}</p>
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

  // ── Action handlers ──
  const handleDownloadPDF = async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`)
      if (!res.ok) throw new Error('Erreur lors du téléchargement')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Erreur lors du téléchargement du PDF')
    }
  }

  const handleEmail = () => {
    const subject = encodeURIComponent(`Facture ${invoice.number}`)
    const body = encodeURIComponent(
      `Bonjour ${invoice.client?.contactName},\n\nVeuillez trouver ci-joint la facture ${invoice.number} d'un montant de ${formatCurrency(invoice.total)}.\n\nCordialement.`
    )
    const mailto = invoice.client?.email
      ? `mailto:${invoice.client.email}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`
    window.open(mailto, '_self')
  }

  const handleWhatsApp = () => {
    if (!invoice?.client?.whatsapp) {
      alert('Ce client n\'a pas de numéro WhatsApp')
      return
    }
    const itemsText = invoice.items
      ?.map((item) => `• ${item.product?.name || 'Produit'} : ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.totalPrice)}`)
      .join('\n') || ''
    const paymentText = invoice.paid > 0
      ? `\n\n💰 Payé: ${formatCurrency(invoice.paid)}${invoice.paid < invoice.total ? ` / Reste à payer: ${formatCurrency(invoice.total - invoice.paid)}` : ''}`
      : ''
    const message = encodeURIComponent(
      `Bonjour ${invoice.client.contactName},\n\n📄 *Facture ${invoice.number}*\n\n${itemsText}\n\n━━━━━━━━━━━━━━━\n*Total: ${formatCurrency(invoice.total)}*${paymentText}\n\n${invoice.dueDate ? `📅 Échéance: ${formatDate(invoice.dueDate)}\n` : ''}Cordialement.`
    )
    window.open(`https://wa.me/${invoice.client!.whatsapp!.replace(/[^0-9]/g, '')}?text=${message}`, '_blank')
  }

  const handlePrint = () => {
    window.print()
  }

  const config = statusConfig(invoice.status)
  const paidPercent = invoice.total > 0 ? Math.min(100, Math.round((invoice.paid / invoice.total) * 100)) : 0
  const remaining = Math.max(0, invoice.total - invoice.paid)
  const itemsTotal = invoice.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 active:bg-slate-700">
          <ArrowLeft className="h-4 w-4 text-slate-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-100 truncate">{invoice.number}</h2>
          <p className="text-xs text-slate-500">Détail de la facture</p>
        </div>
        <Badge variant="outline" className={cn('text-[10px] px-2 py-0 border shrink-0', config.bg, config.color)}>
          {config.label}
        </Badge>
      </div>

      <div className="flex-1 px-4 pb-24 space-y-3">
        {/* Payment progress */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Progression du paiement</span>
            <span className={cn('text-xs font-semibold', paidPercent === 100 ? 'text-emerald-400' : 'text-slate-300')}>
              {paidPercent}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-700/50 overflow-hidden mb-2">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                paidPercent === 100 ? 'bg-emerald-500' : paidPercent > 0 ? 'bg-amber-500' : 'bg-slate-600',
              )}
              style={{ width: `${paidPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-400 font-medium">Payé: {formatCurrency(invoice.paid)}</span>
            </div>
            {remaining > 0 && (
              <div className="flex items-center gap-1">
                <CreditCard className="h-3 w-3 text-red-400" />
                <span className="text-red-400 font-medium">Reste: {formatCurrency(remaining)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Client info card */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
              <Building2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate">{invoice.client?.companyName || '—'}</h3>
              <p className="text-xs text-slate-400">{invoice.client?.contactName}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Phone className="h-3 w-3 text-slate-600" />
                <span className="text-xs text-slate-500">{invoice.client?.phone || '—'}</span>
              </div>
              {invoice.client?.city && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3 w-3 text-slate-600" />
                  <span className="text-xs text-slate-500">{invoice.client.city}</span>
                </div>
              )}
            </div>
          </div>
          {/* WhatsApp action */}
          {invoice.client?.whatsapp && (
            <button
              onClick={() => window.open(`https://wa.me/${invoice.client!.whatsapp!.replace(/[^0-9]/g, '')}`, '_blank')}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-2.5 text-emerald-400 text-sm font-medium active:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Envoyer via WhatsApp
            </button>
          )}
        </Card>

        {/* Invoice info */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Créée le</span>
            <span className="text-xs text-slate-300 font-medium">{formatDate(invoice.createdAt)}</span>
          </div>
          {invoice.dueDate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-slate-600" />
                <span className="text-xs text-slate-500">Échéance</span>
              </div>
              <span className={cn('text-xs font-medium', invoice.status === 'overdue' ? 'text-red-400' : 'text-slate-300')}>
                {formatDate(invoice.dueDate)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Commercial</span>
            <span className="text-xs text-slate-300 font-medium">{invoice.commercial?.name || '—'}</span>
          </div>
          {invoice.notes && (
            <div className="rounded-lg bg-slate-700/30 p-3">
              <p className="text-xs text-slate-400">{invoice.notes}</p>
            </div>
          )}
        </Card>

        {/* Line items */}
        <Card className="bg-slate-800/60 border-slate-700/50 p-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-emerald-500" />
            Articles ({invoice.items?.length || 0})
          </h3>
          <div className="space-y-2">
            {invoice.items?.map((item, idx) => (
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
          {invoice.discount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Remise</span>
              <span className="text-sm text-red-400">-{formatCurrency(invoice.discount)}</span>
            </div>
          )}
          {invoice.tax > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Taxe</span>
              <span className="text-sm text-slate-300">{formatCurrency(invoice.tax)}</span>
            </div>
          )}
          <div className="border-t border-slate-700/50 pt-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-100">Total</span>
            <span className="text-lg font-bold text-emerald-400">{formatCurrency(invoice.total)}</span>
          </div>
        </Card>

        {/* Payments history */}
        {invoice.payments?.length > 0 && (
          <Card className="bg-slate-800/60 border-slate-700/50 p-4">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500" />
              Paiements ({invoice.payments.length})
            </h3>
            <div className="space-y-2">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-slate-700/30 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-emerald-400">{formatCurrency(payment.amount)}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-600 text-slate-400">
                        {paymentMethodLabel(payment.method)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {formatDate(payment.createdAt)}
                      {payment.reference && ` · Ref: ${payment.reference}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 px-4 py-3 flex gap-2 shrink-0">
        <button
          onClick={handleDownloadPDF}
          disabled={!isOnline}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-white py-2.5 text-xs font-medium active:bg-emerald-600 transition-colors disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          PDF
        </button>
        <button
          onClick={handleEmail}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 text-white py-2.5 text-xs font-medium active:bg-sky-600 transition-colors"
        >
          <Mail className="h-4 w-4" />
          Email
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white py-2.5 text-xs font-medium active:bg-emerald-700 transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-700 text-slate-200 py-2.5 text-xs font-medium active:bg-slate-600 transition-colors"
        >
          <Printer className="h-4 w-4" />
          Imprimer
        </button>
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
      <div className="flex-1 px-4 pb-24 space-y-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  )
}
