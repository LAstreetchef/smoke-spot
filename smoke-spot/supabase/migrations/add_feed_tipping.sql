-- ============================================================
-- FEED TIPPING SYSTEM — "Light It Up" 🔥
-- Migration for FindSmokeSpot.com
-- ============================================================

-- 1. Tips table
CREATE TABLE IF NOT EXISTS feed_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL CHECK (amount_cents >= 100), -- minimum $1.00
  platform_fee_cents INT NOT NULL DEFAULT 0,
  net_amount_cents INT NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_tips_post ON feed_tips (post_id, status);
CREATE INDEX idx_feed_tips_recipient ON feed_tips (recipient_id, status, created_at);
CREATE INDEX idx_feed_tips_sender ON feed_tips (sender_id, created_at);
CREATE INDEX idx_feed_tips_stripe ON feed_tips (stripe_payment_intent_id);

-- 2. Denormalized tip totals on posts for display
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS tip_total_cents INT NOT NULL DEFAULT 0;
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS tip_count INT NOT NULL DEFAULT 0;

-- 3. User earnings tracking
CREATE TABLE IF NOT EXISTS user_earnings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_earned_cents INT NOT NULL DEFAULT 0,
  total_withdrawn_cents INT NOT NULL DEFAULT 0,
  pending_balance_cents INT NOT NULL DEFAULT 0,
  last_payout_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Payout history
CREATE TABLE IF NOT EXISTS payout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  payout_method TEXT NOT NULL CHECK (payout_method IN ('paypal', 'venmo', 'stripe')),
  payout_destination TEXT NOT NULL, -- email or username
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_payout_history_user ON payout_history (user_id, created_at DESC);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Record a successful tip (called after Stripe confirms payment)
CREATE OR REPLACE FUNCTION record_tip(
  p_sender_id UUID,
  p_post_id UUID,
  p_amount_cents INT,
  p_stripe_payment_intent_id TEXT
)
RETURNS UUID AS $$
DECLARE
  v_recipient_id UUID;
  v_platform_fee INT;
  v_net_amount INT;
  v_tip_id UUID;
BEGIN
  -- Get post owner
  SELECT user_id INTO v_recipient_id
  FROM feed_posts WHERE id = p_post_id;

  IF v_recipient_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Cannot tip yourself
  IF v_recipient_id = p_sender_id THEN
    RAISE EXCEPTION 'Cannot tip your own post';
  END IF;

  -- Calculate 15% platform fee
  v_platform_fee := CEIL(p_amount_cents * 0.15);
  v_net_amount := p_amount_cents - v_platform_fee;

  -- Insert tip
  INSERT INTO feed_tips (
    sender_id, recipient_id, post_id,
    amount_cents, platform_fee_cents, net_amount_cents,
    stripe_payment_intent_id, status
  ) VALUES (
    p_sender_id, v_recipient_id, p_post_id,
    p_amount_cents, v_platform_fee, v_net_amount,
    p_stripe_payment_intent_id, 'succeeded'
  ) RETURNING id INTO v_tip_id;

  -- Update post tip totals
  UPDATE feed_posts
  SET tip_total_cents = tip_total_cents + p_amount_cents,
      tip_count = tip_count + 1
  WHERE id = p_post_id;

  -- Update or create user earnings
  INSERT INTO user_earnings (user_id, total_earned_cents, pending_balance_cents)
  VALUES (v_recipient_id, v_net_amount, v_net_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    total_earned_cents = user_earnings.total_earned_cents + v_net_amount,
    pending_balance_cents = user_earnings.pending_balance_cents + v_net_amount,
    updated_at = NOW();

  RETURN v_tip_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's earnings summary
CREATE OR REPLACE FUNCTION get_earnings_summary(p_user_id UUID)
RETURNS TABLE (
  total_earned_cents INT,
  total_withdrawn_cents INT,
  pending_balance_cents INT,
  last_payout_at TIMESTAMPTZ,
  total_tips_received INT,
  total_tips_sent INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(e.total_earned_cents, 0),
    COALESCE(e.total_withdrawn_cents, 0),
    COALESCE(e.pending_balance_cents, 0),
    e.last_payout_at,
    (SELECT COUNT(*)::INT FROM feed_tips t WHERE t.recipient_id = p_user_id AND t.status = 'succeeded'),
    (SELECT COUNT(*)::INT FROM feed_tips t WHERE t.sender_id = p_user_id AND t.status = 'succeeded')
  FROM user_earnings e
  WHERE e.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get tip activity for a post
CREATE OR REPLACE FUNCTION get_post_tips(p_post_id UUID)
RETURNS TABLE (
  id UUID,
  sender_nickname TEXT,
  amount_cents INT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    COALESCE(u.nickname, 'Anonymous') AS sender_nickname,
    t.amount_cents,
    t.created_at
  FROM feed_tips t
  LEFT JOIN users u ON u.id = t.sender_id
  WHERE t.post_id = p_post_id AND t.status = 'succeeded'
  ORDER BY t.created_at DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE feed_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_history ENABLE ROW LEVEL SECURITY;

-- Tips: users can see tips on any post, only system can insert (via service role after Stripe webhook)
CREATE POLICY "Anyone can view succeeded tips" ON feed_tips
  FOR SELECT USING (status = 'succeeded');

-- Earnings: users can only see their own
CREATE POLICY "Users can view own earnings" ON user_earnings
  FOR SELECT USING (auth.uid() = user_id);

-- Payouts: users can only see their own
CREATE POLICY "Users can view own payouts" ON payout_history
  FOR SELECT USING (auth.uid() = user_id);
