'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

interface ConnectStatus {
  connected: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  message?: string;
}

function ConnectContent() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const refresh = searchParams.get('refresh');

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/connect/status', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/connect/onboard', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to start onboarding:', err);
    } finally {
      setConnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isFullyConnected = status?.connected && status?.charges_enabled && status?.payouts_enabled;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">💰 Get Paid for Tips</h1>
        <p className="text-zinc-500 text-xs">Connect your bank to receive tips directly</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-emerald-400 text-sm">✅ Stripe account connected!</p>
        </div>
      )}

      {refresh && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-400 text-sm">Please complete your Stripe setup.</p>
        </div>
      )}

      <div
        className="rounded-2xl p-6 space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(24,24,27,0.9) 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        {isFullyConnected ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">✓</div>
              <div>
                <p className="text-white font-medium">Stripe Connected</p>
                <p className="text-zinc-500 text-xs">Tips go directly to your bank</p>
              </div>
            </div>
            <p className="text-zinc-400 text-sm">
              You&apos;re all set! Tips go straight to your bank (minus 10% platform fee).
            </p>
          </>
        ) : status?.connected && !status?.details_submitted ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl">⏳</div>
              <div>
                <p className="text-white font-medium">Setup Incomplete</p>
                <p className="text-zinc-500 text-xs">Finish connecting your bank</p>
              </div>
            </div>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3 rounded-xl font-semibold"
              style={{ background: 'rgba(99,102,241,0.8)', color: '#fff' }}
            >
              {connecting ? 'Loading...' : 'Complete Setup'}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-2xl">💳</div>
              <div>
                <p className="text-white font-medium">Connect Stripe</p>
                <p className="text-zinc-500 text-xs">Get paid for tips on your posts</p>
              </div>
            </div>
            <ul className="text-zinc-400 text-sm space-y-2">
              <li>🔥 Receive tips directly to your bank</li>
              <li>⚡ Fast payouts (daily or weekly)</li>
              <li>🔒 Secure — Stripe handles everything</li>
              <li>📊 10% platform fee on tips</li>
            </ul>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3 rounded-xl font-semibold"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff' }}
            >
              {connecting ? 'Loading...' : 'Connect with Stripe'}
            </button>
          </>
        )}
      </div>

      <p className="text-zinc-600 text-xs text-center">
        Powered by Stripe. We never see your bank details.
      </p>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConnectContent />
    </Suspense>
  );
}
