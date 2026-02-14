// app/app/page.tsx
// Split screen: Map + Feed - always visible, stacked on mobile, side-by-side on desktop
'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useGeolocation } from '@/hooks/useGeolocation';
import { fetchGlobalFeed } from '@/lib/feed';
import { PostComposer } from '@/components/feed/PostComposer';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedSortToggle } from '@/components/feed/FeedSortToggle';
import { createClient } from '@/lib/supabase/client';
import type { FeedPost, FeedSort } from '@/types/feed';

// Dynamic imports for map components
const Map = dynamic(() => import('@/components/GoogleMap'), { ssr: false });
const FireSalePopup = dynamic(() => import('@/components/FireSalePopup'), { ssr: false });

interface Spot {
  id: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  spot_type: string;
  vibe_tags: string[];
  avg_rating: number;
  total_reviews: number;
  photos: string[];
  is_sponsored?: boolean;
}

interface FireSale {
  id: string;
  name: string;
  deal_text: string;
  creative_url: string;
  click_url: string;
  end_date: string;
  advertiser: {
    business_name: string;
    logo_url: string;
  };
}

const RADIUS_OPTIONS = [1, 2, 5, 10, 25];

export default function SplitScreenPage() {
  // Geolocation
  const { lat, lng, loading: geoLoading, error: geoError, refresh: refreshGeo } = useGeolocation();
  
  // Feed state
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [sort, setSort] = useState<FeedSort>('hot');
  const [radius, setRadius] = useState(5);
  const [showComposer, setShowComposer] = useState(false);
  
  // Map state
  const [spots, setSpots] = useState<Spot[]>([]);
  const [fireSale, setFireSale] = useState<FireSale | null>(null);
  const [showFireSale, setShowFireSale] = useState(false);
  
  // Add spot state
  const [pendingSpot, setPendingSpot] = useState<{ lat: number; lng: number } | null>(null);
  
  // Payment setup nudge
  const [needsPaymentSetup, setNeedsPaymentSetup] = useState(false);

  // Load feed posts
  const loadPosts = useCallback(async () => {
    if (!lat || !lng) return;
    setFeedLoading(true);
    try {
      const data = await fetchGlobalFeed({
        lat,
        lng,
        radius_miles: radius,
        sort,
      });
      setPosts(data);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setFeedLoading(false);
    }
  }, [lat, lng, radius, sort]);

  // Load map spots
  const loadSpots = useCallback(async () => {
    if (!lat || !lng) return;
    const supabase = createClient();
    try {
      const { data } = await supabase
        .from('smoke_spots')
        .select('*')
        .gte('latitude', lat - 0.5)
        .lte('latitude', lat + 0.5)
        .gte('longitude', lng - 0.5)
        .lte('longitude', lng + 0.5)
        .limit(100);
      setSpots(data || []);
    } catch (err) {
      console.error('Failed to load spots:', err);
    }
  }, [lat, lng]);

  // Check for active fire sales
  const checkFireSales = useCallback(async () => {
    if (!lat || !lng) return;
    try {
      const res = await fetch(`/api/ads?lat=${lat}&lng=${lng}&type=fire_sale`);
      const data = await res.json();
      if (data.fireSale) {
        setFireSale(data.fireSale);
        setShowFireSale(true);
      }
    } catch (err) {
      console.error('Failed to check fire sales:', err);
    }
  }, [lat, lng]);

  // Initial load
  useEffect(() => {
    if (lat && lng) {
      loadPosts();
      loadSpots();
      checkFireSales();
    }
  }, [lat, lng, loadPosts, loadSpots, checkFireSales]);

  // Auto-refresh feed every 30s
  useEffect(() => {
    const interval = setInterval(loadPosts, 30000);
    return () => clearInterval(interval);
  }, [loadPosts]);

  // Check if user needs to set up payment info
  useEffect(() => {
    async function checkPaymentSetup() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('users')
        .select('venmo_username, paypal_email')
        .eq('id', user.id)
        .single();
      
      if (data && !data.venmo_username && !data.paypal_email) {
        setNeedsPaymentSetup(true);
      }
    }
    checkPaymentSetup();
  }, []);

  // Loading state
  if (geoLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-900">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Getting your location...</p>
        </div>
      </div>
    );
  }

  // Error state - allow manual location entry
  if (geoError && !lat) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-900">
        <div className="text-center space-y-4 max-w-sm px-4">
          <p className="text-red-400 text-sm">📍 Location access needed</p>
          <p className="text-zinc-500 text-xs">{geoError}</p>
          <button
            onClick={refreshGeo}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 transition w-full"
          >
            Try Again
          </button>
          <div className="text-zinc-600 text-xs">— or —</div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.querySelector('input') as HTMLInputElement;
              const btn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
              const query = input?.value;
              if (!query) return;
              
              btn.textContent = 'Searching...';
              btn.disabled = true;
              
              try {
                const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                
                if (data.lat && data.lng) {
                  localStorage.setItem('manualLocation', JSON.stringify({ lat: data.lat, lng: data.lng }));
                  window.location.reload();
                } else {
                  input.style.borderColor = '#ef4444';
                  btn.textContent = 'Not found - try again';
                  setTimeout(() => {
                    btn.textContent = 'Search Location';
                    btn.disabled = false;
                    input.style.borderColor = '';
                  }, 2000);
                }
              } catch (err) {
                console.error('Geocoding failed:', err);
                btn.textContent = 'Error - try again';
                setTimeout(() => {
                  btn.textContent = 'Search Location';
                  btn.disabled = false;
                }, 2000);
              }
            }}
            className="space-y-2"
          >
            <input
              type="text"
              placeholder="Enter city or zip code"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-700 text-white rounded-lg text-sm hover:bg-zinc-600 transition w-full"
            >
              Search Location
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-[100dvh] flex flex-col md:flex-row bg-zinc-900 overflow-hidden">
      {/* Map Panel - top portion on mobile, left 2/3 on desktop */}
      <div className="h-[55dvh] md:h-full md:w-2/3 relative shrink-0">
        {lat && lng && (
          <Map
            initialCenter={{ lat, lng }}
            spots={spots}
            onBoundsChange={() => {}}
            onMapClick={(clickLat, clickLng) => setPendingSpot({ lat: clickLat, lng: clickLng })}
          />
        )}
        {/* Search bar */}
        <div className="absolute top-3 left-3 right-3 z-10 flex gap-2">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).querySelector('input') as HTMLInputElement;
              const query = input?.value;
              if (!query) return;
              
              input.disabled = true;
              try {
                const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                if (data.lat && data.lng) {
                  localStorage.setItem('manualLocation', JSON.stringify({ lat: data.lat, lng: data.lng }));
                  window.location.reload();
                }
              } catch (err) {
                console.error('Search failed:', err);
              }
              input.disabled = false;
            }}
            className="flex-1 flex gap-1"
          >
            <input
              type="text"
              placeholder="🔍 Search location..."
              className="flex-1 px-3 py-2 bg-zinc-900/90 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 backdrop-blur-sm"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium"
            >
              Go
            </button>
          </form>
        </div>
        {/* Spot count indicator */}
        {spots.length > 0 && (
          <div className="absolute bottom-3 left-3 z-10 bg-zinc-900/80 text-white px-2 py-1 rounded text-xs">
            📍 {spots.length} spots nearby
          </div>
        )}
      </div>

      {/* Feed Panel - bottom portion on mobile, right 1/3 on desktop */}
      <div className="flex-1 md:w-1/3 flex flex-col border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900 min-h-0">
        {/* Payment Setup Nudge */}
        {needsPaymentSetup && (
          <a
            href="/app/profile"
            className="block p-2 bg-amber-500/20 border-b border-amber-500/30 text-center"
          >
            <p className="text-amber-400 text-xs">
              💰 Add Venmo/PayPal to receive tips → <span className="underline">Set up now</span>
            </p>
          </a>
        )}

        {/* Feed Header */}
        <div className="p-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-white">💨 Smoke Ring</h2>
            <button
              onClick={() => setShowComposer(!showComposer)}
              className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-medium hover:bg-emerald-500 transition"
            >
              {showComposer ? '✕' : '+'}
            </button>
          </div>
          
          {/* Sort & Radius Controls */}
          <div className="flex items-center justify-between gap-2">
            <FeedSortToggle sort={sort} onSortChange={setSort} />
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="bg-zinc-800 text-zinc-300 text-xs rounded-lg px-2 py-1 border border-zinc-700"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r} mi
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Composer */}
        {showComposer && lat && lng && (
          <div className="p-3 border-b border-zinc-800 shrink-0">
            <PostComposer
              lat={lat}
              lng={lng}
              spotId={null}
              onPost={() => {
                setShowComposer(false);
                loadPosts();
              }}
            />
          </div>
        )}

        {/* Feed Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {feedLoading && posts.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-800/50 rounded-lg h-20 animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 space-y-1">
              <p className="text-zinc-400 text-sm">No posts within {radius} mi</p>
              <p className="text-zinc-500 text-xs">Be the first! 🌿</p>
            </div>
          ) : (
            posts.map((post) => (
              <FeedCard key={post.id} post={post} onVote={loadPosts} showDistance />
            ))
          )}
        </div>
      </div>

      {/* Fire Sale Popup */}
      {fireSale && showFireSale && (
        <FireSalePopup
          fireSale={fireSale}
          onDismiss={() => setShowFireSale(false)}
          onClaim={() => {
            window.open(fireSale.click_url, '_blank');
            setShowFireSale(false);
          }}
          latitude={lat ?? undefined}
          longitude={lng ?? undefined}
        />
      )}

      {/* Add Spot Modal */}
      {pendingSpot && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-800 rounded-xl p-4 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">📍 Add Spot Here?</h3>
              <button
                onClick={() => setPendingSpot(null)}
                className="text-zinc-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <p className="text-zinc-400 text-sm">
              Drop a pin at this location to add a new smoke spot.
            </p>
            <p className="text-zinc-500 text-xs font-mono">
              {pendingSpot.lat.toFixed(5)}, {pendingSpot.lng.toFixed(5)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPendingSpot(null)}
                className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg text-sm hover:bg-zinc-600 transition"
              >
                Cancel
              </button>
              <a
                href={`/app/spot/new?lat=${pendingSpot.lat}&lng=${pendingSpot.lng}`}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm text-center hover:bg-emerald-500 transition"
              >
                Add Spot
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
