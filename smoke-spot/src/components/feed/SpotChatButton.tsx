// components/feed/SpotChatButton.tsx
'use client';

import Link from 'next/link';

interface SpotChatButtonProps {
  spotId: string;
  postCount?: number;
  className?: string;
}

/**
 * Drop this into your spot detail page or map popup.
 * Links to the spot's sub-feed at /app/spots/[id]/feed
 */
export function SpotChatButton({ spotId, postCount, className = '' }: SpotChatButtonProps) {
  return (
    <Link
      href={`/app/spot/${spotId}/feed`}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full text-sm transition border border-zinc-700 ${className}`}
    >
      💬 Chat
      {postCount != null && postCount > 0 && (
        <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
          {postCount}
        </span>
      )}
    </Link>
  );
}
