// app/app/page.tsx
// Global Feed — the main landing experience
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { fetchGlobalFeed } from '@/lib/feed';
import { PostComposer } from '@/components/feed/PostComposer';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedControls } from '@/components/feed/FeedControls';
import type { FeedPost, FeedSort } from '@/types/feed';

const RADIUS_OPTIONS = [1, 2, 5, 10, 25];

export default function GlobalFeedPage() {
  const { lat, lng, loading: geoLoading, error: geoError, refresh: refreshGeo } = useGeolocation();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<FeedSort>('hot');
  const [radius, setRadius] = useState(5);
  const [showComposer, setShowComposer] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!lat || !lng) return;
    setLoading(true);
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
      setLoading(false);
    }
  }, [lat, lng, radius, sort]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(loadPosts, 30000);
    return () => clearInterval(interval);
  }, [loadPosts]);

  if (geoLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Getting your location...</p>
        </div>
      </div>
    );
  }

  if (geoError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3 max-w-sm">
          <p className="text-red-400 text-sm">📍 Location access needed to see nearby posts</p>
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
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">🌿 Feed</h1>
          <p className="text-zinc-500 text-xs">What&apos;s happening nearby</p>
        </div>
        <button
          onClick={() => setShowComposer(!showComposer)}
          className="px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-medium hover:bg-emerald-500 transition"
        >
          {showComposer ? 'Cancel' : '+ Post'}
        </button>
      </div>

      {/* Composer — posts to global feed (no spot_id) */}
      {showComposer && lat && lng && (
        <PostComposer
          lat={lat}
          lng={lng}
          spotId={null}
          onPost={() => {
            setShowComposer(false);
            loadPosts();
          }}
        />
      )}

      {/* Controls */}
      <FeedControls
        sort={sort}
        onSortChange={setSort}
        radius={radius}
        onRadiusChange={setRadius}
        radiusOptions={RADIUS_OPTIONS}
      />

      {/* Feed */}
      {loading && posts.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-zinc-800/50 rounded-xl h-32 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-zinc-400">No posts within {radius} miles</p>
          <p className="text-zinc-500 text-sm">Be the first to post something 🌿</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <FeedCard key={post.id} post={post} onVote={loadPosts} showDistance />
          ))}
        </div>
      )}
    </div>
  );
}
