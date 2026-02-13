'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

const libraries: ("places")[] = ['places']

const SPOT_TYPES = [
  { value: 'outdoor', label: 'Outdoor', emoji: '🌳' },
  { value: 'indoor', label: 'Indoor', emoji: '🏠' },
  { value: 'covered', label: 'Covered', emoji: '⛱️' },
  { value: 'rooftop', label: 'Rooftop', emoji: '🏙️' },
  { value: 'balcony', label: 'Balcony', emoji: '🌅' },
  { value: 'alley', label: 'Alley', emoji: '🌃' },
  { value: 'park', label: 'Park', emoji: '🌲' },
  { value: 'other', label: 'Other', emoji: '📍' },
]

const VIBE_TAGS = [
  'chill', 'scenic', 'late-night', 'hidden-gem', '420-friendly',
  'quiet', 'social', 'private', 'great-view', 'dog-friendly'
]

const AMENITIES = [
  'ashtray', 'seating', 'shade', 'outlet', 'wifi',
  'restroom', 'water', 'cover', 'lighting', 'table'
]

const mapContainerStyle = {
  width: '100%',
  height: '100%',
}

const defaultCenter = { lat: 34.0522, lng: -118.2437 }

export default function NewSpotPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const mapRef = useRef<google.maps.Map | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries,
  })

  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: 0,
    longitude: 0,
    address: '',
    spot_type: 'outdoor',
    vibe_tags: [] as string[],
    amenities: [] as string[],
    operating_hours: '',
  })

  // Read lat/lng from query params (from map tap)
  useEffect(() => {
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    if (lat && lng) {
      const latNum = parseFloat(lat)
      const lngNum = parseFloat(lng)
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        setMarkerPosition({ lat: latNum, lng: lngNum })
        setFormData(prev => ({
          ...prev,
          latitude: latNum,
          longitude: lngNum,
        }))
      }
    }
  }, [searchParams])

  // Initialize Places Autocomplete
  useEffect(() => {
    if (!isLoaded || !searchInputRef.current) return

    autocompleteRef.current = new google.maps.places.Autocomplete(searchInputRef.current, {
      types: ['geocode', 'establishment'],
    })

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace()
      if (place?.geometry?.location) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        
        setMarkerPosition({ lat, lng })
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          address: place.formatted_address || ''
        }))

        mapRef.current?.panTo({ lat, lng })
        mapRef.current?.setZoom(17)
      }
    })
  }, [isLoaded])

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          map.panTo(pos)
          map.setZoom(16)
        }
      )
    }
  }, [])

  // Handle map click to drop pin
  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return

    const lat = e.latLng.lat()
    const lng = e.latLng.lng()

    setMarkerPosition({ lat, lng })
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))

    // Reverse geocode to get address
    const geocoder = new google.maps.Geocoder()
    try {
      const response = await geocoder.geocode({ location: { lat, lng } })
      if (response.results[0]) {
        setFormData(prev => ({ ...prev, address: response.results[0].formatted_address }))
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }
  }, [])

  // Handle marker drag
  const handleMarkerDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return

    const lat = e.latLng.lat()
    const lng = e.latLng.lng()

    setMarkerPosition({ lat, lng })
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))

    // Reverse geocode
    const geocoder = new google.maps.Geocoder()
    try {
      const response = await geocoder.geocode({ location: { lat, lng } })
      if (response.results[0]) {
        setFormData(prev => ({ ...prev, address: response.results[0].formatted_address }))
      }
    } catch (error) {
      console.error('Geocoding error:', error)
    }
  }, [])

  const toggleTag = (tag: string, type: 'vibe_tags' | 'amenities') => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].includes(tag)
        ? prev[type].filter(t => t !== tag)
        : [...prev[type], tag]
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.latitude) {
      showToast('Please add a name and drop a pin on the map', 'error')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Ensure user profile exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!existingProfile) {
      const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        let code = ''
        for (let i = 0; i < 8; i++) {
          code += chars[Math.floor(Math.random() * chars.length)]
        }
        return code
      }

      const { error: profileError } = await supabase.from('users').insert({
        id: user.id,
        email: user.email!,
        username: user.email?.split('@')[0] || `user_${Date.now()}`,
        referral_code: generateCode(),
      })

      if (profileError) {
        console.error('Error creating profile:', profileError)
        showToast('Failed to create user profile', 'error')
        setLoading(false)
        return
      }
    }

    const { data, error } = await supabase
      .from('smoke_spots')
      .insert({
        ...formData,
        created_by: user.id,
        status: 'approved',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating spot:', error)
      showToast('Failed to create spot', 'error')
      setLoading(false)
      return
    }

    router.push(`/app/spot/${data.id}`)
  }

  if (loadError) {
    return (
      <main className="h-screen w-screen bg-primary flex items-center justify-center">
        <p className="text-neutral">Error loading maps. Check your API key.</p>
      </main>
    )
  }

  if (!isLoaded) {
    return (
      <main className="h-screen w-screen bg-primary flex items-center justify-center">
        <p className="text-neutral">Loading map...</p>
      </main>
    )
  }

  return (
    <main className="h-screen w-screen bg-primary flex flex-col">
      {/* Header */}
      <header className="bg-secondary/90 backdrop-blur-sm border-b border-neutral/10 px-4 py-3 flex items-center gap-4 z-10">
        <Link href="/app" className="text-neutral/70 hover:text-neutral">
          ← Back
        </Link>
        <h1 className="font-display text-lg font-bold text-neutral">
          {step === 1 ? 'Drop a Pin' : 'Spot Details'}
        </h1>
      </header>

      {step === 1 ? (
        <>
          {/* Split View: Map on top, Street View below */}
          <div className="flex-1 flex flex-col">
            {/* Map Section - 60% */}
            <div className="flex-[3] relative">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={defaultCenter}
                zoom={14}
                onLoad={onMapLoad}
                onClick={handleMapClick}
                options={{
                  mapTypeId: 'hybrid',
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: false,
                }}
              >
                {markerPosition && (
                  <Marker
                    position={markerPosition}
                    draggable={true}
                    onDragEnd={handleMarkerDragEnd}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 12,
                      fillColor: '#E94560',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 3,
                    }}
                  />
                )}
              </GoogleMap>
              
              {/* Search overlay */}
              <div className="absolute top-4 left-4 right-4 bg-secondary/90 backdrop-blur-sm rounded-xl border border-neutral/10 overflow-hidden">
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral/50">🔍</span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search address or place..."
                      className="flex-1 bg-transparent text-neutral placeholder:text-neutral/40 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Street View Section - 40% */}
            <div className="flex-[2] relative bg-primary border-t-2 border-accent">
              {markerPosition ? (
                <img 
                  src={`https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${markerPosition.lat},${markerPosition.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`}
                  alt="Street View"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral/50">
                  <span className="text-4xl mb-2">📍</span>
                  <p className="text-sm">Drop a pin to see Street View</p>
                </div>
              )}
              {markerPosition && (
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full flex items-center gap-1">
                  📍 Street View Preview
                </div>
              )}
              {formData.address && (
                <div className="absolute top-2 left-2 right-2 px-3 py-2 bg-secondary/90 backdrop-blur-sm rounded-lg">
                  <p className="text-accent text-sm truncate">✓ {formData.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Continue button */}
          <div className="p-4 bg-secondary/90 border-t border-neutral/10">
            <button
              onClick={() => formData.latitude ? setStep(2) : showToast('Please drop a pin first', 'error')}
              className="w-full py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition"
            >
              Continue
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {/* Name */}
          <div className="mb-4">
            <label className="block text-neutral/70 text-sm mb-2">Spot Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Rooftop Paradise"
              className="w-full px-4 py-3 bg-secondary border border-neutral/20 rounded-xl text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-neutral/70 text-sm mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What makes this spot great for smoking?"
              rows={3}
              className="w-full px-4 py-3 bg-secondary border border-neutral/20 rounded-xl text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent resize-none"
            />
          </div>

          {/* Spot Type */}
          <div className="mb-4">
            <label className="block text-neutral/70 text-sm mb-2">Spot Type *</label>
            <div className="grid grid-cols-4 gap-2">
              {SPOT_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFormData(prev => ({ ...prev, spot_type: type.value }))}
                  className={`p-3 rounded-xl text-center transition ${
                    formData.spot_type === type.value
                      ? 'bg-accent text-white'
                      : 'bg-secondary border border-neutral/20 text-neutral/70 hover:border-accent'
                  }`}
                >
                  <div className="text-xl mb-1">{type.emoji}</div>
                  <div className="text-xs">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Vibe Tags */}
          <div className="mb-4">
            <label className="block text-neutral/70 text-sm mb-2">Vibe Tags</label>
            <div className="flex flex-wrap gap-2">
              {VIBE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag, 'vibe_tags')}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    formData.vibe_tags.includes(tag)
                      ? 'bg-accent text-white'
                      : 'bg-secondary border border-neutral/20 text-neutral/60 hover:border-accent'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="mb-4">
            <label className="block text-neutral/70 text-sm mb-2">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((amenity) => (
                <button
                  key={amenity}
                  onClick={() => toggleTag(amenity, 'amenities')}
                  className={`px-3 py-1.5 rounded-full text-sm transition ${
                    formData.amenities.includes(amenity)
                      ? 'bg-accent text-white'
                      : 'bg-secondary border border-neutral/20 text-neutral/60 hover:border-accent'
                  }`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          {/* Operating Hours */}
          <div className="mb-6">
            <label className="block text-neutral/70 text-sm mb-2">Operating Hours (optional)</label>
            <input
              type="text"
              value={formData.operating_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, operating_hours: e.target.value }))}
              placeholder="e.g., 24/7 or 6am - 10pm"
              className="w-full px-4 py-3 bg-secondary border border-neutral/20 rounded-xl text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 bg-secondary border border-neutral/20 text-neutral rounded-xl hover:bg-secondary/80 transition"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.name || !formData.latitude}
              className="flex-1 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Spot'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
