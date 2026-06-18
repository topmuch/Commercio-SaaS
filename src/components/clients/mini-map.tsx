'use client'

import { useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

// Fix default marker icon in Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

function UpdateMapCenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap()
  const hasSetRef = useRef(false)

  useEffect(() => {
    if (!hasSetRef.current) {
      map.setView([latitude, longitude], 15, { animate: true })
      hasSetRef.current = true
    }
  }, [map, latitude, longitude])

  return null
}

function FlyToLocation({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo([latitude, longitude], 16, { animate: true, duration: 1.5 })
  }, [map, latitude, longitude])

  return null
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function DraggableMarker({
  latitude,
  longitude,
  onPositionChange,
}: {
  latitude: number
  longitude: number
  onPositionChange: (lat: number, lng: number) => void
}) {
  const markerRef = useRef<L.Marker>(null)

  const handleDragEnd = useCallback(() => {
    const marker = markerRef.current
    if (marker) {
      const pos = marker.getLatLng()
      onPositionChange(pos.lat, pos.lng)
    }
  }, [onPositionChange])

  return (
    <Marker
      position={[latitude, longitude]}
      draggable={true}
      eventHandlers={{
        dragend: handleDragEnd,
      }}
      ref={markerRef as React.RefObject<L.Marker>}
    />
  )
}

interface MiniMapProps {
  latitude: number
  longitude: number
  /** Callback when the marker is dragged or map is clicked */
  onPositionChange?: (lat: number, lng: number) => void
  /** If provided, the map will fly to this location (for search results) */
  flyToLat?: number | null
  flyToLng?: number | null
  /** Height of the map container */
  height?: string
  /** Whether to enable click-to-position and drag */
  interactive?: boolean
}

export default function MiniMap({
  latitude,
  longitude,
  onPositionChange,
  flyToLat,
  flyToLng,
  height = '200px',
  interactive = false,
}: MiniMapProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-border/50 relative" style={{ height }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ borderRadius: '8px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <UpdateMapCenter latitude={latitude} longitude={longitude} />
        {flyToLat != null && flyToLng != null && (
          <FlyToLocation latitude={flyToLat} longitude={flyToLng} />
        )}
        {interactive && onPositionChange ? (
          <>
            <MapClickHandler onMapClick={onPositionChange} />
            <DraggableMarker latitude={latitude} longitude={longitude} onPositionChange={onPositionChange} />
          </>
        ) : (
          <Marker position={[latitude, longitude]} />
        )}
      </MapContainer>
      {/* Hint overlay */}
      {interactive && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <span className="text-[10px] bg-background/80 text-muted-foreground px-2 py-0.5 rounded-full border border-border/50 backdrop-blur-sm">
            Cliquez ou glissez le marqueur pour ajuster
          </span>
        </div>
      )}
    </div>
  )
}
