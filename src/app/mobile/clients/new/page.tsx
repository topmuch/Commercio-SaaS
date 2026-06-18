'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft, MapPin, Phone, Building2, User,
  CheckCircle2, Loader2, Camera, WifiOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useOnlineStatus } from '@/hooks/use-online-status'

interface NewClientData {
  companyName: string
  contactName: string
  phone: string
  whatsapp: string
  email: string
  address: string
  city: string
  type: string
  status: string
  notes: string
}

const clientTypes = [
  { value: 'boutique', label: 'Boutique', emoji: '🏪' },
  { value: 'revendeur', label: 'Revendeur', emoji: '👤' },
  { value: 'supermarche', label: 'Supermarché', emoji: '🏬' },
  { value: 'grossiste', label: 'Grossiste', emoji: '📦' },
]

const statusOptions = [
  { value: 'lead_rouge', label: 'Rouge', emoji: '🔴', desc: 'Nouveau prospect' },
  { value: 'negociation_orange', label: 'Orange', emoji: '🟠', desc: 'En négociation' },
  { value: 'client_vert', label: 'Vert', emoji: '🟢', desc: 'Client confirmé' },
]

export default function NewClientPage() {
  const router = useRouter()
  const { user } = useAppStore()
  const geo = useGeolocation(true)
  const isOnline = useOnlineStatus()

  const [form, setForm] = useState<NewClientData>({
    companyName: '',
    contactName: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: '',
    type: 'boutique',
    status: 'lead_rouge',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const updateField = (field: keyof NewClientData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = useCallback(async () => {
    if (!form.companyName.trim() || !form.contactName.trim() || !form.phone.trim()) {
      setError('Société, responsable et téléphone sont requis.')
      return
    }

    setSaving(true)
    setError(null)

    const body = {
      ...form,
      whatsapp: form.whatsapp || form.phone,
      commercialId: user?.id || undefined,
      latitude: geo.latitude || undefined,
      longitude: geo.longitude || undefined,
    }

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const json = await res.json()
        setSuccess(true)
        // Auto-redirect after 1.5s
        setTimeout(() => {
          if (window.history.length > 1) {
            router.back()
          } else {
            router.push('/mobile/dashboard')
          }
        }, 1500)
      } else {
        const json = await res.json()
        setError(json.error || 'Erreur lors de la création')
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setSaving(false)
    }
  }, [form, user, geo, router])

  if (success) {
    return (
      <div className="flex flex-col min-h-full">
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 mb-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Client créé !</h2>
          <p className="text-sm text-slate-400 mt-1">{form.companyName}</p>
          <p className="text-xs text-slate-500 mt-4">Retour en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400">
          <WifiOff className="h-3.5 w-3.5" />
          Hors-ligne — Certaines données ne seront pas synchronisées
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 border border-slate-700/50 active:bg-slate-700"
        >
          <ChevronLeft className="h-5 w-5 text-slate-300" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-slate-100">Nouveau Client</h1>
          <p className="text-xs text-slate-500">Créer un client sur le terrain</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {/* GPS info */}
        {geo.latitude && geo.longitude && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
            <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-400">
              Position GPS capturée : {geo.latitude.toFixed(5)}, {geo.longitude.toFixed(5)}
            </p>
          </div>
        )}

        {/* Company name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Nom de la société *
          </label>
          <input
            type="text"
            value={form.companyName}
            onChange={e => updateField('companyName', e.target.value)}
            placeholder="Ex: Boutique Almadie"
            className="w-full min-h-[48px] rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        {/* Contact name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            Responsable *
          </label>
          <input
            type="text"
            value={form.contactName}
            onChange={e => updateField('contactName', e.target.value)}
            placeholder="Ex: Mamadou Diallo"
            className="w-full min-h-[48px] rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            Téléphone *
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => updateField('phone', e.target.value)}
            placeholder="Ex: +221 77 123 45 67"
            className="w-full min-h-[48px] rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        {/* WhatsApp */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            📱 WhatsApp
          </label>
          <input
            type="tel"
            value={form.whatsapp}
            onChange={e => updateField('whatsapp', e.target.value)}
            placeholder="Même numéro ou différent"
            className="w-full min-h-[48px] rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            ✉️ Email (optionnel)
          </label>
          <input
            type="email"
            value={form.email}
            onChange={e => updateField('email', e.target.value)}
            placeholder="email@exemple.com"
            className="w-full min-h-[48px] rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Adresse
          </label>
          <input
            type="text"
            value={form.address}
            onChange={e => updateField('address', e.target.value)}
            placeholder="Ex: Rue 10, Médina"
            className="w-full min-h-[48px] rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Ville</label>
          <input
            type="text"
            value={form.city}
            onChange={e => updateField('city', e.target.value)}
            placeholder="Ex: Dakar"
            className="w-full min-h-[48px] rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>

        {/* Client type */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400">Type de client</label>
          <div className="grid grid-cols-2 gap-2">
            {clientTypes.map(t => (
              <button
                key={t.value}
                onClick={() => updateField('type', t.value)}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                  form.type === t.value
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 active:bg-slate-700/60'
                )}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400">Statut du prospect</label>
          <div className="grid grid-cols-3 gap-2">
            {statusOptions.map(s => (
              <button
                key={s.value}
                onClick={() => updateField('status', s.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-colors',
                  form.status === s.value
                    ? s.value === 'lead_rouge' ? 'bg-red-500/10 border-red-500/30 text-red-400'
                      : s.value === 'negociation_orange' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-500'
                )}
              >
                <span className="text-lg">{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => updateField('notes', e.target.value)}
            placeholder="Observations sur le client..."
            rows={3}
            className="w-full rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Sticky save button */}
      <div className="fixed bottom-16 left-0 right-0 z-30 border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-xl px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          onClick={handleSubmit}
          disabled={saving || !form.companyName.trim() || !form.contactName.trim() || !form.phone.trim()}
          className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-bold text-white disabled:opacity-40 active:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
          {saving ? 'Enregistrement...' : 'Créer le client'}
        </button>
      </div>
    </div>
  )
}
