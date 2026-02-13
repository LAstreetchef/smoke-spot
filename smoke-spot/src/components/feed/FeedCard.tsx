// components/feed/FeedCard.tsx
'use client';

import { useState, useEffect } from 'react';
import { voteOnPost } from '@/lib/feed';
import { CommentsSection } from '@/components/feed/CommentsSection';
import { TipButton } from '@/components/feed/TipButton';
import { createClient } from '@/lib/supabase/client';
import type { FeedPost } from '@/types/feed';

interface FeedCardProps {
  post: FeedPost;
  onVote: () => void;
  showDistance?: boolean;
}

export function FeedCard({ post, onVote, showDistance = true }: FeedCardProps) {
  const [score, setScore] = useState(post.score);
  const [myVote, setMyVote] = useState<-1 | 1 | null>(null);
  const [voting, setVoting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user ID for tipping
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  async function handleVote(direction: 1 | -1) {
    if (voting) return;
    setVoting(true);
    try {
      // Optimistic update
      if (myVote === direction) {
        setScore((s) => s - direction);
        setMyVote(null);
      } else {
        const delta = myVote ? direction * 2 : direction;
        setScore((s) => s + delta);
        setMyVote(direction);
      }

      const newScore = await voteOnPost(post.id, direction);
      setScore(newScore);
    } catch {
      // Revert on error
      setScore(post.score);
      setMyVote(null);
    } finally {
      setVoting(false);
    }
  }

  const timeAgo = getTimeAgo(post.created_at);
  const timeLeft = getTimeLeft(post.expires_at);

  return (
    <div className="bg-zinc-800/70 rounded-xl p-4 border border-zinc-700/50 space-y-3">
      {/* Header: nickname, distance, time */}
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 font-medium">{post.nickname}</span>
          {showDistance && post.distance_miles != null && (
            <>
              <span>•</span>
              <span>{post.distance_miles} mi away</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>{timeAgo}</span>
          <span className="text-amber-400/70" title="Time until expiry">
            ⏳ {timeLeft}
          </span>
        </div>
      </div>

      {/* Content */}
      <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

      {/* Image */}
      {post.image_url && (
        <img
          src={post.image_url}
          alt="Post image"
          className="rounded-lg max-h-64 w-full object-cover"
          loading="lazy"
        />
      )}

      {/* Actions: vote + comments + tip */}
      <div className="flex items-center gap-4 pt-1">
        {/* Upvote */}
        <button
          onClick={() => handleVote(1)}
          className={`flex items-center gap-1 text-sm transition ${
            myVote === 1 ? 'text-emerald-400' : 'text-zinc-500 hover:text-emerald-400'
          }`}
        >
          ▲
        </button>

        {/* Score */}
        <span
          className={`text-sm font-medium min-w-[2ch] text-center ${
            score > 0 ? 'text-emerald-400' : score < 0 ? 'text-red-400' : 'text-zinc-400'
          }`}
        >
          {score}
        </span>

        {/* Downvote */}
        <button
          onClick={() => handleVote(-1)}
          className={`flex items-center gap-1 text-sm transition ${
            myVote === -1 ? 'text-red-400' : 'text-zinc-500 hover:text-red-400'
          }`}
        >
          ▼
        </button>

        <div className="flex-1" />

        {/* Comments toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 text-zinc-500 hover:text-white text-sm transition"
        >
          💬 {post.comment_count}
        </button>

        {/* Tip Button - Light It Up! 🔥 */}
        <TipButton
          postId={post.id}
          postUserId={post.user_id}
          currentUserId={currentUserId}
          tipCount={post.tip_count ?? 0}
          tipTotalCents={post.tip_total_cents ?? 0}
          onTipSuccess={onVote}
        />
      </div>

      {/* Comments section */}
      {showComments && <CommentsSection postId={post.id} />}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function getTimeLeft(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h left`;
  return `${mins}m left`;
}
