'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { TIP_PRESETS, formatCentsShort } from '@/types/tipping';
import { createTipIntent } from '@/lib/tipping';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface TipButtonProps {
  postId: string;
  postUserId: string;
  currentUserId: string | null;
  tipCount: number;
  tipTotalCents: number;
  onTipSuccess?: () => void;
}

export function TipButton({
  postId,
  postUserId,
  currentUserId,
  tipCount,
  tipTotalCents,
  onTipSuccess,
}: TipButtonProps) {
  const [showPresets, setShowPresets] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnPost = currentUserId === postUserId;
  const canTip = currentUserId && !isOwnPost;

  const handleTip = async (amountCents: number) => {
    if (!canTip) return;
    
    setLoading(true);
    setError(null);

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not loaded');

      const { client_secret } = await createTipIntent(postId, amountCents);

      const { error: stripeError } = await stripe.confirmPayment({
        clientSecret: client_secret,
        confirmParams: {
          return_url: `${window.location.origin}/app?tip_success=true`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Success!
      setShowPresets(false);
      onTipSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process tip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => canTip && setShowPresets(!showPresets)}
        disabled={!canTip || loading}
        className={`flex items-center gap-1 text-sm transition ${
          canTip
            ? 'text-orange-400 hover:text-orange-300'
            : 'text-zinc-600 cursor-not-allowed'
        }`}
        title={isOwnPost ? "Can't tip your own post" : 'Light it up! 🔥'}
      >
        <span>🔥</span>
        {tipCount > 0 && (
          <span className="text-xs">
            {tipCount} · {formatCentsShort(tipTotalCents)}
          </span>
        )}
      </button>

      {/* Tip Presets Popup */}
      {showPresets && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowPresets(false)} 
          />
          <div className="absolute bottom-full left-0 mb-2 z-50 bg-zinc-800 rounded-xl p-3 shadow-xl border border-zinc-700 min-w-[200px]">
            <div className="text-xs text-zinc-400 mb-2 font-medium">Light it up! 🔥</div>
            
            {error && (
              <div className="text-xs text-red-400 mb-2">{error}</div>
            )}
            
            <div className="flex flex-wrap gap-2">
              {TIP_PRESETS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleTip(amount)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  ${amount / 100}
                </button>
              ))}
            </div>
            
            {loading && (
              <div className="mt-2 text-xs text-zinc-400">Processing...</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
