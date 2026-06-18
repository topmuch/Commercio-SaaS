'use client'

import { useState, useCallback } from 'react'
import {
  Building2, User, Phone, MapPin, CheckCircle2, Loader2, X, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

interface InlineClientData {
  companyName: string
  contactName: string
  phone: string
  whatsapp: string
  address: string
  city: string
  type: string
  status: string
}

export interface CreatedClient {
  id: string
  companyName: string
  contactName: string
  phone: string
  whatsapp: string | null
  address: string | null
  city: string | null
}

interface MobileInlineClientCreateProps {
  onClientCreated: (client: CreatedClient) => void
  onCancel: () => void
}

export function MobileInlineClientCreate({ onClientCreated, onCancel }: MobileInlineClientCreateProps) {
  const { user } = useAppStore()
  const [expanded, setExpanded] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<InlineClientData>({
    companyName: '',
    contactName: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    type: 'boutique',
    status: 'lead_rouge',
  })

  const updateField = (field: keyof InlineClientData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = useCallback(async () => {
    if (!form.companyName.trim() || !form.contactName.trim() || !form.phone.trim()) {
      setError('Société, responsable et téléphone sont requis.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          whatsapp: form.whatsapp || form.phone,
          commercialId: user?.id || undefined,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        onClientCreated(json.client)
      } else {
        const json = await res.json()
        setError(json.error || 'Erreur lors de la création')
      }
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setSaving(false)
    }
  }, [form, user, onClientCreated])

  const isValid = form.companyName.trim() && form.contactName.trim() && form.phone.trim()

  return (
    <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
          <span className="text-sm">➕</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-emerald-400">Nouveau client</p>
          <p className="text-[11px] text-slate-500">Créer rapidement un client</p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        )}
      </button>

      {/* Form content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Company name */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Société *
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={e => updateField('companyName', e.target.value)}
              placeholder="Nom de la boutique"
              className="w-full min-h-[44px] rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>

          {/* Contact + Phone row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <User className="h-3 w-3" /> Responsable *
              </label>
              <input
                type="text"
                value={form.contactName}
                onChange={e => updateField('contactName', e.target.value)}
                placeholder="Prénom Nom"
                className="w-full min-h-[44px] rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Phone className="h-3 w-3" /> Téléphone *
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => updateField('phone', e.target.value)}
                placeholder="+221 77..."
                className="w-full min-h-[44px] rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* WhatsApp + City row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">📱 WhatsApp</label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={e => updateField('whatsapp', e.target.value)}
                placeholder="Numéro WhatsApp"
                className="w-full min-h-[44px] rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Ville
              </label>
              <input
                type="text"
                value={form.city}
                onChange={e => updateField('city', e.target.value)}
                placeholder="Dakar"
                className="w-full min-h-[44px] rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
          </div>

          {/* Type and Status row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Type</label>
              <select
                value={form.type}
                onChange={e => updateField('type', e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="boutique">🏪 Boutique</option>
                <option value="revendeur">👤 Revendeur</option>
                <option value="supermarche">🏬 Supermarché</option>
                <option value="grossiste">📦 Grossiste</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Statut</label>
              <select
                value={form.status}
                onChange={e => updateField('status', e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 text-sm text-slate-100 focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="lead_rouge">🔴 Rouge</option>
                <option value="negociation_orange">🟠 Orange</option>
                <option value="client_vert">🟢 Vert</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
              <p className="text-[11px] text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex min-h-[44px] items-center justify-center rounded-lg bg-slate-800/60 border border-slate-700/50 px-4 text-sm text-slate-400 active:bg-slate-700/60"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !isValid}
              className="flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-lg bg-emerald-500 text-sm font-semibold text-white disabled:opacity-40 active:bg-emerald-600"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {saving ? 'Création...' : 'Créer et sélectionner'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
