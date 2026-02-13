// app/app/page.tsx
// Split screen: Map + Feed side by side
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
  const [mapLoading, setMapLoading] = useState(true);
  const [fireSale, setFireSale] = useState<FireSale | null>(null);
  const [showFireSale, setShowFireSale] = useState(false);
  
  // Mobile view toggle
  const [mobileView, setMobileView] = useState<'map' | 'feed'>('map');

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
    setMapLoading(true);
    try {
      const { data } = await supabase
        .from('spots')
        .select('*')
        .gte('latitude', lat - 0.5)
        .lte('latitude', lat + 0.5)
        .gte('longitude', lng - 0.5)
        .lte('longitude', lng + 0.5)
        .limit(100);
      setSpots(data || []);
    } catch (err) {
      console.error('Failed to load spots:', err);
    } finally {
      setMapLoading(false);
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

  // Error state
  if (geoError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-900">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-red-400 text-sm">📍 Location access needed</p>
          <p className="text-zinc-500 text-xs">{geoError}</p>
          <button
            onClick={refreshGeo}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-500 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-900">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex border-b border-zinc-800">
        <button
          onClick={() => setMobileView('map')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            mobileView === 'map'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : 'text-zinc-500'
          }`}
        >
          🗺️ Map
        </button>
        <button
          onClick={() => setMobileView('feed')}
          className={`flex-1 py-3 text-sm font-medium transition ${
            mobileView === 'feed'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : 'text-zinc-500'
          }`}
        >
          💬 Feed
        </button>
      </div>

      {/* Main Split Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map Panel (2/3 on desktop, full on mobile when selected) */}
        <div
          className={`${
            mobileView === 'map' ? 'flex' : 'hidden'
          } lg:flex lg:w-2/3 flex-col`}
        >
          {lat && lng && (
            <Map
              initialCenter={{ lat, lng }}
              spots={spots}
              onBoundsChange={() => {}}
            />
          )}
        </div>

        {/* Feed Panel (1/3 on desktop, full on mobile when selected) */}
        <div
          className={`${
            mobileView === 'feed' ? 'flex' : 'hidden'
          } lg:flex lg:w-1/3 flex-col border-l border-zinc-800 bg-zinc-900`}
        >
          {/* Feed Header */}
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">💬 Feed</h2>
              <button
                onClick={() => setShowComposer(!showComposer)}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-medium hover:bg-emerald-500 transition"
              >
                {showComposer ? '✕' : '+ Post'}
              </button>
            </div>
            
            {/* Sort & Radius Controls */}
            <div className="flex items-center justify-between gap-2">
              <FeedSortToggle sort={sort} onSortChange={setSort} />
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="bg-zinc-800 text-zinc-300 text-xs rounded-lg px-2 py-1.5 border border-zinc-700"
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
            <div className="p-4 border-b border-zinc-800">
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

          {/* Feed Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {feedLoading && posts.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-zinc-800/50 rounded-xl h-24 animate-pulse" />
                ))}
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 space-y-2">
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
          latitude={lat}
          longitude={lng}
        />
      )}
    </div>
  );
}
