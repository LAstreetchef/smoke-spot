// lib/tipping.ts
// Client-side functions for the tipping system

import { createClient } from '@/lib/supabase/client';
import type { EarningsSummary, PostTipInfo } from '@/types/tipping';

const supabase = createClient();

// ── Create a tip payment intent ─────────────────────────────
export async function createTipIntent(
  postId: string,
  amountCents: number
): Promise<{ client_secret: string; payment_intent_id: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/tips/create-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ post_id: postId, amount_cents: amountCents }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create payment');
  }

  return res.json();
}

// ── Get tips for a post ─────────────────────────────────────
export async function getPostTips(postId: string): Promise<PostTipInfo[]> {
  const { data, error } = await supabase.rpc('get_post_tips', {
    p_post_id: postId,
  });

  if (error) throw new Error(error.message);
  return (data ?? []) as PostTipInfo[];
}

// ── Get user's earnings summary ─────────────────────────────
export async function getEarningsSummary(): Promise<EarningsSummary | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_earnings_summary', {
    p_user_id: user.id,
  });

  if (error) throw new Error(error.message);
  return (data?.[0] as EarningsSummary) ?? null;
}

// ── Request a payout ────────────────────────────────────────
export async function requestPayout(
  method: 'paypal' | 'venmo'
): Promise<{ payout_id: string; amount: string; message: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/tips/request-payout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ payout_method: method }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to request payout');
  }

  return res.json();
}

// ── Format cents to display ─────────────────────────────────
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
