'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from '@react-google-maps/api'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/Toast'

const libraries: ("places")[] = ['places']

const AD_TYPES = [
  { value: 'sponsored_pin', label: 'Sponsored Pin', description: 'Your business appears as a highlighted pin', cpm: 500, emoji: '📍' },
  { value: 'featured_spot', label: 'Featured Spot', description: 'Appear at top of search results', cpm: 1000, emoji: '⭐' },
  { value: 'banner', label: 'Banner Ad', description: 'Full-width banner on the map', cpm: 800, emoji: '🖼️' },
  { value: 'fire_sale', label: '🔥 Fire Sale', description: 'Flash popup deal - BOGO, freebies, limited time!', cpm: 1500, emoji: '🔥' },
]

const BUDGET_OPTIONS = [
  { value: 2500, label: '$25' },
  { value: 5000, label: '$50' },
  { value: 10000, label: '$100' },
  { value: 25000, label: '$250' },
  { value: 50000, label: '$500' },
]

const mapContainerStyle = {
  width: '100%',
  height: '100%',
}

const SPOT_COLORS: Record<string, string> = {
  outdoor: '#4ADE80',
  indoor: '#60A5FA',
  covered: '#A78BFA',
  rooftop: '#F472B6',
  balcony: '#FBBF24',
  alley: '#94A3B8',
  park: '#34D399',
  other: '#9CA3AF',
}

export default function NewCampaignPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const mapRef = useRef<google.maps.Map | null>(null)
  const supabase = createClient()

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
    libraries,
  })

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [advertiserId, setAdvertiserId] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [smokeSpots, setSmokeSpots] = useState<any[]>([])
  const [selectedSpot, setSelectedSpot] = useState<any | null>(null)
  const [hoveredSpot, setHoveredSpot] = useState<any | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    ad_type: 'sponsored_pin',
    click_url: '',
    creative_url: '',
    target_center_lat: 34.0522,
    target_center_lng: -118.2437,
    target_radius_km: 5,
    budget_cents: 5000,
    duration_days: 7,
    duration_hours: 2, // For fire sales
    deal_text: '', // For fire sales (e.g., "BOGO Lighters", "Free Rolling Papers")
  })

  const isFireSale = formData.ad_type === 'fire_sale'

  useEffect(() => {
    checkAdvertiser()
    loadSmokeSpots()
  }, [])

  const loadSmokeSpots = async () => {
    const { data } = await supabase
      .from('smoke_spots')
      .select('*')
      .eq('status', 'approved')
    
    if (data) {
      setSmokeSpots(data)
      console.log('Loaded smoke spots:', data)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreviewUrl(URL.createObjectURL(file))
    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${advertiserId}_${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('ad-creatives')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('ad-creatives')
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, creative_url: publicUrl }))
      console.log('Uploaded:', publicUrl)
    } catch (err) {
      console.error('Upload error:', err)
      showToast('Failed to upload image', 'error')
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  // Center map when spots load
  useEffect(() => {
    if (mapRef.current && smokeSpots.length > 0 && step === 2) {
      const firstSpot = smokeSpots[0]
      mapRef.current.panTo({ lat: firstSpot.latitude, lng: firstSpot.longitude })
      mapRef.current.setZoom(11)
    }
  }, [smokeSpots, step])

  // Pan to selected spot
  useEffect(() => {
    if (mapRef.current && selectedSpot) {
      mapRef.current.panTo({ lat: selectedSpot.latitude, lng: selectedSpot.longitude })
    }
  }, [selectedSpot])

  const handleSpotClick = (spot: any) => {
    console.log('Smoke spot selected:', spot.name)
    setSelectedSpot(spot)
    setFormData(prev => ({
      ...prev,
      target_center_lat: spot.latitude,
      target_center_lng: spot.longitude,
    }))
  }

  // Allow clicking anywhere on map to set target
  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setSelectedSpot({ id: 'custom', name: 'Custom Location', latitude: lat, longitude: lng })
    setFormData(prev => ({
      ...prev,
      target_center_lat: lat,
      target_center_lng: lng,
    }))
  }

  const checkAdvertiser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login?redirect=/advertise/campaign/new')
      return
    }

    const { data: advertisers } = await supabase
      .from('advertisers')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!advertisers || advertisers.length === 0) {
      router.push('/advertise/signup')
      return
    }

    setAdvertiserId(advertisers[0].id)
  }

  const handleSubmit = async () => {
    if (!advertiserId) return

    setLoading(true)

    const startDate = new Date()
    const endDate = new Date()
    
    // Fire sales use hours, regular ads use days
    if (formData.ad_type === 'fire_sale') {
      endDate.setHours(endDate.getHours() + formData.duration_hours)
    } else {
      endDate.setDate(endDate.getDate() + formData.duration_days)
    }

    const selectedAdType = AD_TYPES.find(t => t.value === formData.ad_type)

    // Create campaign as draft first
    const { data, error } = await supabase
      .from('ad_campaigns')
      .insert({
        advertiser_id: advertiserId,
        name: formData.name,
        ad_type: formData.ad_type,
        creative_url: formData.creative_url || 'https://via.placeholder.com/728x90',
        click_url: formData.click_url || 'https://example.com',
        target_center_lat: formData.target_center_lat,
        target_center_lng: formData.target_center_lng,
        target_radius_km: formData.target_radius_km,
        budget_cents: formData.budget_cents,
        cpm_cents: selectedAdType?.cpm || 500,
        status: 'draft', // Start as draft until paid
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        deal_text: formData.ad_type === 'fire_sale' ? formData.deal_text : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating campaign:', error)
      showToast('Failed to create campaign', 'error')
      setLoading(false)
      return
    }

    // Redirect to Stripe checkout
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: data.id,
          amount: formData.budget_cents,
          campaignName: formData.name,
        }),
      })

      const { url, error: stripeError } = await response.json()

      if (stripeError) {
        throw new Error(stripeError)
      }

      // Redirect to Stripe
      window.location.href = url
    } catch (err: any) {
      console.error('Stripe checkout error:', err)
      showToast('Payment setup failed', 'error')
      setLoading(false)
    }
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-primary flex items-center justify-center">
        <p className="text-neutral">Error loading maps. Check your API key.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-primary">
      {/* Header */}
      <header className="border-b border-neutral/10 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/advertise/dashboard" className="text-neutral/50 hover:text-neutral">
            ← Dashboard
          </Link>
          <span className="text-neutral/30">|</span>
          <span className="font-display font-bold text-neutral">New Campaign</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                s <= step ? 'bg-accent text-white' : 'bg-secondary text-neutral/50'
              }`}>
                {s}
              </div>
              {s < 3 && <div className={`w-12 h-1 rounded ${s < step ? 'bg-accent' : 'bg-secondary'}`} />}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="bg-secondary rounded-2xl p-6 border border-neutral/10">
            <h2 className="font-display text-xl font-bold text-neutral mb-6">Campaign Details</h2>

            {/* Name */}
            <div className="mb-6">
              <label className="block text-neutral/70 text-sm mb-2">Campaign Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Summer Promo"
                className="w-full px-4 py-3 bg-primary border border-neutral/20 rounded-xl text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent"
              />
            </div>

            {/* Ad Type */}
            <div className="mb-6">
              <label className="block text-neutral/70 text-sm mb-2">Ad Type *</label>
              <div className="space-y-2">
                {AD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData(prev => ({ ...prev, ad_type: type.value }))}
                    className={`w-full p-4 rounded-xl text-left transition flex items-center gap-4 ${
                      formData.ad_type === type.value
                        ? type.value === 'fire_sale' 
                          ? 'bg-gradient-to-r from-orange-500/30 to-red-500/30 border-2 border-orange-500 shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/50'
                          : 'bg-accent/30 border-2 border-accent shadow-lg shadow-accent/30 ring-2 ring-accent/50'
                        : 'bg-primary/50 border border-neutral/20 hover:border-accent/50 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className={`text-3xl ${type.value === 'fire_sale' ? 'animate-fire' : ''}`}>{type.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-neutral">{type.label}</p>
                      <p className="text-neutral/60 text-sm">{type.description}</p>
                    </div>
                    <p className="text-accent font-semibold">${(type.cpm / 100).toFixed(0)}/1k</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Ad Creative Upload */}
            <div className="mb-6">
              <label className="block text-neutral/70 text-sm mb-2">Ad Creative (Banner Image)</label>
              <div className="border-2 border-dashed border-neutral/20 rounded-xl p-4 text-center hover:border-accent/50 transition">
                {previewUrl ? (
                  <div className="relative">
                    <img src={previewUrl} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
                    <button
                      onClick={() => {
                        setPreviewUrl(null)
                        setFormData(prev => ({ ...prev, creative_url: '' }))
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 text-sm"
                    >
                      ×
                    </button>
                    {uploading && <p className="text-accent text-sm mt-2">Uploading...</p>}
                    {formData.creative_url && <p className="text-green-500 text-sm mt-2">✓ Uploaded</p>}
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="text-neutral/60 text-sm">Click to upload banner image</p>
                    <p className="text-neutral/40 text-xs mt-1">Recommended: 728x90 or 320x50</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Deal Text - Fire Sale Only */}
            {isFireSale && (
              <div className="mb-6">
                <label className="block text-neutral/70 text-sm mb-2">
                  Deal Headline * <span className="text-orange-500">(What&apos;s the offer?)</span>
                </label>
                <input
                  type="text"
                  value={formData.deal_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, deal_text: e.target.value }))}
                  placeholder="e.g., BOGO Lighters, Free Rolling Papers with Purchase"
                  className="w-full px-4 py-3 bg-primary border border-orange-500/50 rounded-xl text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-orange-500 text-lg font-semibold"
                  maxLength={50}
                />
                <p className="text-neutral/50 text-xs mt-1">Keep it short and punchy - this is what users see first!</p>
              </div>
            )}

            {/* Click URL */}
            <div className="mb-6">
              <label className="block text-neutral/70 text-sm mb-2">Destination URL</label>
              <input
                type="url"
                value={formData.click_url}
                onChange={(e) => setFormData(prev => ({ ...prev, click_url: e.target.value }))}
                placeholder="https://your-website.com"
                className="w-full px-4 py-3 bg-primary border border-neutral/20 rounded-xl text-neutral placeholder:text-neutral/40 focus:outline-none focus:border-accent"
              />
            </div>

            <button
              onClick={() => {
                if (!formData.name) {
                  showToast('Please enter a campaign name', 'error')
                  return
                }
                if (isFireSale && !formData.deal_text) {
                  showToast('Please enter a deal headline for your Fire Sale', 'error')
                  return
                }
                setStep(2)
              }}
              className={`w-full py-3 text-white rounded-xl font-semibold hover:opacity-90 transition ${isFireSale ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-accent'}`}
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-secondary rounded-2xl p-6 border border-neutral/10">
            <h2 className="font-display text-xl font-bold text-neutral mb-6">Target Area</h2>

            {smokeSpots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral/60">No smoke spots available yet.</p>
                <p className="text-neutral/40 text-sm mt-2">Smoke spots need to be created first.</p>
              </div>
            ) : (
              <>
                {/* Selected Spot */}
                {selectedSpot && (
                  <div className="mb-4 p-3 bg-accent/20 border border-accent rounded-xl">
                    <p className="text-accent font-semibold">✓ Selected: {selectedSpot.name}</p>
                  </div>
                )}

                {/* Map */}
                <div className="mb-4 rounded-xl overflow-hidden h-64">
                  {isLoaded ? (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={{ lat: formData.target_center_lat, lng: formData.target_center_lng }}
                      zoom={11}
                      onLoad={onMapLoad}
                      onClick={handleMapClick}
                      options={{
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false,
                        styles: [
                          { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
                          { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
                          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
                          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
                          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
                        ],
                      }}
                    >
                      {/* Smoke spot markers */}
                      {smokeSpots.map((spot) => (
                        <Marker
                          key={spot.id}
                          position={{ lat: spot.latitude, lng: spot.longitude }}
                          onClick={() => handleSpotClick(spot)}
                          onMouseOver={() => setHoveredSpot(spot)}
                          onMouseOut={() => setHoveredSpot(null)}
                          icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: selectedSpot?.id === spot.id ? 14 : 10,
                            fillColor: selectedSpot?.id === spot.id ? '#E94560' : (SPOT_COLORS[spot.spot_type] || '#10b981'),
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: selectedSpot?.id === spot.id ? 4 : 2,
                          }}
                          title={spot.name}
                        />
                      ))}

                      {/* Info window on hover */}
                      {hoveredSpot && (
                        <InfoWindow
                          position={{ lat: hoveredSpot.latitude, lng: hoveredSpot.longitude }}
                          onCloseClick={() => setHoveredSpot(null)}
                        >
                          <div className="p-1">
                            <p className="font-bold text-gray-900">{hoveredSpot.name}</p>
                            <p className="text-xs text-gray-600">Click to select</p>
                          </div>
                        </InfoWindow>
                      )}

                      {/* Target radius circle */}
                      {selectedSpot && (
                        <Circle
                          center={{ lat: formData.target_center_lat, lng: formData.target_center_lng }}
                          radius={formData.target_radius_km * 1000}
                          options={{
                            fillColor: '#E94560',
                            fillOpacity: 0.2,
                            strokeColor: '#E94560',
                            strokeWeight: 2,
                          }}
                        />
                      )}
                    </GoogleMap>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary text-neutral">
                      Loading map...
                    </div>
                  )}
                </div>
              </>
            )}

            <p className="text-neutral/60 text-sm mb-4">
              Click anywhere on the map to set your target location, or select an existing smoke spot. Your ads will reach users within the radius.
            </p>

            {/* Radius Slider */}
            <div className="mb-6">
              <label className="block text-neutral/70 text-sm mb-2">
                Target Radius: <span className="text-accent">{formData.target_radius_km} km</span>
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={formData.target_radius_km}
                onChange={(e) => setFormData(prev => ({ ...prev, target_radius_km: parseInt(e.target.value) }))}
                className="w-full accent-accent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-primary border border-neutral/20 text-neutral rounded-xl hover:bg-primary/80 transition"
              >
                Back
              </button>
              <button
                onClick={() => selectedSpot ? setStep(3) : showToast('Please select a target location first', 'error')}
                disabled={!selectedSpot}
                className="flex-1 py-3 bg-accent text-white rounded-xl font-semibold hover:bg-accent/90 transition disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-secondary rounded-2xl p-6 border border-neutral/10">
            <h2 className="font-display text-xl font-bold text-neutral mb-6">Budget & Duration</h2>

            {/* Budget */}
            <div className="mb-6">
              <label className="block text-neutral/70 text-sm mb-2">Budget</label>
              <div className="grid grid-cols-5 gap-2">
                {BUDGET_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFormData(prev => ({ ...prev, budget_cents: option.value }))}
                    className={`py-3 rounded-xl font-semibold transition ${
                      formData.budget_cents === option.value
                        ? 'bg-accent text-white'
                        : 'bg-primary/50 text-neutral/70 hover:bg-primary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="mb-6">
              {isFireSale ? (
                <>
                  <label className="block text-neutral/70 text-sm mb-2">
                    Duration: <span className="text-orange-500 font-bold">{formData.duration_hours} hours</span>
                    <span className="text-orange-400 ml-2">⚡ Flash deal!</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_hours: parseInt(e.target.value) }))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-xs text-neutral/50 mt-1">
                    <span>1h</span>
                    <span>2h</span>
                    <span>4h</span>
                    <span>8h</span>
                  </div>
                </>
              ) : (
                <>
                  <label className="block text-neutral/70 text-sm mb-2">
                    Duration: <span className="text-accent">{formData.duration_days} days</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={formData.duration_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_days: parseInt(e.target.value) }))}
                    className="w-full accent-accent"
                  />
                </>
              )}
            </div>

            {/* Summary */}
            <div className={`rounded-xl p-4 mb-6 ${isFireSale ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30' : 'bg-primary/50'}`}>
              <h3 className="font-semibold text-neutral mb-3 flex items-center gap-2">
                {isFireSale && <span>🔥</span>}
                Campaign Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral/60">Campaign</span>
                  <span className="text-neutral">{formData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral/60">Type</span>
                  <span className={isFireSale ? 'text-orange-500 font-semibold' : 'text-neutral'}>
                    {AD_TYPES.find(t => t.value === formData.ad_type)?.label}
                  </span>
                </div>
                {isFireSale && formData.deal_text && (
                  <div className="flex justify-between">
                    <span className="text-neutral/60">Deal</span>
                    <span className="text-orange-400 font-bold">{formData.deal_text}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral/60">Radius</span>
                  <span className="text-neutral">{formData.target_radius_km} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral/60">Duration</span>
                  <span className={isFireSale ? 'text-orange-500 font-bold' : 'text-neutral'}>
                    {isFireSale ? `${formData.duration_hours} hours` : `${formData.duration_days} days`}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral/10">
                  <span className="text-neutral font-semibold">Total Budget</span>
                  <span className={`font-semibold ${isFireSale ? 'text-orange-500' : 'text-accent'}`}>
                    ${(formData.budget_cents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-primary border border-neutral/20 text-neutral rounded-xl hover:bg-primary/80 transition"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex-1 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 ${
                  isFireSale ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-accent'
                }`}
              >
                {loading ? 'Processing...' : isFireSale 
                  ? `🔥 Pay $${(formData.budget_cents / 100).toFixed(0)} & Launch Fire Sale`
                  : `Pay $${(formData.budget_cents / 100).toFixed(0)} & Launch`
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
