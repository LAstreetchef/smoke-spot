// Tipping types for "Light It Up" 🔥

export const TIP_PRESETS = [200, 500, 2000, 5000, 10000] as const; // cents
export const PLATFORM_FEE_PERCENT = 15;
export const MIN_PAYOUT_CENTS = 500; // $5 minimum
export const MAX_TIP_CENTS = 100000; // $1000 max

export type TipPreset = typeof TIP_PRESETS[number];

export interface FeedTip {
  id: string;
  post_id: string;
  sender_id: string;
  recipient_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  stripe_payment_intent_id: string | null;
  status: 'pending' | 'succeeded' | 'failed';
  created_at: string;
}

export interface UserEarnings {
  id: string;
  user_id: string;
  total_earned_cents: number;
  withdrawn_cents: number;
  pending_balance_cents: number;
  paypal_email: string | null;
  venmo_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayoutRequest {
  id: string;
  user_id: string;
  amount_cents: number;
  payout_method: 'paypal' | 'venmo';
  payout_destination: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface EarningsSummary {
  total_earned_cents: number;
  withdrawn_cents: number;
  pending_balance_cents: number;
  paypal_email: string | null;
  venmo_username: string | null;
  tip_count: number;
  recent_tips: RecentTip[];
}

export interface RecentTip {
  id: string;
  amount_cents: number;
  platform_fee_cents: number;
  created_at: string;
  post_preview: string;
}

export interface CreateTipIntentRequest {
  post_id: string;
  amount_cents: number;
}

export interface CreateTipIntentResponse {
  client_secret: string;
  payment_intent_id: string;
}

export interface RequestPayoutRequest {
  payout_method: 'paypal' | 'venmo';
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatCentsShort(cents: number): string {
  if (cents >= 100) {
    return `$${Math.floor(cents / 100)}`;
  }
  return `${cents}¢`;
}
