// components/feed/TipButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { formatCents } from '@/lib/tipping';

const TIP_AMOUNTS = [100, 200, 500] as const; // $1, $2, $5

interface TipButtonProps {
  postId: string;
  postUserId: string;
  currentUserId: string | null;
  tipCount: number;
  tipTotalCents: number;
  onTipSuccess?: () => void;
}

interface PaymentInfo {
  venmo: string | null;
  paypal: string | null;
  hasPayment: boolean;
}

export function TipButton({
  postId,
  postUserId,
  currentUserId,
  tipCount,
  tipTotalCents,
}: TipButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isOwnPost = currentUserId === postUserId;

  async function handleClick() {
    if (isOwnPost) {
      if (tipTotalCents > 0) {
        setToast(`🔥 You've earned ${formatCents(tipTotalCents)} in tips!`);
      } else {
        setToast('Your post — others can tip you here');
      }
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Fetch recipient's payment info
    setLoading(true);
    try {
      const res = await fetch(`/api/tips/payment-links?post_id=${postId}`);
      const data = await res.json();
      setPaymentInfo(data);
      
      if (!data.hasPayment) {
        setToast('This user hasn\'t set up payments yet');
        setTimeout(() => setToast(null), 3000);
        return;
      }
      
      setShowModal(true);
    } catch (err) {
      setToast('Failed to load payment info');
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  function openPayment(type: 'venmo' | 'paypal', amount: number) {
    const amountDollars = amount / 100;
    const note = encodeURIComponent('🔥 Smoke Spot tip');
    
    let url = '';
    if (type === 'venmo' && paymentInfo?.venmo) {
      // Venmo deep link
      url = `venmo://paycharge?txn=pay&recipients=${paymentInfo.venmo}&amount=${amountDollars}&note=${note}`;
      // Fallback for web
      window.location.href = url;
      setTimeout(() => {
        window.open(`https://venmo.com/${paymentInfo.venmo}?txn=pay&amount=${amountDollars}&note=${note}`, '_blank');
      }, 500);
    } else if (type === 'paypal' && paymentInfo?.paypal) {
      // PayPal.me link
      url = `https://paypal.me/${paymentInfo.paypal}/${amountDollars}`;
      window.open(url, '_blank');
    }
    
    setShowModal(false);
    setToast('🔥 Opening payment app...');
    setTimeout(() => setToast(null), 2000);
  }

  return (
    <div className="relative">
      {/* Main tip button */}
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200"
        style={{
          background: tipTotalCents > 0 
            ? 'rgba(251,191,36,0.1)' 
            : 'rgba(63,63,70,0.5)',
          color: tipTotalCents > 0 ? '#fbbf24' : '#a1a1aa',
          cursor: isOwnPost ? 'default' : 'pointer',
          opacity: loading ? 0.5 : (isOwnPost ? 0.7 : 1),
          border: tipTotalCents > 0 ? '1px solid rgba(251,191,36,0.2)' : '1px solid transparent',
        }}
        title={isOwnPost ? 'Your earnings' : 'Send a tip!'}
      >
        <span>🔥</span>
        <span className="text-xs font-semibold">
          ${Math.floor(tipTotalCents / 100)}
        </span>
      </button>

      {/* Payment modal */}
      {showModal && paymentInfo && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setShowModal(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[300px] p-5 rounded-2xl"
            style={{
              background: 'rgba(24,24,27,0.98)',
              border: '1px solid rgba(251,191,36,0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            }}
          >
            <p className="text-center text-amber-400 font-medium mb-4">🔥 Light It Up!</p>
            
            {/* Amount selection */}
            <div className="flex justify-center gap-2 mb-4">
              {TIP_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    // Store selected amount for payment buttons
                    const modal = document.getElementById('selected-amount');
                    if (modal) modal.dataset.amount = String(amount);
                    // Highlight selected
                    document.querySelectorAll('[data-tip-amount]').forEach(el => {
                      (el as HTMLElement).style.background = 'rgba(251,191,36,0.1)';
                    });
                    const selected = document.querySelector(`[data-tip-amount="${amount}"]`) as HTMLElement;
                    if (selected) selected.style.background = 'rgba(251,191,36,0.3)';
                  }}
                  data-tip-amount={amount}
                  className="px-4 py-2 rounded-xl text-sm font-bold"
                  style={{
                    background: amount === 200 ? 'rgba(251,191,36,0.3)' : 'rgba(251,191,36,0.1)',
                    color: '#fbbf24',
                    border: '1px solid rgba(251,191,36,0.3)',
                  }}
                >
                  {formatCents(amount)}
                </button>
              ))}
            </div>
            
            <div id="selected-amount" data-amount="200" />
            
            {/* Payment buttons */}
            <div className="space-y-2">
              {paymentInfo.venmo && (
                <button
                  onClick={() => {
                    const amount = parseInt(document.getElementById('selected-amount')?.dataset.amount || '200');
                    openPayment('venmo', amount);
                  }}
                  className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                  style={{ background: '#008CFF', color: '#fff' }}
                >
                  <span>💳</span> Pay with Venmo
                </button>
              )}
              
              {paymentInfo.paypal && (
                <button
                  onClick={() => {
                    const amount = parseInt(document.getElementById('selected-amount')?.dataset.amount || '200');
                    openPayment('paypal', amount);
                  }}
                  className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                  style={{ background: '#003087', color: '#fff' }}
                >
                  <span>🅿️</span> Pay with PayPal
                </button>
              )}
            </div>
            
            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-3 text-zinc-500 text-sm"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm z-[100]"
          style={{
            background: toast.includes('🔥') ? 'rgba(251,191,36,0.95)' : 'rgba(239,68,68,0.95)',
            color: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
