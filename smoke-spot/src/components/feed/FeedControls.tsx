// components/feed/FeedControls.tsx
'use client';

import type { FeedSort } from '@/types/feed';

interface FeedControlsProps {
  sort: FeedSort;
  onSortChange: (sort: FeedSort) => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  radiusOptions: number[];
}

export function FeedControls({
  sort,
  onSortChange,
  radius,
  onRadiusChange,
  radiusOptions,
}: FeedControlsProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {/* Sort toggle */}
      <div className="flex bg-zinc-800 rounded-lg p-0.5">
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

      {/* Radius selector */}
      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-xs">📍</span>
        <select
          value={radius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="bg-zinc-800 text-zinc-300 text-sm rounded-lg px-2 py-1.5 border border-zinc-700 focus:border-emerald-500 focus:outline-none"
        >
          {radiusOptions.map((r) => (
            <option key={r} value={r}>
              {r} mi
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
