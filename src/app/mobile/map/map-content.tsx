'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import {
  MapPin, Phone, Navigation, Search, Crosshair, ChevronUp,
  ChevronDown, X, Clock, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGeolocation } from '@/hooks/use-geolocation'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// ─── Fix Leaflet CSS ───
import 'leaflet/dist/leaflet.css'

// ─── Types ───
interface ClientNearby {
  id: string
  companyName: string
  contactName: string
  phone: string
  whatsapp: string | null
  address: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  status: string
  type: string
  distance: number | null
  lastVisit: string | null
  _count: { visits: number; orders: number }
}

// ─── Custom marker icons ───
function createCircleIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

function createUserIcon() {
  return L.divIcon({
    className: 'user-marker',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 3px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.2);animation:pulse-ring 2s ease-out infinite;"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

const markerIcons = {
  lead_rouge: createCircleIcon('#EF4444'),
  negociation_orange: createCircleIcon('#F97316'),
  client_vert: createCircleIcon('#22C55E'),
}

function statusLabel(status: string) {
  if (status === 'client_vert') return 'Vert'
  if (status === 'negociation_orange') return 'Orange'
  return 'Rouge'
}

function statusBg(status: string) {
  if (status === 'client_vert') return 'bg-emerald-500/10 text-emerald-400'
  if (status === 'negociation_orange') return 'bg-orange-500/10 text-orange-400'
  return 'bg-red-500/10 text-red-400'
}

// ─── Recenter map component ───
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng], 14, { animate: true })
  }, [lat, lng, map])
  return null
}

// ─── Main Map Content (loaded dynamically, no SSR) ───
export default function MobileMapContent() {
  const router = useRouter()
  const geo = useGeolocation(false)
  const isOnline = useOnlineStatus()
  const [clients, setClients] = useState<ClientNearby[]>([])
  const [filteredClients, setFilteredClients] = useState<ClientNearby[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [cityFilter, setCityFilter] = useState<string | null>(null)
  const [cities, setCities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(true)
  const [selectedClient, setSelectedClient] = useState<ClientNearby | null>(null)
  const [mapCenter] = useState<[number, number]>([14.6937, -17.4441])

  const userLocation: [number, number] = useMemo(() => {
    if (geo.latitude && geo.longitude) return [geo.latitude, geo.longitude]
    return mapCenter
  }, [geo.latitude, geo.longitude, mapCenter])

  // Fetch clients
  useEffect(() => {
    async function fetchClients() {
      try {
        const params = new URLSearchParams()
        if (geo.latitude && geo.longitude) {
          params.set('lat', String(geo.latitude))
          params.set('lng', String(geo.longitude))
        }
        params.set('radius', '50')
        params.set('limit', '200')

        const res = await fetch(`/api/mobile/clients-nearby?${params.toString()}`)
        if (res.ok) {
          const json = await res.json()
          setClients(json.clients || [])
          setCities(json.filters?.cities || [])
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchClients()
  }, [geo.latitude, geo.longitude])

  // Apply filters
  useEffect(() => {
    let result = [...clients]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.companyName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q))
      )
    }

    if (statusFilter) {
      result = result.filter(c => c.status === statusFilter)
    }

    if (cityFilter) {
      result = result.filter(c => c.city === cityFilter)
    }

    setFilteredClients(result)
  }, [clients, searchQuery, statusFilter, cityFilter])

  // Only clients with coordinates for the map
  const mapClients = filteredClients.filter(c => c.latitude !== null && c.longitude !== null)

  return (
    <div className="relative flex flex-col" style={{ height: '100%', minHeight: '100%' }}>
      {/* ── Map Container ── */}
      <div className="relative flex-1 z-0">
        {/* Search bar overlay */}
        <div className="absolute top-3 left-3 right-3 z-[1000]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border-0 bg-white/95 pl-10 pr-10 py-3 text-sm text-slate-900 shadow-lg placeholder:text-slate-400 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200"
              >
                <X className="h-3 w-3 text-slate-500" />
              </button>
            )}
          </div>
        </div>

        {/* Status filter chips */}
        <div className="absolute top-16 left-3 right-3 z-[1000] flex gap-1.5 overflow-x-auto">
          {[
            { key: 'lead_rouge', emoji: '🔴', label: 'Rouge' },
            { key: 'negociation_orange', emoji: '🟠', label: 'Orange' },
            { key: 'client_vert', emoji: '🟢', label: 'Vert' },
          ].map(({ key, emoji, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? null : key)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors',
                statusFilter === key
                  ? key === 'lead_rouge' ? 'bg-red-500 text-white' : key === 'negociation_orange' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'
                  : 'bg-white/90 text-slate-600 shadow-sm backdrop-blur-sm'
              )}
            >
              {emoji} {label} ({clients.filter(c => c.status === key).length})
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="absolute top-28 right-3 z-[1000] rounded-xl bg-white/95 p-2 shadow-lg backdrop-blur-sm">
          {[
            { color: 'bg-blue-500', label: 'Vous', border: true },
            { color: 'bg-red-500', label: 'Rouge' },
            { color: 'bg-orange-500', label: 'Orange' },
            { color: 'bg-emerald-500', label: 'Vert' },
          ].map(({ color, label, border }) => (
            <div key={label} className="flex items-center gap-1.5 mb-1 last:mb-0">
              <div className={cn('h-3 w-3 rounded-full', color)} />
              <span className="text-[10px] text-slate-600">{label}</span>
            </div>
          ))}
        </div>

        {/* Relocate button */}
        <button
          onClick={() => geo.refresh()}
          className="absolute bottom-4 right-3 z-[1000] flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg active:bg-slate-100 transition-colors"
          disabled={geo.loading}
        >
          <Crosshair className={cn('h-5 w-5 text-slate-700', geo.loading && 'animate-spin')} />
        </button>

        {/* Leaflet Map */}
        <MapContainer
          center={userLocation}
          zoom={13}
          className="h-full w-full z-0"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />
          <RecenterMap lat={userLocation[0]} lng={userLocation[1]} />

          {/* User location */}
          {geo.latitude && geo.longitude && (
            <CircleMarker
              center={[geo.latitude, geo.longitude]}
              radius={10}
              pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.2, weight: 2 }}
            />
          )}
          <Marker position={userLocation} icon={createUserIcon()} />

          {/* Client markers */}
          {mapClients.map(client => (
            <Marker
              key={client.id}
              position={[client.latitude!, client.longitude!]}
              icon={markerIcons[client.status as keyof typeof markerIcons] || markerIcons.lead_rouge}
              eventHandlers={{ click: () => setSelectedClient(client) }}
            >
              <Popup>
                <div className="min-w-[160px]">
                  <p className="font-semibold text-sm text-slate-900">{client.companyName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{client.contactName}</p>
                  <p className="text-xs text-slate-500">{client.city || client.address || ''}</p>
                  {client.distance !== null && (
                    <p className="text-xs font-medium text-emerald-600 mt-1">{client.distance} km</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ── Bottom Sheet ── */}
      <div className={cn('relative z-[1001] bg-slate-900 border-t border-slate-700/50 transition-all duration-300', sheetOpen ? 'h-[40vh]' : 'h-auto')}>
        <button onClick={() => setSheetOpen(!sheetOpen)} className="flex w-full items-center justify-center py-2.5 active:bg-slate-800">
          <div className="h-1 w-8 rounded-full bg-slate-700" />
        </button>

        {/* City filter */}
        {cities.length > 0 && (
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto">
            <button
              onClick={() => setCityFilter(null)}
              className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors', !cityFilter ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700/50')}
            >
              Toutes
            </button>
            {cities.slice(0, 8).map(city => (
              <button
                key={city}
                onClick={() => setCityFilter(cityFilter === city ? null : city)}
                className={cn('shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-colors', cityFilter === city ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700/50')}
              >
                {city}
              </button>
            ))}
          </div>
        )}

        {sheetOpen ? (
          <div className="flex flex-col h-[calc(100%-60px)]">
            <div className="flex items-center justify-between px-3 pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-slate-200">Clients ({filteredClients.length})</h3>
              </div>
              <button onClick={() => setSheetOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 active:bg-slate-700">
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
              {filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MapPin className="h-8 w-8 text-slate-700 mb-2" />
                  <p className="text-sm text-slate-500">Aucun client trouvé</p>
                </div>
              ) : (
                filteredClients.map(client => (
                  <div
                    key={client.id}
                    className={cn('rounded-xl bg-slate-800/60 border p-3 transition-colors active:bg-slate-700/60', selectedClient?.id === client.id ? 'border-emerald-500/50' : 'border-slate-700/50')}
                    onClick={() => setSelectedClient(selectedClient?.id === client.id ? null : client)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', client.status === 'client_vert' ? 'bg-emerald-500' : client.status === 'negociation_orange' ? 'bg-orange-500' : 'bg-red-500')} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-100 truncate">{client.companyName}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {client.address || client.city || 'Non localisé'}
                            {client.distance !== null && <span className="ml-1.5 text-emerald-400">({client.distance} km)</span>}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn('text-[10px] shrink-0 ml-2', statusBg(client.status))} variant="outline">
                        {statusLabel(client.status)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center px-3 pb-3">
            <button onClick={() => setSheetOpen(true)} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 active:text-slate-300">
              <ChevronUp className="h-4 w-4" />
              Voir les clients ({filteredClients.length})
            </button>
          </div>
        )}
      </div>

      {/* ── Client Detail Modal ── */}
      {selectedClient && (
        <div className="fixed inset-0 z-[1002] flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedClient(null)} />
          <div className="relative w-full rounded-t-2xl bg-slate-900 border-t border-slate-700/50 p-5 pb-8 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={cn('h-3 w-3 rounded-full', selectedClient.status === 'client_vert' ? 'bg-emerald-500' : selectedClient.status === 'negociation_orange' ? 'bg-orange-500' : 'bg-red-500')} />
                <div>
                  <h3 className="text-base font-bold text-slate-100">{selectedClient.companyName}</h3>
                  <p className="text-xs text-slate-500">{selectedClient.contactName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 active:bg-slate-700">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              {selectedClient.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-slate-300">{selectedClient.address}</p>
                </div>
              )}
              {selectedClient.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                  <p className="text-sm text-slate-300">{selectedClient.phone}</p>
                </div>
              )}
              {selectedClient.lastVisit && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500 shrink-0" />
                  <p className="text-sm text-slate-300">Dernière visite: {new Date(selectedClient.lastVisit).toLocaleDateString('fr-FR')}</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Badge className={cn('text-xs', statusBg(selectedClient.status))} variant="outline">{statusLabel(selectedClient.status)}</Badge>
                <Badge variant="secondary" className="text-xs">{selectedClient._count.visits} visites · {selectedClient._count.orders} cmdes</Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => window.open(`tel:${selectedClient.phone}`, '_self')} className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl bg-blue-500/10 active:bg-blue-500/20 transition-colors">
                <Phone className="h-4 w-4 text-blue-400" />
                <span className="text-[10px] font-medium text-blue-400">Appeler</span>
              </button>
              {selectedClient.latitude && selectedClient.longitude && (
                <button onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedClient.latitude},${selectedClient.longitude}`, '_blank')} className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl bg-violet-500/10 active:bg-violet-500/20 transition-colors">
                  <Navigation className="h-4 w-4 text-violet-400" />
                  <span className="text-[10px] font-medium text-violet-400">Itinéraire</span>
                </button>
              )}
              <button onClick={() => router.push(`/mobile/visits/new?clientId=${selectedClient.id}`)} className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl bg-emerald-500 active:bg-emerald-600 transition-colors">
                <ArrowRight className="h-4 w-4 text-white" />
                <span className="text-[10px] font-medium text-white">Visiter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
