// types/tipping.ts

export interface FeedTip {
  id: string;
  sender_id: string;
  recipient_id: string;
  post_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  net_amount_cents: number;
  stripe_payment_intent_id: string | null;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  created_at: string;
}

export interface PostTipInfo {
  id: string;
  sender_nickname: string;
  amount_cents: number;
  created_at: string;
}

export interface EarningsSummary {
  total_earned_cents: number;
  total_withdrawn_cents: number;
  pending_balance_cents: number;
  last_payout_at: string | null;
  total_tips_received: number;
  total_tips_sent: number;
}

export interface PayoutRecord {
  id: string;
  user_id: string;
  amount_cents: number;
  payout_method: 'paypal' | 'venmo' | 'stripe';
  payout_destination: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stripe_transfer_id: string | null;
  created_at: string;
  completed_at: string | null;
}

export const TIP_PRESETS = [200, 500, 2000, 5000, 10000] as const; // $2, $5, $20, $50, $100
export type TipPreset = typeof TIP_PRESETS[number];
