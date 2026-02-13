'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FeedPost } from '@/types/feed';
import { fetchSpotFeed } from '@/lib/feed';
import { PostComposer } from '@/components/feed/PostComposer';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedSortToggle } from '@/components/feed/FeedSortToggle';
import { createClient } from '@/lib/supabase/client';

interface SpotInfo {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  spot_type: string;
}

export default function SpotFeedPage() {
  const params = useParams();
  const router = useRouter();
  const spotId = params.id as string;

  const [spot, setSpot] = useState<SpotInfo | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'hot' | 'new'>('hot');

  // Load spot info
  useEffect(() => {
    const loadSpot = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('smoke_spots')
        .select('id, name, latitude, longitude, address, spot_type')
        .eq('id', spotId)
        .single();

      if (error || !data) {
        console.error('Spot not found:', error);
        router.push('/app');
        return;
      }

      setSpot(data);
    };

    loadSpot();
  }, [spotId, router]);

  // Load feed
  const loadFeed = useCallback(async () => {
    if (!spotId) return;

    setLoading(true);
    try {
      const data = await fetchSpotFeed({
        spot_id: spotId,
        sort: sortBy,
      });
      setPosts(data);
    } catch (err) {
      console.error('Failed to load spot feed:', err);
    } finally {
      setLoading(false);
    }
  }, [spotId, sortBy]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handlePostCreated = (post: FeedPost) => {
    setPosts((prev) => [post, ...prev]);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  if (!spot) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-pulse text-white/60">Loading spot...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-white/60 hover:text-white transition-colors"
            >
              ← 
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{spot.name}</h1>
              <p className="text-white/50 text-xs truncate">{spot.address}</p>
            </div>
            <Link
              href={`/app/spot/${spotId}`}
              className="text-sm text-green-400 hover:text-green-300 transition-colors"
            >
              View Spot
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-xl mx-auto px-4 py-4 pb-8">
        {/* Post Composer */}
        <div className="mb-4">
          <PostComposer
            lat={spot.latitude}
            lng={spot.longitude}
            spotId={spotId}
            onPost={loadFeed}
          />
        </div>

        {/* Sort Toggle */}
        <div className="mb-4 flex justify-center">
          <FeedSortToggle sort={sortBy} onSortChange={setSortBy} />
        </div>

        {/* Feed */}
        {loading && posts.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-pulse text-white/60">Loading chat...</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-white/60 mb-2">No messages yet</p>
            <p className="text-white/40 text-sm">Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <FeedCard
                key={post.id}
                post={post}
                onDelete={() => handlePostDeleted(post.id)}
                showDistance={false}
              />
            ))}
          </div>
        )}

        {/* Refresh button */}
        {!loading && posts.length > 0 && (
          <button
            onClick={loadFeed}
            className="w-full mt-4 py-3 text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            ↻ Refresh
          </button>
        )}
      </div>
    </main>
  );
}
