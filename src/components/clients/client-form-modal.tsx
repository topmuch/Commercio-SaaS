'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  UserPlus,
  Phone,
  Mail,
  Navigation,
  MapPin,
  Search,
  Loader2,
  X,
  CheckCircle,
  LocateFixed,
  Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { Client, Commercial } from '@/lib/types'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

// Lazy-load map component (avoid SSR issues with Leaflet)
const MiniMap = dynamic(
  () => import('./mini-map').then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[256px] bg-muted/50 rounded-lg flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement de la carte...</span>
      </div>
    ),
  }
)

// ===== Constants =====

const cityToRegion: Record<string, string> = {
  'Dakar': 'Dakar',
  'Rufisque': 'Dakar',
  'Thiès': 'Thiès',
  'Mbour': 'Thiès',
  'Tivaouane': 'Thiès',
  'Saint-Louis': 'Saint-Louis',
  'Louga': 'Louga',
  'Diourbel': 'Diourbel',
  'Touba': 'Diourbel',
  'Fatick': 'Fatick',
  'Foundiougne': 'Fatick',
  'Kaolack': 'Kaolack',
  'Kaffrine': 'Kaffrine',
  'Tambacounda': 'Tambacounda',
  'Kolda': 'Kolda',
  'Vélingara': 'Kolda',
  'Ziguinchor': 'Ziguinchor',
  'Oussouye': 'Ziguinchor',
  'Sédhiou': 'Sédhiou',
  'Kédougou': 'Kédougou',
  'Matam': 'Matam',
  'Kanel': 'Matam',
}

const senegalCities = Object.keys(cityToRegion).sort()

const sectors = [
  'Alimentation',
  'Textile',
  'Électronique',
  'Cosmétiques',
  'Pharmacie',
  'Quincaillerie',
  'Bazar',
  'Matières premières',
  'Boissons',
  'Agricole',
  'Autre',
]

// ===== Types =====

export interface ClientFormData {
  companyName: string
  contactName: string
  phone: string
  whatsapp: string
  email: string
  address: string
  city: string
  region: string
  latitude: number | null
  longitude: number | null
  sector: string
  type: string
  status: string
  notes: string
  commercialId: string
}

interface ClientFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Client to edit (null = create mode) */
  client: Client | null
  /** List of commercials for the dropdown */
  commercials: Commercial[]
  /** Called after successful save */
  onSave: () => void
}

const emptyForm: ClientFormData = {
  companyName: '',
  contactName: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  city: '',
  region: '',
  latitude: null,
  longitude: null,
  sector: '',
  type: 'boutique',
  status: 'lead_rouge',
  notes: '',
  commercialId: '',
}

// ===== Helper: Match city from address string =====
function matchCityFromAddress(address: string): string | null {
  const lower = address.toLowerCase()
  for (const city of senegalCities) {
    if (lower.includes(city.toLowerCase())) {
      return city
    }
  }
  return null
}

// ===== Reverse geocoding (lat/lng → address) =====
async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; city: string; region: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=fr`,
      { headers: { 'User-Agent': 'DistribuERP/1.0' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const addr = data.address || {}
    const parts: string[] = []
    if (addr.road) parts.push(addr.road)
    if (addr.suburb || addr.quarter) parts.push(addr.suburb || addr.quarter)
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village)
    if (addr.state) parts.push(addr.state)
    const displayAddress = data.display_name || parts.join(', ')
    const geoCity = addr.city || addr.town || addr.village || ''
    const region = addr.state || ''
    return { address: displayAddress, city: geoCity, region }
  } catch {
    return null
  }
}

// ===== Forward geocoding (address query → lat/lng) =====
async function forwardGeocode(query: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ' Sénégal')}&limit=5&accept-language=fr`,
      { headers: { 'User-Agent': 'DistribuERP/1.0' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data || data.length === 0) return null
    const result = data[0]
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    }
  } catch {
    return null
  }
}

// ===== Component =====
export default function ClientFormModal({
  open,
  onOpenChange,
  client,
  commercials,
  onSave,
}: ClientFormModalProps) {
  const isEdit = client !== null
  const [form, setForm] = useState<ClientFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [geoLocating, setGeoLocating] = useState(false)
  const [searching, setSearching] = useState(false)
  const [addressSearch, setAddressSearch] = useState('')
  // Track a "fly-to" target for search results
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null)

  // Sync form when client changes (edit mode)
  useEffect(() => {
    if (client) {
      setForm({
        companyName: client.companyName,
        contactName: client.contactName,
        phone: client.phone,
        whatsapp: client.whatsapp || '',
        email: client.email || '',
        address: client.address || '',
        city: client.city || '',
        region: client.region || '',
        latitude: client.latitude ?? null,
        longitude: client.longitude ?? null,
        sector: client.sector || '',
        type: client.type,
        status: client.status,
        notes: client.notes || '',
        commercialId: client.commercialId || '',
      })
      setFlyTo(null)
      setAddressSearch('')
    } else {
      setForm(emptyForm)
      setFlyTo(null)
      setAddressSearch('')
    }
  }, [client, open])

  // Auto-fill region when city changes
  const handleCityChange = (city: string) => {
    const region = cityToRegion[city] || ''
    setForm((f) => ({ ...f, city, region }))
  }

  // ===== Geolocation: "Ma position" =====
  const handleGeoLocate = async () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée par votre navigateur.')
      return
    }
    setGeoLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setForm((f) => ({ ...f, latitude: lat, longitude: lng }))
        setFlyTo({ lat, lng })
        toast.success('Position GPS obtenue !')

        // Reverse geocode to auto-fill address + city
        const geo = await reverseGeocode(lat, lng)
        if (geo) {
          setForm((f) => ({
            ...f,
            address: geo.address,
            city: geo.city || f.city,
            region: geo.region || f.region,
          }))
          // Try to match city from our list
          const matchedCity = matchCityFromAddress(geo.address)
          if (matchedCity) {
            setForm((f) => ({
              ...f,
              city: matchedCity,
              region: cityToRegion[matchedCity] || f.region,
            }))
          }
        }
        setGeoLocating(false)
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Permission refusée. Activez la géolocalisation dans votre navigateur.',
          2: 'Position indisponible.',
          3: 'Délai expiré. Réessayez.',
        }
        toast.error(messages[error.code] || `Erreur: ${error.message}`)
        setGeoLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  // ===== Address Search =====
  const handleAddressSearch = async () => {
    const query = addressSearch.trim()
    if (!query) {
      toast.error('Entrez une adresse à rechercher.')
      return
    }
    setSearching(true)
    const result = await forwardGeocode(query)
    setSearching(false)
    if (result) {
      setForm((f) => ({
        ...f,
        latitude: result.lat,
        longitude: result.lng,
        address: result.displayName,
      }))
      setFlyTo({ lat: result.lat, lng: result.lng })
      toast.success('Adresse trouvée !')

      // Try to match city
      const matchedCity = matchCityFromAddress(result.displayName)
      if (matchedCity) {
        setForm((f) => ({
          ...f,
          city: matchedCity,
          region: cityToRegion[matchedCity] || f.region,
        }))
      }
    } else {
      toast.error('Aucun résultat trouvé. Essayez avec "Dakar", "Almadies", etc.')
    }
  }

  // ===== Marker drag / click on map =====
  const handleMapPositionChange = (lat: number, lng: number) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }))
  }

  // ===== Clear geolocation =====
  const handleClearLocation = () => {
    setForm((f) => ({ ...f, latitude: null, longitude: null }))
    setFlyTo(null)
  }

  // ===== Submit =====
  const handleSave = async () => {
    if (!form.companyName || !form.contactName || !form.phone) {
      toast.error('Veuillez remplir les champs obligatoires (*).')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        commercialId: form.commercialId || null,
      }

      let res: Response
      if (isEdit && client) {
        res = await fetch(`/api/clients/${client.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (res.ok) {
        toast.success(isEdit ? 'Client mis à jour !' : 'Client créé avec succès !')
        onOpenChange(false)
        onSave()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de la sauvegarde.')
      }
    } catch {
      toast.error('Erreur serveur.')
    } finally {
      setSaving(false)
    }
  }

  // ===== Key shortcut: Enter in address search =====
  const handleAddressKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddressSearch()
    }
  }

  const hasPosition = form.latitude !== null && form.longitude !== null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-erp-orange" />
            {isEdit ? 'Modifier le Client' : 'Nouveau Client'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Modifiez les informations de ${client?.companyName}`
              : 'Remplissez les informations pour créer un nouveau client.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
          {/* ===== Company name ===== */}
          <div className="md:col-span-2">
            <Label htmlFor="f-companyName">
              Nom de la société <span className="text-destructive">*</span>
            </Label>
            <Input
              id="f-companyName"
              placeholder="Ex: Supermarché Auchan"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </div>

          {/* ===== Contact ===== */}
          <div>
            <Label htmlFor="f-contactName">
              Responsable <span className="text-destructive">*</span>
            </Label>
            <Input
              id="f-contactName"
              placeholder="Nom du responsable"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
          </div>

          {/* ===== Phone ===== */}
          <div>
            <Label htmlFor="f-phone">
              Téléphone <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="f-phone"
                className="pl-9"
                placeholder="+221 XX XXX XX XX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {/* ===== WhatsApp ===== */}
          <div>
            <Label htmlFor="f-whatsapp">WhatsApp</Label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <Input
                id="f-whatsapp"
                className="pl-9"
                placeholder="+221 XX XXX XX XX"
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              />
            </div>
          </div>

          {/* ===== Email ===== */}
          <div>
            <Label htmlFor="f-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="f-email"
                className="pl-9"
                type="email"
                placeholder="email@exemple.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          {/* ===== Address ===== */}
          <div className="md:col-span-2">
            <Label htmlFor="f-address">Adresse</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="f-address"
                className="pl-9"
                placeholder="Adresse complète"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          {/* ===== City ===== */}
          <div>
            <Label htmlFor="f-city">Ville</Label>
            <Select value={form.city} onValueChange={handleCityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une ville" />
              </SelectTrigger>
              <SelectContent>
                {senegalCities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ===== Region (auto-filled) ===== */}
          <div>
            <Label htmlFor="f-region">Région</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto selon la ville" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(cityToRegion).filter((v, i, a) => a.indexOf(v) === i).sort().map((region) => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.city && form.region && (
              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-erp-success" />
                Auto-rempli selon {form.city}
              </p>
            )}
          </div>

          {/* ===== Sector ===== */}
          <div>
            <Label htmlFor="f-sector">Secteur d&apos;activité</Label>
            <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ===== Type ===== */}
          <div>
            <Label htmlFor="f-type">Type de client</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="boutique">Boutique</SelectItem>
                <SelectItem value="revendeur">Revendeur</SelectItem>
                <SelectItem value="supermarche">Supermarché</SelectItem>
                <SelectItem value="grossiste">Grossiste</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ===== Status ===== */}
          <div>
            <Label htmlFor="f-status">Statut</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead_rouge">🔴 Lead Rouge</SelectItem>
                <SelectItem value="negociation_orange">🟠 Négociation Orange</SelectItem>
                <SelectItem value="client_vert">🟢 Client Vert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ===== Commercial ===== */}
          <div>
            <Label htmlFor="f-commercial">Commercial assigné</Label>
            <Select value={form.commercialId} onValueChange={(v) => setForm({ ...form, commercialId: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Non assigné</SelectItem>
                {commercials.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ============================================================ */}
          {/* ===== GÉOLOCALISATION SECTION ===== */}
          {/* ============================================================ */}
          <div className="md:col-span-2">
            <div className="rounded-lg border border-border/50 p-4 space-y-3 bg-muted/20">
              {/* Section header */}
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <LocateFixed className="h-4 w-4 text-erp-orange" />
                  Localisation GPS
                </Label>
                {hasPosition && (
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Position enregistrée
                  </Badge>
                )}
              </div>

              {/* Row 1: GPS button + Address search */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* GPS button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeoLocate}
                  disabled={geoLocating}
                  className="gap-1.5 shrink-0"
                >
                  {geoLocating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Navigation className="h-3.5 w-3.5" />
                  )}
                  {geoLocating ? 'Localisation...' : 'Ma position'}
                </Button>

                {/* Address search */}
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher une adresse (ex: Marché Sandaga, Dakar)..."
                      value={addressSearch}
                      onChange={(e) => setAddressSearch(e.target.value)}
                      onKeyDown={handleAddressKeyDown}
                      className="pl-8 h-8 text-sm"
                      disabled={searching}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddressSearch}
                    disabled={searching || !addressSearch.trim()}
                    className="gap-1.5 shrink-0 h-8"
                  >
                    {searching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    <span className="hidden sm:inline">Rechercher</span>
                  </Button>
                </div>
              </div>

              {/* Coordinates display */}
              {hasPosition && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-background rounded-md px-3 py-1.5 border border-border/50">
                    <span className="text-[11px] text-muted-foreground font-medium">Lat:</span>
                    <span className="text-xs font-mono font-medium">{form.latitude!.toFixed(6)}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-background rounded-md px-3 py-1.5 border border-border/50">
                    <span className="text-[11px] text-muted-foreground font-medium">Lng:</span>
                    <span className="text-xs font-mono font-medium">{form.longitude!.toFixed(6)}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearLocation}
                    className="text-destructive hover:text-destructive h-7 px-2 ml-auto"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="text-xs">Effacer</span>
                  </Button>
                </div>
              )}

              {/* Interactive map */}
              {hasPosition && (
                <MiniMap
                  latitude={form.latitude!}
                  longitude={form.longitude!}
                  height="256px"
                  interactive={true}
                  onPositionChange={handleMapPositionChange}
                  flyToLat={flyTo?.lat ?? null}
                  flyToLng={flyTo?.lng ?? null}
                />
              )}

              {/* No position hint */}
              {!hasPosition && (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <MapPin className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">Aucune position définie</p>
                  <p className="text-xs mt-1">Utilisez &quot;Ma position&quot; ou recherchez une adresse ci-dessus</p>
                </div>
              )}
            </div>
          </div>

          {/* ===== Notes ===== */}
          <div className="md:col-span-2">
            <Label htmlFor="f-notes">Notes</Label>
            <Textarea
              id="f-notes"
              placeholder="Notes internes sur le client..."
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-border/50">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !form.companyName || !form.contactName || !form.phone}
            className="gap-2 bg-erp-orange hover:bg-erp-orange/90 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? 'Enregistrer les modifications' : 'Créer le client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
