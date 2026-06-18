'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  MapPin, Phone, Clock, CheckCircle2, ChevronLeft, Camera,
  Navigation, MessageCircle, Share2, Loader2, AlertCircle,
  Calendar, ArrowRight, Trash2, Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

// ─── Types ───
interface VisitDetail {
  id: string
  type: string
  notes: string | null
  status: string
  latitude: number | null
  longitude: number | null
  createdAt: string
  client: {
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
  commercial: {
    id: string
    name: string
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

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

// ─── Main Component ───
export default function VisitDetailPage() {
  const router = useRouter()
  const params = useParams()
  const visitId = params.id as string

  const [visit, setVisit] = useState<VisitDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editedNotes, setEditedNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<string[]>([])

  // Fetch visit detail
  useEffect(() => {
    async function fetchVisit() {
      try {
        // First try the mobile visits API
        const res = await fetch('/api/mobile/visits')
        if (res.ok) {
          const json = await res.json()
          const found = json.visits?.find((v: VisitDetail) => v.id === visitId)
          if (found) {
            setVisit(found)
            setEditedNotes(found.notes || '')
          }
        }

        // If not found, try fetching from interactions
        if (!visit) {
          // Fallback: try to reconstruct from the main visits endpoint
          const allRes = await fetch(`/api/mobile/visits?limit=100`)
          if (allRes.ok) {
            const allJson = await allRes.json()
            const allFound = allJson.visits?.find((v: VisitDetail) => v.id === visitId)
            if (allFound) {
              setVisit(allFound)
              setEditedNotes(allFound.notes || '')
            }
          }
        }
      } catch {
        setError('Impossible de charger la visite')
      } finally {
        setLoading(false)
      }
    }
    fetchVisit()
  }, [visitId])

  // Save notes
  const handleSaveNotes = useCallback(async () => {
    if (!visit) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/mobile/visits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: visit.id, notes: editedNotes }),
      })
      if (res.ok) {
        const json = await res.json()
        setVisit(json.visit)
        setEditing(false)
      } else {
        const err = await res.json()
        throw new Error(err.error || 'Erreur')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }, [visit, editedNotes])

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
          setPhotos(prev => [...prev, ...newPhotos])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  // Share via WhatsApp
  const handleShare = () => {
    if (!visit) return
    const msg = encodeURIComponent(
      `📋 *Rapport de visite*\n` +
      `🏪 ${visit.client.companyName}\n` +
      `👤 ${visit.client.contactName}\n` +
      `📅 ${formatDate(visit.createdAt)} à ${formatTime(visit.createdAt)}\n` +
      `📝 ${visit.notes || 'Aucune note'}\n` +
      `📍 GPS: ${visit.latitude?.toFixed(5) || '—'}, ${visit.longitude?.toFixed(5) || '—'}\n` +
      `\n— Teranga Biz`
    )
    const phone = visit.client.whatsapp?.replace(/[^0-9]/g, '') || ''
    const url = phone
      ? `https://wa.me/${phone}?text=${msg}`
      : `https://wa.me/?text=${msg}`
    window.open(url, '_blank')
  }

  // ─── RENDER ───
  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 active:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-slate-300" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-slate-100 truncate">
            {visit ? `Visite — ${visit.client.companyName}` : 'Détail de la visite'}
          </h1>
          <p className="text-xs text-slate-500">
            {visit ? formatDate(visit.createdAt) : 'Chargement...'}
          </p>
        </div>
        {visit && (
          <button
            onClick={handleShare}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/80 active:bg-slate-700 transition-colors"
          >
            <Share2 className="h-4 w-4 text-slate-400" />
          </button>
        )}
      </div>

      {loading && !visit ? (
        <div className="p-4 space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : visit ? (
        <div className="p-4 space-y-4">
          {/* Client info card */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold',
                visit.client.status === 'client_vert' ? 'bg-emerald-500/10 text-emerald-500' :
                visit.client.status === 'negociation_orange' ? 'bg-orange-500/10 text-orange-400' :
                'bg-red-500/10 text-red-400'
              )}>
                {visit.client.companyName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-slate-100 truncate">{visit.client.companyName}</p>
                <p className="text-sm text-slate-500">{visit.client.contactName}</p>
              </div>
              <Badge variant="outline" className={cn('text-[10px] shrink-0', statusBg(visit.client.status))}>
                {statusLabel(visit.client.status)}
              </Badge>
            </div>

            <div className="space-y-1.5">
              {visit.client.address && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{visit.client.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{visit.client.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>{formatDate(visit.createdAt)} à {formatTime(visit.createdAt)}</span>
              </div>
            </div>

            {/* Client action buttons */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => window.open(`tel:${visit.client.phone}`, '_self')}
                className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-blue-500/10 text-xs font-medium text-blue-400 active:bg-blue-500/20 transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                Appeler
              </button>
              {visit.client.latitude && visit.client.longitude && (
                <button
                  onClick={() => window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${visit.client.latitude},${visit.client.longitude}`,
                    '_blank'
                  )}
                  className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-violet-500/10 text-xs font-medium text-violet-400 active:bg-violet-500/20 transition-colors"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  Itinéraire
                </button>
              )}
            </div>
          </div>

          {/* Visit details */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-200">Détails de la visite</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Statut</span>
                <Badge
                  variant="outline"
                  className={cn('text-xs',
                    visit.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    visit.status === 'planned' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  )}
                >
                  {visit.status === 'completed' ? 'Terminée' : visit.status === 'planned' ? 'Planifiée' : 'Annulée'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Type</span>
                <span className="text-xs text-slate-300 capitalize">{visit.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Commercial</span>
                <span className="text-xs text-slate-300">{visit.commercial?.name || '—'}</span>
              </div>
              {(visit.latitude || visit.longitude) && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Position GPS</span>
                  <span className="text-xs text-slate-300 font-mono">
                    {visit.latitude?.toFixed(4)}, {visit.longitude?.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes section */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-200">Notes</h3>
              </div>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs font-medium text-emerald-400 active:text-emerald-300"
                >
                  Modifier
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  className="min-h-[100px] bg-slate-700/30 border-slate-600/50 text-sm text-slate-100"
                  placeholder="Ajoutez vos notes..."
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={saving}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-medium text-white active:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Enregistrer
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false)
                      setEditedNotes(visit.notes || '')
                    }}
                    className="flex px-4 items-center justify-center rounded-xl bg-slate-700/50 py-2.5 text-xs font-medium text-slate-400 active:bg-slate-700 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <p className={cn(
                'text-sm text-slate-300',
                !visit.notes && 'text-slate-500 italic'
              )}>
                {visit.notes || 'Aucune note'}
              </p>
            )}
          </div>

          {/* Photos section */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-200">Photos</h3>
              <Badge variant="secondary" className="text-[10px] ml-auto">
                {photos.length}
              </Badge>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handlePhotoCapture}
            />

            {photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photos.map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700/50">
                    <img
                      src={photo}
                      alt={`Photo ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60"
                    >
                      <Trash2 className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700/30 border border-dashed border-slate-600/50 py-3 text-xs font-medium text-slate-400 active:bg-slate-700/50 transition-colors"
            >
              <Camera className="h-4 w-4" />
              Ajouter des photos
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleShare}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600/10 border border-green-600/20 py-3.5 text-sm font-medium text-green-400 active:bg-green-600/15 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Partager sur WhatsApp
            </button>

            <button
              onClick={() => router.push(`/mobile/visits/new?clientId=${visit.client.id}`)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800/60 border border-slate-700/50 py-3.5 text-sm font-medium text-slate-300 active:bg-slate-700/60 transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              Nouvelle visite pour ce client
            </button>

            <button
              onClick={() => router.push(`/mobile/visits/new?clientId=${visit.client.id}`)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 py-3.5 text-sm font-medium text-blue-400 active:bg-blue-500/15 transition-colors"
            >
              <Package className="h-4 w-4" />
              Créer une commande
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mb-3" />
            <p className="text-sm font-medium text-slate-300">Visite non trouvée</p>
            <p className="text-xs text-slate-500 mt-1">{error || 'Cette visite n\'existe pas ou a été supprimée'}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 flex items-center gap-2 rounded-xl bg-slate-800/60 border border-slate-700/50 px-4 py-2.5 text-sm font-medium text-slate-300 active:bg-slate-700/60 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Retour
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
