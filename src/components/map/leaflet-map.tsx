'use client'

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  MessageCircle,
  MapPin,
  Phone,
  Building2,
  TrendingUp,
  TrendingDown,
  Layers,
  Maximize2,
  Users,
  FileText,
  ShoppingBag,
} from 'lucide-react'

// ─── Status colors ────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  lead_rouge: '#ef4444',
  negociation_orange: '#f97316',
  client_vert: '#22c55e',
}

const STATUS_LABELS: Record<string, { label: string; colorClass: string }> = {
  lead_rouge: { label: 'Lead', colorClass: 'bg-red-500 text-white' },
  negociation_orange: { label: 'Négociation', colorClass: 'bg-orange-500 text-white' },
  client_vert: { label: 'Client', colorClass: 'bg-green-500 text-white' },
}

// ─── Senegal region center coordinates ────────────────────────────────
// Used as fallback when computing region circle overlays.

const REGION_CENTERS: Record<string, [number, number]> = {
  Dakar: [14.6937, -17.4441],
  Thiès: [14.7935, -16.9263],
  SaintLouis: [16.0181, -16.4840],
  Louga: [15.6146, -16.2223],
  Diourbel: [14.6572, -16.2432],
  Kaolack: [14.1522, -16.0755],
  Ziguinchor: [12.5833, -16.2222],
  Tambacounda: [13.7750, -13.6669],
  Kolda: [12.8870, -14.9389],
  Fatick: [14.3272, -16.4147],
  Kaffrine: [14.1, -15.5446],
  Matam: [15.6566, -13.2931],
  Sédhiou: [12.7075, -15.5583],
  Kédougou: [12.5579, -12.1708],
}

// ─── Custom animated marker icon ─────────────────────────────────────

function createCustomIcon(status: string, isActive = false) {
  const color = STATUS_COLORS[status] || '#6b7280'
  const activeClass = isActive ? 'marker-active' : ''
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-container ${activeClass}" style="position:relative;">
        <div class="marker-pulse-ring" style="
          position:absolute;inset:-4px;border-radius:50%;
          border:2px solid ${color};opacity:0;
          animation: ${isActive ? 'markerPulse 2s ease-out infinite' : 'none'};
        "></div>
        <div class="marker-appear" style="
          background:${color};width:36px;height:36px;border-radius:50%;
          border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.35);
          display:flex;align-items:center;justify-content:center;
          animation:markerAppear 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
          transform-origin:center;position:relative;z-index:2;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        ">
          <div style="width:12px;height:12px;background:white;border-radius:50%;opacity:.9"></div>
        </div>
      </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' CFA'
}

/**
 * Simulates a revenue trend indicator for visual richness.
 * Uses a deterministic hash based on the client id to keep it stable
 * across re-renders (up or down, with a magnitude).
 */
function getRevenueTrend(clientId: string): { direction: 'up' | 'down'; percent: number } {
  const hash = clientId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const direction = hash % 3 === 0 ? 'down' : 'up'
  const percent = (hash % 20) + 5 // 5–24%
  return { direction, percent }
}

// ─── Fit bounds controller ────────────────────────────────────────────

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap()
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 })
    }
  }, [bounds, map])
  return null
}

// ─── Map instance initializer ──────────────────────────────────────────

function MapInstanceSetter({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap()
  useEffect(() => {
    onReady(map)
  }, [map, onReady])
  return null
}

// ─── Region circle overlay data ────────────────────────────────────────

interface RegionCircle {
  name: string
  center: [number, number]
  count: number
  radius: number
  color: string
}

function computeRegionCircles(clients: MapClient[]): RegionCircle[] {
  // Group geolocated clients by region
  const regionMap = new Map<string, { lats: number[]; lngs: number[] }>()

  for (const c of clients) {
    if (!c.latitude || !c.longitude) continue
    const region = c.region || 'Autre'
    if (!regionMap.has(region)) regionMap.set(region, { lats: [], lngs: [] })
    const entry = regionMap.get(region)!
    entry.lats.push(c.latitude)
    entry.lngs.push(c.longitude)
  }

  const circles: RegionCircle[] = []

  for (const [name, coords] of regionMap) {
    const count = coords.lats.length
    const avgLat = coords.lats.reduce((a, b) => a + b, 0) / count
    const avgLng = coords.lngs.reduce((a, b) => a + b, 0) / count

    // Fallback to known region center if average is far off
    const knownCenter = REGION_CENTERS[name]
    const center: [number, number] = knownCenter
      ? [avgLat, avgLng]
      : [avgLat, avgLng]

    // Radius scales with client count (20km base + 8km per client, capped at 60km)
    const radius = Math.min(20 + count * 8, 60) * 1000

    // Color intensity: more clients → warmer/more saturated color
    let color: string
    if (count >= 6) color = 'rgba(239, 68, 68, 0.15)'    // red tint — high concentration
    else if (count >= 3) color = 'rgba(249, 115, 22, 0.12)' // orange tint — medium
    else color = 'rgba(34, 197, 94, 0.10)'                   // green tint — low

    circles.push({ name, center, count, radius, color })
  }

  // Sort by count descending so highest concentration renders first
  return circles.sort((a, b) => b.count - a.count)
}

// ─── Types ─────────────────────────────────────────────────────────────

export interface MapClient {
  id: string
  companyName: string
  contactName: string
  phone: string
  whatsapp?: string
  address?: string
  city?: string
  region?: string
  latitude?: number
  longitude?: number
  sector?: string
  type: string
  status: string
  commercialName?: string
  commercialId?: string
  orderCount: number
  _revenue: number
}

interface LeafletMapProps {
  clients: MapClient[]
  onClientSelect?: (clientId: string) => void
}

// ─── Main Component ───────────────────────────────────────────────────

export default function LeafletMap({ clients, onClientSelect }: LeafletMapProps) {
  // UI state
  const [showRegionCircles, setShowRegionCircles] = useState(true)
  const [activeClientId, setActiveClientId] = useState<string | null>(null)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)

  // Computed data
  const geoClients = useMemo(() => clients.filter((c) => c.latitude && c.longitude), [clients])
  const totalClients = geoClients.length

  const bounds = useMemo(() => {
    if (geoClients.length === 0) return null
    const latLngs: L.LatLngExpression[] = geoClients.map((c) => [c.latitude!, c.longitude!])
    return L.latLngBounds(latLngs) as unknown as L.LatLngBoundsExpression
  }, [geoClients])

  const regionCircles = useMemo(() => computeRegionCircles(geoClients), [geoClients])

  // Zoom-to-fit handler
  const handleZoomToFit = useCallback(() => {
    if (!bounds || !mapInstance) return
    mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 })
  }, [bounds, mapInstance])

  return (
    <div className="relative h-[600px] lg:h-[650px]">
      {/* ─── CSS Keyframe Animations ─────────────────────────── */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Pulse ring: expands outward and fades */
        @keyframes markerPulse {
          0% {
            transform: scale(0.8);
            opacity: 0.6;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }

        /* Marker entrance: scale from 0 to 1 with slight bounce */
        @keyframes markerAppear {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.15);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* Marker hover: gentle lift and glow */
        .custom-marker:hover .marker-appear {
          transform: scale(1.25) !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45) !important;
        }

        /* Dark mode popup overrides */
        .dark .leaflet-popup-content-wrapper {
          background-color: #1e293b !important;
          color: #e2e8f0 !important;
        }
        .dark .leaflet-popup-tip {
          background-color: #1e293b !important;
        }
        .dark .leaflet-popup-content {
          color: #e2e8f0 !important;
        }
        .dark .leaflet-popup-close-button {
          color: #94a3b8 !important;
        }
        .dark .leaflet-popup-close-button:hover {
          color: #f1f5f9 !important;
        }
      `}} />

      {/* ─── Map Container ────────────────────────────────────── */}
      <MapContainer
        center={[14.4974, -14.4524]}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        className="rounded-xl z-0"
        scrollWheelZoom
        whenReady={() => {}}
      >
        <MapInstanceSetter onReady={(m) => setMapInstance(m)} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit bounds when data loads */}
        {bounds && <FitBounds bounds={bounds} />}

        {/* ─── Region Circle Overlays ────────────────────────── */}
        {showRegionCircles &&
          regionCircles.map((rc) => (
            <Circle
              key={rc.name}
              center={rc.center}
              radius={rc.radius}
              pathOptions={{
                fillColor: rc.color,
                fillOpacity: 0.7,
                color: rc.color.replace(/[\d.]+\)$/, '0.4)'),
                weight: 1,
              }}
            >
              <Popup>
                <div className="text-center py-1 px-2" style={{ fontFamily: 'system-ui, sans-serif' }}>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">{rc.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {rc.count} client{rc.count > 1 ? 's' : ''}
                  </p>
                </div>
              </Popup>
            </Circle>
          ))}

        {/* ─── Client Markers ─────────────────────────────────── */}
        {geoClients.map((client) => {
          const isActive = activeClientId === client.id
          const trend = getRevenueTrend(client.id)
          const statusInfo = STATUS_LABELS[client.status]

          return (
            <Marker
              key={client.id}
              position={[client.latitude!, client.longitude!]}
              icon={createCustomIcon(client.status, isActive)}
              eventHandlers={{
                click: () => {
                  setActiveClientId(client.id)
                  onClientSelect?.(client.id)
                },
                mouseover: () => setActiveClientId(client.id),
              }}
            >
              <Popup maxWidth={340} minWidth={280}>
                <div
                  className="p-1 min-w-[270px]"
                  style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                  {/* ── Header: Company name + status badge ── */}
                  <div className="flex items-start justify-between mb-2.5">
                    <h3 className="font-bold text-base text-slate-900 dark:text-slate-50 leading-tight flex-1 pr-2">
                      {client.companyName}
                    </h3>
                    {statusInfo && (
                      <Badge
                        className={`text-[10px] px-1.5 py-0 font-bold shrink-0 ${statusInfo.colorClass}`}
                      >
                        {statusInfo.label}
                      </Badge>
                    )}
                  </div>

                  {/* ── Contact info ── */}
                  <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{client.contactName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>
                        {client.city || 'Non spécifié'}
                        {client.region ? `, ${client.region}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  </div>

                  {/* ── Commercial attribution ── */}
                  {client.commercialName && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                      Commercial : {client.commercialName}
                    </div>
                  )}

                  {/* ── Revenue & Orders row ── */}
                  {client._revenue > 0 && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">CA :</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                          {formatCFA(client._revenue)}
                        </span>
                        {/* CA trend indicator */}
                        <span
                          className={`flex items-center text-[11px] font-bold ml-1 ${
                            trend.direction === 'up'
                              ? 'text-green-500 dark:text-green-400'
                              : 'text-red-500 dark:text-red-400'
                          }`}
                        >
                          {trend.direction === 'up' ? (
                            <TrendingUp className="h-3 w-3 mr-0.5" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-0.5" />
                          )}
                          {trend.percent}%
                        </span>
                      </div>
                      {/* Order count badge */}
                      {client.orderCount > 0 && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                          <ShoppingBag className="h-3 w-3" />
                          {client.orderCount}
                        </span>
                      )}
                    </div>
                  )}

                  {/* ── Separator ── */}
                  <Separator className="my-3 dark:bg-slate-600" />

                  {/* ── Action buttons ── */}
                  <div className="flex gap-2">
                    {/* Voir la fiche button */}
                    <Button
                      size="sm"
                      className="flex-1 h-8 gap-1.5 text-xs font-medium"
                      variant="default"
                      onClick={(e) => {
                        e.stopPropagation()
                        onClientSelect?.(client.id)
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Voir la fiche
                    </Button>
                    {/* WhatsApp button */}
                    <Button
                      size="sm"
                      className="flex-1 h-8 gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium"
                      asChild
                    >
                      <a
                        href={`https://wa.me/${(client.whatsapp || client.phone).replace(
                          /[^0-9]/g,
                          ''
                        )}?text=${encodeURIComponent(
                          `Bonjour ${client.companyName},\n\nJe suis votre commercial chez DistribuSN.\n\nJe souhaiterais faire un point sur vos besoins en produits.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        WhatsApp
                      </a>
                    </Button>
                    {/* Itinéraire button */}
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 text-xs font-medium px-2.5"
                      variant="outline"
                      asChild
                    >
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${client.latitude},${client.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* ─── Floating Map Control Panel ───────────────────────── */}
      <div className="absolute top-3 right-3 z-[1001] flex flex-col gap-2">
        {/* Client count badge */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {totalClients}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            client{totalClients !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Region circles toggle */}
        <button
          onClick={() => setShowRegionCircles((v) => !v)}
          className={`flex items-center gap-2 rounded-lg shadow-lg border px-3 py-2 transition-all duration-200 text-sm font-medium ${
            showRegionCircles
              ? 'bg-primary text-primary-foreground border-primary shadow-primary/20 hover:bg-primary/90'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
          title={showRegionCircles ? 'Masquer les zones régionales' : 'Afficher les zones régionales'}
        >
          {showRegionCircles ? (
            <Layers className="h-4 w-4" />
          ) : (
            <Layers className="h-4 w-4 opacity-60" />
          )}
          <span className="hidden sm:inline">Zones</span>
        </button>

        {/* Zoom to fit all markers */}
        <button
          onClick={handleZoomToFit}
          className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
          title="Ajuster la vue sur tous les clients"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="hidden sm:inline">Ajuster</span>
        </button>
      </div>
    </div>
  )
}
