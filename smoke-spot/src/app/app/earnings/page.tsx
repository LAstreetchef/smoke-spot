'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getEarningsSummary, requestPayout, updatePayoutInfo } from '@/lib/tipping';
import { formatCents, MIN_PAYOUT_CENTS } from '@/types/tipping';
import type { EarningsSummary } from '@/types/tipping';

export default function EarningsPage() {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const data = await getEarningsSummary();
      setEarnings(data);
      setPaypalEmail(data.paypal_email || '');
      setVenmoUsername(data.venmo_username || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  const handlePayout = async (method: 'paypal' | 'venmo') => {
    if (!earnings || earnings.pending_balance_cents < MIN_PAYOUT_CENTS) return;
    
    setPayoutLoading(true);
    try {
      await requestPayout(method);
      await loadEarnings();
      alert(`Payout requested! You'll receive ${formatCents(earnings.pending_balance_cents)} via ${method}.`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to request payout');
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaveLoading(true);
    try {
      await updatePayoutInfo(paypalEmail || null, venmoUsername || null);
      await loadEarnings();
      setShowSettings(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  const canPayout = earnings && earnings.pending_balance_cents >= MIN_PAYOUT_CENTS;

  return (
    <main className="min-h-screen bg-zinc-900 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/app" className="text-zinc-400 hover:text-white">
            ← Back
          </Link>
          <h1 className="text-xl font-bold text-white">🔥 Earnings</h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-zinc-400 hover:text-white"
          >
            ⚙️
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-zinc-800 rounded-xl p-6 text-center">
          <div className="text-zinc-400 text-sm mb-1">Available Balance</div>
          <div className="text-4xl font-bold text-emerald-400 mb-4">
            {formatCents(earnings?.pending_balance_cents ?? 0)}
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-zinc-500">Total Earned</div>
              <div className="text-white font-medium">
                {formatCents(earnings?.total_earned_cents ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-zinc-500">Withdrawn</div>
              <div className="text-white font-medium">
                {formatCents(earnings?.withdrawn_cents ?? 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Payout Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handlePayout('paypal')}
            disabled={!canPayout || payoutLoading || !earnings?.paypal_email}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {earnings?.paypal_email ? `Cash out to PayPal` : 'Set up PayPal first'}
          </button>
          
          <button
            onClick={() => handlePayout('venmo')}
            disabled={!canPayout || payoutLoading || !earnings?.venmo_username}
            className="w-full py-3 bg-cyan-600 text-white rounded-xl font-medium hover:bg-cyan-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {earnings?.venmo_username ? `Cash out to Venmo` : 'Set up Venmo first'}
          </button>
          
          {!canPayout && (
            <p className="text-center text-zinc-500 text-sm">
              Minimum payout: {formatCents(MIN_PAYOUT_CENTS)}
            </p>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-zinc-800 rounded-xl p-4 space-y-4">
            <h3 className="font-medium text-white">Payout Settings</h3>
            
            <div>
              <label className="block text-zinc-400 text-sm mb-1">PayPal Email</label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3 py-2 bg-zinc-700 text-white rounded-lg border border-zinc-600 focus:border-emerald-500 outline-none"
              />
            </div>
            
            <div>
              <label className="block text-zinc-400 text-sm mb-1">Venmo Username</label>
              <input
                type="text"
                value={venmoUsername}
                onChange={(e) => setVenmoUsername(e.target.value)}
                placeholder="@username"
                className="w-full px-3 py-2 bg-zinc-700 text-white rounded-lg border border-zinc-600 focus:border-emerald-500 outline-none"
              />
            </div>
            
            <button
              onClick={handleSaveSettings}
              disabled={saveLoading}
              className="w-full py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition disabled:opacity-50"
            >
              {saveLoading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}

        {/* Recent Tips */}
        {earnings?.recent_tips && earnings.recent_tips.length > 0 && (
          <div className="bg-zinc-800 rounded-xl p-4">
            <h3 className="font-medium text-white mb-3">Recent Tips Received</h3>
            <div className="space-y-2">
              {earnings.recent_tips.map((tip) => (
                <div key={tip.id} className="flex justify-between items-center text-sm">
                  <div className="text-zinc-400 truncate flex-1 mr-2">
                    {tip.post_preview?.slice(0, 30)}...
                  </div>
                  <div className="text-emerald-400 font-medium">
                    +{formatCents(tip.amount_cents - tip.platform_fee_cents)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="text-center text-zinc-500 text-sm">
          {earnings?.tip_count ?? 0} tips received · 15% platform fee
        </div>
      </div>
    </main>
  );
}
