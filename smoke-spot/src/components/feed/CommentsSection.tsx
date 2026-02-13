// components/feed/CommentsSection.tsx
'use client';

import { useState, useEffect } from 'react';
import { fetchComments, addComment } from '@/lib/feed';
import type { FeedComment } from '@/types/feed';

interface CommentsSectionProps {
  postId: string;
}

export function CommentsSection({ postId }: CommentsSectionProps) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [postId]);

  async function loadComments() {
    try {
      const data = await fetchComments(postId);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const comment = await addComment(postId, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  if (loading) {
    return (
      <div className="pt-3 border-t border-zinc-700/50">
        <div className="h-8 bg-zinc-700/30 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="pt-3 border-t border-zinc-700/50 space-y-3">
      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <span className="text-emerald-400 font-medium text-xs">{c.nickname}</span>
              <span className="text-zinc-500 text-xs ml-2">{getTimeAgo(c.created_at)}</span>
              <p className="text-zinc-300 mt-0.5">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* New comment input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a comment..."
          maxLength={300}
          className="flex-1 bg-zinc-700/50 text-white text-sm rounded-lg px-3 py-2 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim() || submitting}
          className={`px-3 py-2 rounded-lg text-sm transition ${
            newComment.trim() && !submitting
              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
              : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
          }`}
        >
          {submitting ? '...' : '→'}
        </button>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
