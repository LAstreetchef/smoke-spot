// components/feed/TipButton.tsx
'use client';

import { useState } from 'react';
import { createTipIntent, formatCents } from '@/lib/tipping';
import { TIP_PRESETS, type TipPreset } from '@/types/tipping';

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
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayTotal, setDisplayTotal] = useState(tipTotalCents);
  const [displayCount, setDisplayCount] = useState(tipCount);

  const isOwnPost = currentUserId === postUserId;
  const isLoggedIn = !!currentUserId;

  async function handleTip(amountCents: TipPreset) {
    if (!isLoggedIn || isOwnPost || processing) return;
    setProcessing(true);
    setError(null);

    try {
      const { client_secret } = await createTipIntent(postId, amountCents);

      // Load Stripe.js and confirm payment
      // This assumes @stripe/stripe-js is installed
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

      if (!stripe) throw new Error('Stripe failed to load');

      const { error: stripeError } = await stripe.confirmPayment({
        clientSecret: client_secret,
        confirmParams: {
          return_url: `${window.location.origin}/app?tip_success=true`,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        throw new Error(stripeError.message || 'Payment failed');
      }

      // Optimistic update
      setDisplayTotal((t) => t + amountCents);
      setDisplayCount((c) => c + 1);
      setSuccess(true);
      setShowPresets(false);
      setTimeout(() => setSuccess(false), 3000);
      onTipSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setTimeout(() => setError(null), 4000);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="relative">
      {/* Main tip button */}
      <button
        onClick={() => {
          console.log('Tip button clicked', { isLoggedIn, isOwnPost, currentUserId, postUserId });
          if (!isLoggedIn) {
            setError('Log in to tip');
            setTimeout(() => setError(null), 3000);
            return;
          }
          if (isOwnPost) {
            setError("Can't tip your own post");
            setTimeout(() => setError(null), 3000);
            return;
          }
          setShowPresets(true);
        }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200"
        style={{
          background: success 
            ? 'rgba(251,191,36,0.2)' 
            : displayTotal > 0 
              ? 'rgba(251,191,36,0.1)' 
              : 'rgba(63,63,70,0.5)',
          color: success ? '#f59e0b' : displayTotal > 0 ? '#fbbf24' : '#a1a1aa',
          cursor: isOwnPost ? 'default' : 'pointer',
          opacity: isOwnPost ? 0.4 : 1,
          border: displayTotal > 0 ? '1px solid rgba(251,191,36,0.2)' : '1px solid transparent',
        }}
        title={isOwnPost ? "Can't tip your own post" : 'Light it up!'}
      >
        <span className={success ? 'animate-bounce' : ''}>🔥</span>
        <span className="text-xs font-semibold">
          ${(displayTotal / 100).toFixed(0) || '0'}
        </span>
      </button>

      {/* Preset selector popup - FIXED positioning */}
      {showPresets && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowPresets(false)}
          />
          {/* Popup - centered on screen for mobile */}
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 p-4 rounded-2xl"
            style={{
              background: 'rgba(24,24,27,0.98)',
              border: '1px solid rgba(251,191,36,0.3)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
              minWidth: '280px',
            }}
          >
            <p className="text-center text-amber-400 text-sm font-medium">🔥 Light It Up!</p>
            <div className="flex flex-wrap justify-center gap-2">
              {TIP_PRESETS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleTip(amount)}
                  disabled={processing}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-150"
                  style={{
                    background: processing
                      ? 'rgba(63,63,70,0.5)'
                      : 'rgba(251,191,36,0.15)',
                    color: processing ? '#52525b' : '#fbbf24',
                    border: '1px solid rgba(251,191,36,0.3)',
                    cursor: processing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {processing ? '...' : formatCents(amount)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPresets(false)}
              className="text-zinc-500 text-xs mt-1"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Error toast - fixed position */}
      {error && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm z-[100]"
          style={{
            background: 'rgba(239,68,68,0.95)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {error}
        </div>
      )}

      {/* Success toast - fixed position */}
      {success && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm z-[100]"
          style={{
            background: 'rgba(34,197,94,0.95)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          🔥 Lit!
        </div>
      )}
    </div>
  );
}
