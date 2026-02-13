// Tipping library functions
import { createClient } from '@/lib/supabase/client';
import type { EarningsSummary, CreateTipIntentResponse } from '@/types/tipping';

export async function createTipIntent(
  postId: string,
  amountCents: number
): Promise<CreateTipIntentResponse> {
  const response = await fetch('/api/tips/create-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: postId, amount_cents: amountCents }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create tip intent');
  }

  return response.json();
}

export async function getEarningsSummary(): Promise<EarningsSummary> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.rpc('get_earnings_summary', {
    p_user_id: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as EarningsSummary;
}

export async function requestPayout(method: 'paypal' | 'venmo'): Promise<void> {
  const response = await fetch('/api/tips/request-payout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payout_method: method }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to request payout');
  }
}

export async function updatePayoutInfo(
  paypalEmail: string | null,
  venmoUsername: string | null
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  const { error } = await supabase
    .from('user_earnings')
    .upsert({
      user_id: user.id,
      paypal_email: paypalEmail,
      venmo_username: venmoUsername,
    }, { onConflict: 'user_id' });

  if (error) {
    throw new Error(error.message);
  }
}
