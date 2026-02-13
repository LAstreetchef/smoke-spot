// app/app/earnings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getEarningsSummary, requestPayout, formatCents } from '@/lib/tipping';
import type { EarningsSummary } from '@/types/tipping';

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadEarnings();
  }, []);

  async function loadEarnings() {
    try {
      const data = await getEarningsSummary();
      setEarnings(data);
    } catch (err) {
      console.error('Failed to load earnings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayout(method: 'paypal' | 'venmo') {
    setPayoutLoading(true);
    setMessage(null);
    try {
      const result = await requestPayout(method);
      setMessage({ type: 'success', text: result.message });
      loadEarnings(); // refresh
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Payout failed',
      });
    } finally {
      setPayoutLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const balance = earnings?.pending_balance_cents ?? 0;
  const totalEarned = earnings?.total_earned_cents ?? 0;
  const totalWithdrawn = earnings?.total_withdrawn_cents ?? 0;
  const tipsReceived = earnings?.total_tips_received ?? 0;
  const tipsSent = earnings?.total_tips_sent ?? 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">🔥 Earnings</h1>
        <p className="text-zinc-500 text-xs">Tips received from your posts</p>
      </div>

      {/* Balance Card */}
      <div
        className="rounded-2xl p-6 text-center space-y-1"
        style={{
          background: 'linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(24,24,27,0.9) 100%)',
          border: '1px solid rgba(251,191,36,0.15)',
        }}
      >
        <p className="text-zinc-500 text-xs uppercase tracking-wider">Available Balance</p>
        <p className="text-3xl font-bold" style={{ color: '#fbbf24' }}>
          {formatCents(balance)}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Earned', value: formatCents(totalEarned), color: '#34d399' },
          { label: 'Withdrawn', value: formatCents(totalWithdrawn), color: '#a1a1aa' },
          { label: 'Tips Received', value: tipsReceived.toString(), color: '#fbbf24' },
          { label: 'Tips Sent', value: tipsSent.toString(), color: '#60a5fa' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl p-4 space-y-1"
            style={{
              background: 'rgba(39,39,42,0.5)',
              border: '1px solid rgba(63,63,70,0.3)',
            }}
          >
            <p className="text-zinc-500 text-xs">{label}</p>
            <p className="text-lg font-bold" style={{ color }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Payout Section */}
      <div className="space-y-3">
        <p className="text-zinc-400 text-sm font-medium">Cash Out</p>

        {balance < 500 ? (
          <p className="text-zinc-500 text-xs">
            Minimum payout is $5.00. Keep posting to earn more tips! 🌿
          </p>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => handlePayout('paypal')}
              disabled={payoutLoading}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: payoutLoading ? 'rgba(63,63,70,0.5)' : 'rgba(0,112,224,0.15)',
                color: payoutLoading ? '#52525b' : '#60a5fa',
                border: '1px solid rgba(0,112,224,0.2)',
              }}
            >
              {payoutLoading ? '...' : '💳 PayPal'}
            </button>
            <button
              onClick={() => handlePayout('venmo')}
              disabled={payoutLoading}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: payoutLoading ? 'rgba(63,63,70,0.5)' : 'rgba(0,141,210,0.15)',
                color: payoutLoading ? '#52525b' : '#22d3ee',
                border: '1px solid rgba(0,141,210,0.2)',
              }}
            >
              {payoutLoading ? '...' : '💸 Venmo'}
            </button>
          </div>
        )}

        {message && (
          <p
            className="text-xs rounded-lg px-3 py-2"
            style={{
              background:
                message.type === 'success'
                  ? 'rgba(52,211,153,0.1)'
                  : 'rgba(239,68,68,0.1)',
              color: message.type === 'success' ? '#34d399' : '#f87171',
            }}
          >
            {message.text}
          </p>
        )}
      </div>

      {/* Fee Disclosure */}
      <p className="text-zinc-600 text-xs text-center">
        Smoke Spot takes a 15% platform fee on tips. Payouts processed within 3-5 business days.
      </p>
    </div>
  );
}
