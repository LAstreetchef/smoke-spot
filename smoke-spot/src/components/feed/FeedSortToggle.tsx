// components/feed/FeedSortToggle.tsx
'use client';

import type { FeedSort } from '@/types/feed';

interface FeedSortToggleProps {
  sort: FeedSort;
  onSortChange: (sort: FeedSort) => void;
}

export function FeedSortToggle({ sort, onSortChange }: FeedSortToggleProps) {
  return (
    <div className="flex bg-zinc-800 rounded-lg p-0.5 w-fit">
      <button
        onClick={() => onSortChange('hot')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
          sort === 'hot'
            ? 'bg-emerald-600 text-white'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        🔥 Hot
      </button>
      <button
        onClick={() => onSortChange('new')}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
          sort === 'new'
            ? 'bg-emerald-600 text-white'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        🆕 New
      </button>
    </div>
  );
}
