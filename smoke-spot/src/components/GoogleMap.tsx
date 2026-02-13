'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'

// IMPORTANT: Keep libraries array outside component to prevent reloading
const GOOGLE_MAPS_LIBRARIES: ("places")[] = ['places']

interface Spot {
  id: string
  name: string
  latitude: number
  longitude: number
  spot_type: string
  avg_rating: number
  is_sponsored?: boolean
  photos?: string[]
}

interface GoogleMapProps {
  onBoundsChange?: (bounds: google.maps.LatLngBounds) => void
  onSpotClick?: (spotId: string) => void
  onMapReady?: (map: google.maps.Map) => void
  onMapClick?: (lat: number, lng: number) => void
  spots?: Spot[]
  initialCenter?: { lat: number; lng: number }
  initialZoom?: number
  panTo?: { lat: number; lng: number; ts?: number } | null
}

const MAP_STYLES = [
  { id: 'roadmap', label: 'Map', icon: '🗺️' },
  { id: 'satellite', label: 'Satellite', icon: '🛰️' },
  { id: 'hybrid', label: 'Hybrid', icon: '🌍' },
  { id: 'terrain', label: 'Terrain', icon: '⛰️' },
]

const SPOT_COLORS: Record<string, string> = {
  outdoor: '#4ADE80',
  indoor: '#60A5FA',
  covered: '#A78BFA',
  rooftop: '#F472B6',
  balcony: '#FBBF24',
  alley: '#94A3B8',
  park: '#34D399',
  other: '#9CA3AF',
  sponsored: '#E94560',
}

const containerStyle = {
  width: '100%',
  height: '100%',
}

export default function GoogleMapComponent({
  onBoundsChange,
  onSpotClick,
  onMapReady,
  onMapClick,
  spots = [],
  initialCenter = { lat: 34.0522, lng: -118.2437 },
  initialZoom = 14,
  panTo,
}: GoogleMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  const [mapType, setMapType] = useState<google.maps.MapTypeId | string>('hybrid')
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [center, setCenter] = useState(initialCenter)
  const [zoom, setZoom] = useState(initialZoom)
  const mapRef = useRef<google.maps.Map | null>(null)

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    
    // Notify parent that map is ready
    if (onMapReady) {
      onMapReady(map)
    }

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setUserLocation(pos)
          setCenter(pos)
          setZoom(15)
        },
        () => console.log('Geolocation failed')
      )
    }
  }, [onMapReady])

  // Handle panTo prop changes - update center state to trigger re-render
  useEffect(() => {
    if (panTo) {
      setCenter({ lat: panTo.lat, lng: panTo.lng })
      setZoom(16)
    }
  }, [panTo])

  const onIdle = useCallback(() => {
    if (mapRef.current && onBoundsChange) {
      const bounds = mapRef.current.getBounds()
      if (bounds) {
        onBoundsChange(bounds)
      }
    }
  }, [onBoundsChange])

  const handleMarkerClick = (spot: Spot) => {
    setSelectedSpot(spot)
    if (onSpotClick) {
      onSpotClick(spot.id)
    }
  }

  if (loadError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary text-neutral">
        <p>Error loading maps. Check your API key.</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-secondary text-neutral">
        <p>Loading map...</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onIdle={onIdle}
        onClick={(e) => {
          if (onMapClick && e.latLng) {
            onMapClick(e.latLng.lat(), e.latLng.lng())
          }
        }}
        mapTypeId={mapType}
        options={{
          mapTypeId: mapType as google.maps.MapTypeId,
          mapTypeControl: false,
          streetViewControl: true,
          fullscreenControl: false,
          zoomControl: true,
          styles: mapType === 'roadmap' ? [
            // Subtle dark theme for roadmap
            { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'on' }] },
            { featureType: 'poi.business', stylers: [{ visibility: 'on' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
          ] : undefined,
        }}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#E94560',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
            title="You are here"
          />
        )}

        {/* Smoke spot markers */}
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            position={{ lat: spot.latitude, lng: spot.longitude }}
            onClick={() => handleMarkerClick(spot)}
            icon={{
              url: '/logo.png',
              scaledSize: new google.maps.Size(spot.is_sponsored ? 40 : 32, spot.is_sponsored ? 40 : 32),
              anchor: new google.maps.Point(spot.is_sponsored ? 20 : 16, spot.is_sponsored ? 20 : 16),
            }}
            title={spot.name}
          />
        ))}

        {/* Info window for selected spot */}
        {selectedSpot && (
          <InfoWindow
            position={{ lat: selectedSpot.latitude, lng: selectedSpot.longitude }}
            onCloseClick={() => setSelectedSpot(null)}
          >
            <div className="min-w-[180px]">
              {selectedSpot.photos?.[0] ? (
                <img 
                  src={selectedSpot.photos[0]} 
                  alt={selectedSpot.name}
                  className="w-full h-24 object-cover rounded-t-lg"
                />
              ) : (
                <div className="w-full h-24 bg-gray-200 rounded-t-lg flex items-center justify-center text-4xl">
                  🚬
                </div>
              )}
              <div className="p-2">
                <h3 className="font-bold text-gray-900">{selectedSpot.name}</h3>
                <p className="text-sm text-gray-600 capitalize">{selectedSpot.spot_type}</p>
                {selectedSpot.avg_rating > 0 && (
                  <p className="text-sm text-yellow-600">⭐ {selectedSpot.avg_rating.toFixed(1)}</p>
                )}
                {selectedSpot.is_sponsored && (
                  <p className="text-xs text-pink-600 mt-1">Sponsored</p>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Map style selector */}
      <div className="absolute bottom-4 left-4 flex gap-1 bg-secondary/90 backdrop-blur-sm rounded-lg p-1 border border-neutral/20">
        {MAP_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => setMapType(style.id)}
            className={`px-3 py-2 rounded-md text-sm transition ${
              mapType === style.id
                ? 'bg-accent text-white'
                : 'text-neutral/70 hover:bg-primary/50'
            }`}
            title={style.label}
          >
            {style.icon}
          </button>
        ))}
      </div>
    </div>
  )
}
