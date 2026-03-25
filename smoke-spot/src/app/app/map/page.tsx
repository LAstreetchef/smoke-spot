'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'

// Dynamic import for Map to avoid SSR issues
const Map = dynamic(() => import('@/components/GoogleMap'), { ssr: false })
const FireSalePopup = dynamic(() => import('@/components/FireSalePopup'), { ssr: false })
const VibesHereNow = dynamic(() => import('@/components/VibesHereNow'), { ssr: false })
const VibeCheckOverlay = dynamic(() => import('@/components/VibeCheckOverlay'), { ssr: false })

// Debounce helper
function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

interface Spot {
  id: string
  name: string
  description: string
  latitude: number
  longitude: number
  address: string
  spot_type: string
  vibe_tags: string[]
  avg_rating: number
  total_reviews: number
  photos: string[]
  is_sponsored?: boolean
}

interface SponsoredPin {
  id: string
  name: string
  logo_url: string
  click_url: string
  latitude: number
  longitude: number
}

interface BannerAd {
  id: string
  creative_url: string
  click_url: string
  name: string
}

interface FireSale {
  id: string
  name: string
  deal_text: string
  creative_url: string
  click_url: string
  end_date: string
  advertiser: {
    business_name: string
    logo_url: string
  }
}

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'outdoor', label: 'Outdoor' },
  { key: 'indoor', label: 'Indoor' },
  { key: 'rooftop', label: 'Rooftop' },
  { key: '420', label: '420' },
  { key: 'verified', label: 'Verified' },
]

export default function AppPage() {
  const [spots, setSpots] = useState<Spot[]>([])
  const [sponsoredPins, setSponsoredPins] = useState<SponsoredPin[]>([])
  const [bannerAds, setBannerAds] = useState<BannerAd[]>([])
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  const [fireSale, setFireSale] = useState<FireSale | null>(null)
  const [dismissedFireSales, setDismissedFireSales] = useState<Set<string>>(new Set())
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSheet, setShowSheet] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | null>(null)
  const [panTo, setPanTo] = useState<{lat: number, lng: number, ts?: number} | null>(null)
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)
  const [spotResults, setSpotResults] = useState<Spot[]>([])
  const [showSpotResults, setShowSpotResults] = useState(false)
  const [placeResults, setPlaceResults] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [vibeCheckActive, setVibeCheckActive] = useState(true)
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const supabase = createClient()

  // Search spots by name
  const searchSpots = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSpotResults([])
      return
    }

    const { data } = await supabase
      .from('smoke_spots')
      .select('*')
      .eq('status', 'approved')
      .ilike('name', `%${query}%`)
      .limit(5)

    if (data) {
      setSpotResults(data)
    }
  }, [supabase])

  // Search Google Places
  const searchPlaces = useCallback((query: string) => {
    if (query.length < 2 || !autocompleteServiceRef.current) {
      setPlaceResults([])
      return
    }

    autocompleteServiceRef.current.getPlacePredictions(
      { input: query, types: ['geocode', 'establishment'] },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setPlaceResults(predictions.slice(0, 5))
        } else {
          setPlaceResults([])
        }
      }
    )
  }, [])

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    if (value.length >= 2) {
      setShowSearchResults(true)
      searchSpots(value)
      searchPlaces(value)
    } else {
      setShowSearchResults(false)
      setSpotResults([])
      setPlaceResults([])
    }
  }

  // Handle spot selection from search
  const handleSpotSelect = (spot: Spot) => {
    setPanTo({ lat: spot.latitude, lng: spot.longitude, ts: Date.now() })
    setSearchQuery(spot.name)
    setShowSearchResults(false)
    setSelectedSpot(spot)
    setShowSheet(true)
  }

  // Handle place selection from search
  const handlePlaceSelect = (placeId: string, description: string) => {
    if (!placesServiceRef.current) return
    
    placesServiceRef.current.getDetails(
      { placeId, fields: ['geometry'] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          // Use panTo state to trigger map pan via useEffect (more reliable than direct instance)
          setPanTo({ lat, lng, ts: Date.now() })
          setSearchQuery(description)
          setShowSearchResults(false)
        }
      }
    )
  }

  // Get user on mount
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        // Fetch profile with username
        const { data: profile } = await supabase
          .from('users')
          .select('username')
          .eq('id', data.user.id)
          .single()
        
        setUser({ ...data.user, username: profile?.username })
      }
    }
    loadUser()
  }, [])

  // Initialize Places Services when map is ready
  useEffect(() => {
    if (!mapInstance) return

    // Initialize AutocompleteService (no UI, just API)
    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
    }

    // Initialize PlacesService (needs a map or div element)
    if (!placesServiceRef.current) {
      placesServiceRef.current = new google.maps.places.PlacesService(mapInstance)
    }
  }, [mapInstance])

  // Handle map ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapInstance(map)
  }, [])

  // Rotate banner ads every 5 seconds
  useEffect(() => {
    if (bannerAds.length <= 1) return
    
    const interval = setInterval(() => {
      setCurrentBannerIndex(prev => {
        const nextIndex = (prev + 1) % bannerAds.length
        // Log impression for the new banner
        const nextBanner = bannerAds[nextIndex]
        if (nextBanner && mapCenter) {
          fetch('/api/ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign_id: nextBanner.id,
              event_type: 'impression',
              latitude: mapCenter.lat,
              longitude: mapCenter.lng,
            }),
          })
        }
        return nextIndex
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [bannerAds, mapCenter])

  // Debounced bounds change handler - prevent excessive API calls
  const boundsChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Fetch spots and ads when bounds change (works with Google Maps)
  const handleBoundsChange = useCallback((bounds: google.maps.LatLngBounds) => {
    // Guard: ensure bounds is valid
    if (!bounds || !bounds.getSouthWest || !bounds.getNorthEast) {
      return
    }

    // Debounce: wait 500ms after user stops moving map
    if (boundsChangeTimeoutRef.current) {
      clearTimeout(boundsChangeTimeoutRef.current)
    }

    boundsChangeTimeoutRef.current = setTimeout(async () => {
      try {
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        const center = bounds.getCenter()
        
        if (!sw || !ne || !center) return
        
        // Google Maps uses methods: .lat() .lng()
        const swLat = typeof sw.lat === 'function' ? sw.lat() : Number(sw.lat)
        const swLng = typeof sw.lng === 'function' ? sw.lng() : Number(sw.lng)
        const neLat = typeof ne.lat === 'function' ? ne.lat() : Number(ne.lat)
        const neLng = typeof ne.lng === 'function' ? ne.lng() : Number(ne.lng)
        const centerLat = typeof center.lat === 'function' ? center.lat() : Number(center.lat)
        const centerLng = typeof center.lng === 'function' ? center.lng() : Number(center.lng)
        
        // Validate coordinates
        if (isNaN(swLat) || isNaN(swLng) || isNaN(neLat) || isNaN(neLng)) return
        
        setMapCenter({ lat: centerLat, lng: centerLng })
      
      // Fetch spots
      let query = supabase
        .from('smoke_spots')
        .select('*')
        .eq('status', 'approved')
        .gte('latitude', swLat)
        .lte('latitude', neLat)
        .gte('longitude', swLng)
        .lte('longitude', neLng)
        .limit(100)

      if (activeFilter !== 'all') {
        if (activeFilter === '420') {
          query = query.contains('vibe_tags', ['420-friendly'])
        } else if (activeFilter === 'verified') {
          query = query.eq('is_verified', true)
        } else {
          query = query.eq('spot_type', activeFilter)
        }
      }

      const { data, error } = await query

      if (!error && data) {
        setSpots(data)
      }

      // Fetch ads
      const adsResponse = await fetch(`/api/ads?lat=${centerLat}&lng=${centerLng}`)
      if (adsResponse.ok) {
        const adsData = await adsResponse.json()
        
        if (adsData.sponsored_pins) {
          setSponsoredPins(adsData.sponsored_pins)
        }
        if (adsData.banners?.length > 0) {
          setBannerAds(adsData.banners)
          setCurrentBannerIndex(0)
          // Log impression for first banner (fire and forget)
          fetch('/api/ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign_id: adsData.banners[0].id,
              event_type: 'impression',
              latitude: centerLat,
              longitude: centerLng,
            }),
          }).catch(() => {}) // Silently ignore impression errors
        }
        // Fire Sale - show popup if not dismissed
        if (adsData.fire_sale && !dismissedFireSales.has(adsData.fire_sale.id)) {
          setFireSale(adsData.fire_sale)
        }
      }
      } catch (err) {
        // Silently handle errors - map still works without spots/ads
        console.log('Bounds change error (non-critical):', err)
      }
    }, 500) // 500ms debounce delay
  }, [activeFilter, dismissedFireSales])

  const handleSpotClick = (spotId: string) => {
    const spot = spots.find(s => s.id === spotId)
    if (spot) {
      setSelectedSpot(spot)
      setShowSheet(true)
    }
  }

  const closeSheet = () => {
    setShowSheet(false)
    setTimeout(() => setSelectedSpot(null), 300)
  }

  return (
    <main className="h-screen w-screen bg-primary flex flex-col overflow-hidden">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-secondary/95 backdrop-blur-md rounded-2xl shadow-xl shadow-black/20 border border-accent/20 ring-1 ring-accent/10">
          <div className="flex items-center px-4 py-3">
            <span className="text-accent/70 mr-3">🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              placeholder="Search spots or addresses..."
              className="flex-1 bg-transparent text-neutral placeholder:text-neutral/40 focus:outline-none"
              autoComplete="off"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setShowSearchResults(false); setSpotResults([]); setPlaceResults([]); }}
                className="text-neutral/50 hover:text-neutral mr-2"
              >
                ✕
              </button>
            )}
            <Link 
              href="/app/spot/new" 
              className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-lg hover:bg-accent/80 transition"
              title="Add a smoke spot"
            >
              +
            </Link>
            <Link href="/app/profile" className="ml-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">
                {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              {user?.username && (
                <span className="text-neutral/70 text-sm hidden sm:inline">{user.username}</span>
              )}
            </Link>
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {FILTER_OPTIONS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeFilter === filter.key
                    ? 'bg-accent text-white shadow-md shadow-accent/30'
                    : 'bg-primary/60 text-neutral/80 hover:bg-primary/80 hover:text-neutral border border-neutral/10'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Combined Search Results */}
        {showSearchResults && (spotResults.length > 0 || placeResults.length > 0) && (
          <div className="mt-2 bg-secondary/95 backdrop-blur-sm rounded-xl shadow-lg border border-neutral/10 overflow-hidden max-h-80 overflow-y-auto">
            {/* Smoke Spots Section */}
            {spotResults.length > 0 && (
              <>
                <p className="px-4 py-2 text-xs text-accent uppercase tracking-wide font-semibold border-b border-neutral/10 bg-secondary sticky top-0">🚬 Smoke Spots</p>
                {spotResults.map((spot) => (
                  <button
                    key={spot.id}
                    onClick={() => handleSpotSelect(spot)}
                    className="w-full px-4 py-3 text-left hover:bg-accent/20 flex items-center gap-3 border-b border-neutral/5 transition"
                  >
                    <span className="text-lg">🚬</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-neutral font-medium truncate">{spot.name}</p>
                      <p className="text-neutral/50 text-xs truncate">{spot.address}</p>
                    </div>
                    <span className="text-accent/70 text-xs capitalize bg-accent/10 px-2 py-0.5 rounded">{spot.spot_type}</span>
                  </button>
                ))}
              </>
            )}
            
            {/* Google Places Section */}
            {placeResults.length > 0 && (
              <>
                <p className="px-4 py-2 text-xs text-neutral/50 uppercase tracking-wide font-semibold border-b border-neutral/10 bg-secondary sticky top-0">📍 Places</p>
                {placeResults.map((place) => (
                  <button
                    key={place.place_id}
                    onClick={() => handlePlaceSelect(place.place_id, place.description)}
                    className="w-full px-4 py-3 text-left hover:bg-primary/50 flex items-center gap-3 border-b border-neutral/5 last:border-0 transition"
                  >
                    <span className="text-neutral/50">📍</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-neutral truncate">{place.structured_formatting?.main_text || place.description}</p>
                      <p className="text-neutral/50 text-xs truncate">{place.structured_formatting?.secondary_text}</p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="flex-1">
        <Map
          spots={[
            ...spots,
            ...sponsoredPins.map(pin => ({
              id: `sponsored_${pin.id}`,
              name: pin.name,
              latitude: pin.latitude,
              longitude: pin.longitude,
              spot_type: 'sponsored',
              avg_rating: 0,
              is_sponsored: true,
            }))
          ]}
          onBoundsChange={handleBoundsChange}
          onMapReady={handleMapReady}
          panTo={panTo}
          onSpotClick={(spotId) => {
            if (spotId.startsWith('sponsored_')) {
              const pin = sponsoredPins.find(p => `sponsored_${p.id}` === spotId)
              if (pin) {
                // Log click and open URL
                fetch('/api/ads', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    campaign_id: pin.id,
                    event_type: 'click',
                    latitude: mapCenter?.lat,
                    longitude: mapCenter?.lng,
                  }),
                })
                window.open(pin.click_url, '_blank')
              }
            } else {
              handleSpotClick(spotId)
            }
          }}
        />
      </div>

      {/* Banner Ad - Rotates through all active ads */}
      {bannerAds.length > 0 && bannerAds[currentBannerIndex] && (
        <a
          href={bannerAds[currentBannerIndex].click_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            fetch('/api/ads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                campaign_id: bannerAds[currentBannerIndex].id,
                event_type: 'click',
                latitude: mapCenter?.lat,
                longitude: mapCenter?.lng,
              }),
            })
          }}
          className="absolute bottom-20 left-4 right-20 bg-secondary/95 backdrop-blur-sm rounded-xl p-3 border border-neutral/10 z-10 flex items-center gap-3 hover:border-accent/50 transition"
        >
          <img 
            src={bannerAds[currentBannerIndex].creative_url} 
            alt={bannerAds[currentBannerIndex].name || 'Ad'}
            className="h-10 w-auto rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-neutral text-sm font-medium truncate">{bannerAds[currentBannerIndex].name}</p>
            <p className="text-neutral/50 text-xs">Sponsored {bannerAds.length > 1 ? `(${currentBannerIndex + 1}/${bannerAds.length})` : ''}</p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setBannerAds([])
            }}
            className="text-neutral/50 hover:text-neutral p-1"
          >
            ✕
          </button>
        </a>
      )}

      {/* Logged in as */}
      {user && (
        <div className="absolute top-32 left-4 px-4 py-2 bg-gradient-to-r from-secondary/95 to-primary/95 backdrop-blur-md text-neutral/80 text-xs rounded-full border border-accent/30 shadow-lg shadow-accent/10 z-10">
          <span className="text-accent mr-1">🚬</span> <span className="text-accent font-semibold">{user.username || user.email?.split('@')[0] || 'Guest'}</span>
        </div>
      )}

      {/* Advertise Button */}
      <Link
        href="/advertise"
        className="absolute top-44 left-4 px-4 py-2.5 bg-gradient-to-r from-accent/90 to-accent backdrop-blur-md text-white text-sm font-medium rounded-full shadow-lg shadow-accent/30 border border-accent/50 flex items-center gap-2 hover:from-accent hover:to-accent/80 hover:shadow-accent/40 transition-all z-10"
      >
        <span className="text-base">📢</span> Advertise
      </Link>

      {/* Feed Button */}
      <Link
        href="/app"
        className="absolute bottom-6 left-6 px-5 py-3 bg-secondary/95 backdrop-blur-md text-neutral rounded-full shadow-lg border border-neutral/20 flex items-center gap-2 hover:bg-secondary transition z-10"
      >
        <span className="text-lg">🌿</span>
        <span className="text-sm font-medium">Feed</span>
      </Link>

      {/* Vibe Check Overlay — auto-active */}
      {vibeCheckActive && (
        <VibeCheckOverlay
          spots={spots.map(s => ({ id: s.id, name: s.name, latitude: s.latitude, longitude: s.longitude, spot_type: s.spot_type }))}
          onClose={() => setVibeCheckActive(false)}
          userLocation={mapCenter}
        />
      )}

      {/* Re-enable Vibe Check if closed */}
      {!vibeCheckActive && (
        <button
          onClick={() => setVibeCheckActive(true)}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-[#ff3366]/90 backdrop-blur-md text-white rounded-full text-xs font-bold shadow-lg z-10"
        >
          ⚡ VIBE CHECK
        </button>
      )}

      {/* FAB - Create Spot */}
      <Link
        href="/app/spot/new"
        className="absolute bottom-6 right-6 w-14 h-14 bg-accent text-white rounded-full shadow-lg shadow-accent/30 flex items-center justify-center text-2xl hover:bg-accent/90 transition z-10"
      >
        +
      </Link>

      {/* Bottom Sheet */}
      {selectedSpot && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-secondary/95 backdrop-blur-sm rounded-t-3xl shadow-2xl transition-transform duration-300 z-20 ${
            showSheet ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '40vh' }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-neutral/30 rounded-full" />
          </div>

          {/* Content */}
          <div className="px-4 pb-6">
            <div className="flex gap-4">
              {/* Photo or Street View fallback */}
              <div className="w-24 h-24 rounded-xl bg-primary/50 flex items-center justify-center text-4xl flex-shrink-0 overflow-hidden">
                {selectedSpot.photos?.[0] ? (
                  <img 
                    src={selectedSpot.photos[0]} 
                    alt={selectedSpot.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <img 
                    src={`https://maps.googleapis.com/maps/api/streetview?size=200x200&location=${selectedSpot.latitude},${selectedSpot.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`}
                    alt={selectedSpot.name}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      // Fallback to emoji if Street View not available
                      (e.target as HTMLImageElement).style.display = 'none'
                      ;(e.target as HTMLImageElement).parentElement!.innerHTML = '🚬'
                    }}
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-lg font-bold text-neutral truncate">
                  {selectedSpot.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-yellow-400">★</span>
                  <span className="text-neutral/70 text-sm">
                    {selectedSpot.avg_rating?.toFixed(1) || 'New'} ({selectedSpot.total_reviews || 0})
                  </span>
                  <span className="text-neutral/30">•</span>
                  <span className="text-neutral/50 text-sm capitalize">
                    {selectedSpot.spot_type}
                  </span>
                </div>
                <p className="text-neutral/60 text-sm mt-1 line-clamp-2">
                  {selectedSpot.description}
                </p>

                {/* Vibe Tags */}
                {selectedSpot.vibe_tags?.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {selectedSpot.vibe_tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Vibes Here Now */}
            <VibesHereNow spotId={selectedSpot.id} />

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <Link
                href={`/app/spot/${selectedSpot.id}`}
                className="flex-1 py-2.5 bg-accent text-white text-center rounded-lg font-medium hover:bg-accent/90 transition"
              >
                View Details
              </Link>
              <button
                onClick={closeSheet}
                className="px-4 py-2.5 bg-primary/50 text-neutral/70 rounded-lg hover:bg-primary transition"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay when sheet is open */}
      {showSheet && (
        <div
          className="absolute inset-0 bg-black/30 z-10"
          onClick={closeSheet}
        />
      )}

      {/* Fire Sale Popup */}
      {fireSale && (
        <FireSalePopup
          fireSale={fireSale}
          latitude={mapCenter?.lat}
          longitude={mapCenter?.lng}
          onDismiss={() => {
            setDismissedFireSales(prev => new Set([...prev, fireSale.id]))
            setFireSale(null)
          }}
          onClaim={() => {
            setDismissedFireSales(prev => new Set([...prev, fireSale.id]))
            setFireSale(null)
          }}
        />
      )}
    </main>
  )
}
