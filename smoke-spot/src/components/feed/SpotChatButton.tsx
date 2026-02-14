// components/feed/SpotChatButton.tsx
'use client';

interface SpotChatButtonProps {
  spotId: string;
  postCount?: number;
  className?: string;
  onClick?: () => void;
}

/**
 * Smoke Ring button for spot-specific chat.
 * Can link to feed page or trigger tab switch via onClick.
 */
export function SpotChatButton({ spotId, postCount, className = '', onClick }: SpotChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full text-sm transition border border-zinc-700 ${className}`}
    >
      💨 Smoke Ring
      {postCount != null && postCount > 0 && (
        <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
          {postCount}
        </span>
      )}
    </button>
  );
}
