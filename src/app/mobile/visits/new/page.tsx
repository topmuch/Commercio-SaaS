'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  MapPin, Phone, Camera, X, Clock, CheckCircle2, ChevronLeft,
  AlertCircle, WifiOff, MessageCircle, ShoppingCart, ArrowRight,
  Loader2, Search, UserPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { MobileInlineClientCreate } from '@/components/mobile/inline-client-create'
import type { CreatedClient } from '@/components/mobile/inline-client-create'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Types ───
interface ClientOption {
  id: string
  companyName: string
  contactName: string
  phone: string
  whatsapp: string | null
  address: string | null
  city: string | null
  status: string
  latitude: number | null
  longitude: number | null
}

interface VisitState {
  clientId: string | null
  client: ClientOption | null
  checkInTime: string | null
  checkOutTime: string | null
  checkInLat: number | null
  checkInLng: number | null
  checkOutLat: number | null
  checkOutLng: number | null
  notes: string
  photos: string[]
  status: string
}

type VisitPhase = 'select' | 'checkin' | 'inprogress' | 'checkout'

function statusLabel(status: string) {
  if (status === 'client_vert') return 'Vert'
  if (status === 'negociation_orange') return 'Orange'
  return 'Rouge'
}

function statusBg(status: string) {
  if (status === 'client_vert') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  if (status === 'negociation_orange') return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  return 'bg-red-500/10 text-red-400 border-red-500/20'
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

// ─── Main Component ───
function NewVisitPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: storeUser } = useAppStore()
  const geo = useGeolocation(true)
  const isOnline = useOnlineStatus()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showClientCreate, setShowClientCreate] = useState(false)

  const [phase, setPhase] = useState<VisitPhase>('select')
  const [visit, setVisit] = useState<VisitState>({
    clientId: null,
    client: null,
    checkInTime: null,
    checkOutTime: null,
    checkInLat: null,
    checkInLng: null,
    checkOutLat: null,
    checkOutLng: null,
    notes: '',
    photos: [],
    status: 'completed',
  })

  const [elapsedMs, setElapsedMs] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Timer for in-progress visits
  useEffect(() => {
    if (phase !== 'inprogress' || !visit.checkInTime) return
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - new Date(visit.checkInTime!).getTime())
    }, 1000)
    return () => clearInterval(interval)
  }, [phase, visit.checkInTime])

  // Fetch clients
  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch('/api/clients?limit=100')
        if (res.ok) {
          const json = await res.json()
          setClients(json.clients || [])
        }
      } catch {
        // Silently fail
      } finally {
        setClientsLoading(false)
      }
    }
    fetchClients()
  }, [])

  // If clientId from query param, pre-select and go to checkin
  useEffect(() => {
    const clientId = searchParams.get('clientId')
    if (clientId && clients.length > 0 && !visit.clientId) {
      const client = clients.find(c => c.id === clientId)
      if (client) {
        selectClient(client)
      }
    }
  }, [searchParams, clients])

  const selectClient = (client: ClientOption) => {
    setVisit(prev => ({ ...prev, clientId: client.id, client }))
    setPhase('checkin')
  }

  // Handle new client created inline
  const handleClientCreated = (client: CreatedClient) => {
    const fullClient: ClientOption = {
      ...client,
      status: 'lead_rouge',
      latitude: null,
      longitude: null,
    }
    setClients(prev => [fullClient, ...prev])
    setShowClientCreate(false)
    selectClient(fullClient)
  }

  // Check-in
  const handleCheckIn = () => {
    if (!geo.latitude || !geo.longitude) {
      setError('Géolocalisation requise pour le check-in. Vérifiez vos paramètres GPS.')
      return
    }
    setError(null)
    setVisit(prev => ({
      ...prev,
      checkInTime: new Date().toISOString(),
      checkInLat: geo.latitude,
      checkInLng: geo.longitude,
    }))
    setPhase('inprogress')
    setElapsedMs(0)
  }

  // Photo capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newPhotos: string[] = []
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        newPhotos.push(reader.result as string)
        if (newPhotos.length === files.length) {
          setVisit(prev => ({ ...prev, photos: [...prev.photos, ...newPhotos] }))
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  // Remove photo
  const removePhoto = (index: number) => {
    setVisit(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }))
  }

  // Check-out
  const handleCheckOut = () => {
    setVisit(prev => ({
      ...prev,
      checkOutTime: new Date().toISOString(),
      checkOutLat: geo.latitude,
      checkOutLng: geo.longitude,
    }))
    setPhase('checkout')
  }

  // Save visit
  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)

    const visitData = {
      clientId: visit.clientId,
      commercialId: storeUser?.id || 'usr_1',
      notes: visit.notes,
      latitude: visit.checkInLat,
      longitude: visit.checkInLng,
      status: 'completed',
      type: 'visit',
      photos: visit.photos,
    }

    try {
      const res = await fetch('/api/mobile/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitData),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur lors de la sauvegarde')
      }
      const json = await res.json()
      router.replace(`/mobile/visits/${json.visit.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
      setSaving(false)
    }
  }, [visit, storeUser, router])

  // ─── RENDER ───
  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
        <button
          onClick={() => {
            if (phase === 'select') router.back()
            else setPhase('select')
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 active:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-slate-300" />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-100">
            {phase === 'select' && 'Nouvelle Visite'}
            {phase === 'checkin' && 'Démarrer la visite'}
            {phase === 'inprogress' && 'Visite en cours'}
            {phase === 'checkout' && 'Résumé de la visite'}
          </h1>
          <p className="text-xs text-slate-500">
            {phase === 'select' && 'Sélectionnez un client'}
            {phase === 'checkin' && 'Confirmez le check-in'}
            {phase === 'inprogress' && `Chez ${visit.client?.companyName || '...'}`}
            {phase === 'checkout' && 'Visite terminée'}
          </p>
        </div>
        {!isOnline && (
          <Badge variant="outline" className="ml-auto bg-red-500/10 text-red-400 border-red-500/20 shrink-0">
            <WifiOff className="h-3 w-3 mr-1" /> Hors-ligne
          </Badge>
        )}
      </div>

      {/* Phase: Select Client */}
      {phase === 'select' && (
        <div className="flex-1">
          {/* Search */}
          <div className="px-4 pt-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher un client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700/50 pl-10 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Client list */}
          <div className="px-4 space-y-2">
            {/* Inline client creation toggle */}
            {!showClientCreate && (
              <button
                onClick={() => setShowClientCreate(true)}
                className="flex w-full items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 active:bg-emerald-500/15 transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                  <UserPlus className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-emerald-400">Créer un nouveau client</p>
                  <p className="text-[11px] text-emerald-400/50">Ajouter rapidement un client</p>
                </div>
              </button>
            )}

            {/* Inline client create form */}
            {showClientCreate && (
              <MobileInlineClientCreate
                onClientCreated={handleClientCreated}
                onCancel={() => setShowClientCreate(false)}
              />
            )}

            {clientsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              clients
                .filter(c => {
                  if (!searchQuery) return true
                  const q = searchQuery.toLowerCase()
                  return (
                    c.companyName.toLowerCase().includes(q) ||
                    c.contactName.toLowerCase().includes(q) ||
                    c.phone.includes(q)
                  )
                })
                .slice(0, 20)
                .map(client => (
                  <button
                    key={client.id}
                    onClick={() => selectClient(client)}
                    className="flex w-full items-center gap-3 rounded-xl bg-slate-800/60 border border-slate-700/50 p-3.5 text-left active:bg-slate-700/60 transition-colors"
                  >
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                      client.status === 'client_vert' ? 'bg-emerald-500/10 text-emerald-500' :
                      client.status === 'negociation_orange' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-red-500/10 text-red-400'
                    )}>
                      {client.companyName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">{client.companyName}</p>
                      <p className="text-xs text-slate-500 truncate">{client.contactName} · {client.city || client.address || 'Non localisé'}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] shrink-0', statusBg(client.status))}>
                      {statusLabel(client.status)}
                    </Badge>
                  </button>
                ))
            )}

            {!clientsLoading && clients.length === 0 && (
              <div className="text-center py-12">
                <MapPin className="h-8 w-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Aucun client trouvé</p>
                <p className="text-xs text-slate-600 mt-1">Créez d&apos;abord des clients depuis l&apos;application</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase: Check-in */}
      {phase === 'checkin' && visit.client && (
        <div className="flex-1 flex flex-col items-center px-4 pt-8">
          {/* Client info card */}
          <div className="w-full rounded-2xl bg-slate-800/60 border border-slate-700/50 p-5 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold',
                visit.client.status === 'client_vert' ? 'bg-emerald-500/10 text-emerald-500' :
                visit.client.status === 'negociation_orange' ? 'bg-orange-500/10 text-orange-400' :
                'bg-red-500/10 text-red-400'
              )}>
                {visit.client.companyName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-slate-100">{visit.client.companyName}</p>
                <p className="text-sm text-slate-500">{visit.client.contactName}</p>
              </div>
            </div>
            <div className="space-y-2">
              {visit.client.address && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{visit.client.address}</span>
                </div>
              )}
              {geo.latitude && geo.longitude ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>GPS: {geo.latitude.toFixed(5)}, {geo.longitude.toFixed(5)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Géolocalisation en cours...</span>
                  {geo.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              )}
            </div>
          </div>

          {/* Check-in button */}
          <button
            onClick={handleCheckIn}
            disabled={geo.loading || !geo.latitude}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30 active:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
          >
            <MapPin className="h-8 w-8 text-white" />
          </button>
          <p className="text-sm font-medium text-slate-300 mt-3">
            Appuyez pour démarrer la visite
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Position GPS sera enregistrée
          </p>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 w-full">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Phase: In Progress */}
      {phase === 'inprogress' && visit.client && (
        <div className="flex-1">
          {/* Timer header */}
          <div className="px-4 pt-6 pb-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-2 mb-3">
              <div className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </div>
              <span className="text-xs font-semibold text-amber-400">Visite en cours</span>
            </div>
            <p className="text-3xl font-bold text-slate-100 tabular-nums">
              {formatDuration(elapsedMs)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Check-in: {visit.checkInTime ? new Date(visit.checkInTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
          </div>

          <div className="px-4 space-y-4">
            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Notes de visite</label>
              <Textarea
                placeholder="Observations, commandes à suivre, remarques..."
                value={visit.notes}
                onChange={(e) => setVisit(prev => ({ ...prev, notes: e.target.value }))}
                className="min-h-[100px] bg-slate-800/80 border-slate-700/50 text-sm text-slate-100"
              />
            </div>

            {/* Photo capture */}
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Photos</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={handlePhotoCapture}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-xl bg-slate-800/80 border border-dashed border-slate-700/50 p-4 active:bg-slate-700/60 transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
                  <Camera className="h-5 w-5 text-slate-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-200">Prendre une photo</p>
                  <p className="text-xs text-slate-500">Rak, produits en rayon, etc.</p>
                </div>
              </button>
              {visit.photos.length > 0 && (
                <div className="flex gap-2 mt-2 overflow-x-auto">
                  {visit.photos.map((photo, i) => (
                    <div key={i} className="relative shrink-0">
                      <img
                        src={photo}
                        alt={`Photo ${i + 1}`}
                        className="h-16 w-16 rounded-lg object-cover border border-slate-700/50"
                      />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Client status change */}
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Statut du client</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'lead_rouge', label: 'Rouge', icon: '🔴', color: 'bg-red-500/10 border-red-500/30 text-red-400' },
                  { value: 'negociation_orange', label: 'Orange', icon: '🟠', color: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
                  { value: 'client_vert', label: 'Vert', icon: '🟢', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition-colors',
                      visit.client?.status === opt.value
                        ? opt.color
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-500'
                    )}
                  >
                    <span>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick order link */}
            <button
              onClick={() => {
                if (visit.clientId) {
                  router.push(`/mobile/orders/new?clientId=${visit.clientId}`)
                }
              }}
              className="flex w-full items-center gap-3 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 active:bg-blue-500/15 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <ShoppingCart className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-blue-300">Créer une commande</p>
                <p className="text-xs text-blue-400/60">Passer une commande pour ce client</p>
              </div>
              <ArrowRight className="h-4 w-4 text-blue-400/60" />
            </button>

            {/* Check-out button */}
            <div className="pt-4">
              <button
                onClick={handleCheckOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 py-4 text-sm font-semibold text-white active:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
              >
                <CheckCircle2 className="h-5 w-5" />
                Terminer la visite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase: Check-out Summary */}
      {phase === 'checkout' && visit.client && (
        <div className="flex-1 px-4 pt-6">
          {/* Success indicator */}
          <div className="text-center mb-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mb-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-slate-100">Visite terminée !</p>
            <p className="text-sm text-slate-500">
              {visit.client.companyName}
            </p>
          </div>

          {/* Summary card */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-5 mb-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Durée</span>
              <span className="text-sm font-semibold text-slate-100">
                {visit.checkInTime && visit.checkOutTime
                  ? formatDuration(new Date(visit.checkOutTime).getTime() - new Date(visit.checkInTime).getTime())
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Check-in</span>
              <span className="text-sm text-slate-300">
                {visit.checkInTime
                  ? new Date(visit.checkInTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Check-out</span>
              <span className="text-sm text-slate-300">
                {visit.checkOutTime
                  ? new Date(visit.checkOutTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '—'}
              </span>
            </div>
            {visit.photos.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Photos</span>
                <span className="text-sm text-slate-300">{visit.photos.length} photo(s)</span>
              </div>
            )}
            {visit.notes && (
              <div>
                <span className="text-xs text-slate-500 block mb-1">Notes</span>
                <p className="text-sm text-slate-300 bg-slate-700/30 rounded-lg p-2.5">{visit.notes}</p>
              </div>
            )}
          </div>

          {/* GPS coords */}
          {(visit.checkInLat || visit.checkOutLat) && (
            <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3 mb-4">
              <p className="text-xs text-slate-500 mb-1">Position GPS</p>
              <p className="text-xs text-slate-400 font-mono">
                Check-in: {visit.checkInLat?.toFixed(5)}, {visit.checkInLng?.toFixed(5)}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Check-out: {visit.checkOutLat?.toFixed(5)}, {visit.checkOutLng?.toFixed(5)}
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-4 text-sm font-semibold text-white active:bg-emerald-600 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/20"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Enregistrer la visite
                </>
              )}
            </button>

            <button
              onClick={() => {
                if (visit.client?.whatsapp) {
                  const msg = encodeURIComponent(
                    `Bonjour ${visit.client.contactName}, merci pour votre visite chez ${visit.client.companyName}. N'hésitez pas si vous avez des questions.`
                  )
                  window.open(`https://wa.me/${visit.client!.whatsapp!.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank')
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600/10 border border-green-600/20 py-3.5 text-sm font-medium text-green-400 active:bg-green-600/15 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Envoyer sur WhatsApp
            </button>

            <button
              onClick={() => {
                setVisit(prev => ({
                  ...prev,
                  clientId: null,
                  client: null,
                  checkInTime: null,
                  checkOutTime: null,
                  checkInLat: null,
                  checkInLng: null,
                  checkOutLat: null,
                  checkOutLng: null,
                  notes: '',
                  photos: [],
                  status: 'completed',
                }))
                setPhase('select')
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800/60 border border-slate-700/50 py-3.5 text-sm font-medium text-slate-300 active:bg-slate-700/60 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              Visite suivante
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NewVisitPage() {
  return (
    <Suspense>
      <NewVisitPageContent />
    </Suspense>
  )
}
