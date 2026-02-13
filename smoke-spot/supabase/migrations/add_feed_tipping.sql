-- Add tipping columns to feed_posts
ALTER TABLE feed_posts 
ADD COLUMN IF NOT EXISTS tip_total_cents INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS tip_count INT DEFAULT 0;

-- Create feed_tips table
CREATE TABLE IF NOT EXISTS feed_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),
  amount_cents INT NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 100000),
  platform_fee_cents INT NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_earnings table
CREATE TABLE IF NOT EXISTS user_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  total_earned_cents INT DEFAULT 0,
  withdrawn_cents INT DEFAULT 0,
  pending_balance_cents INT DEFAULT 0,
  paypal_email TEXT,
  venmo_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payout_history table
CREATE TABLE IF NOT EXISTS payout_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount_cents INT NOT NULL CHECK (amount_cents > 0),
  payout_method TEXT NOT NULL CHECK (payout_method IN ('paypal', 'venmo')),
  payout_destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- RPC: Record a tip after Stripe confirms payment
CREATE OR REPLACE FUNCTION record_tip(
  p_post_id UUID,
  p_sender_id UUID,
  p_amount_cents INT,
  p_stripe_payment_intent_id TEXT
) RETURNS JSON AS $$
DECLARE
  v_recipient_id UUID;
  v_platform_fee_cents INT;
  v_net_amount_cents INT;
  v_tip_id UUID;
BEGIN
  -- Get the post owner (recipient)
  SELECT user_id INTO v_recipient_id FROM feed_posts WHERE id = p_post_id;
  
  IF v_recipient_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Post not found');
  END IF;
  
  -- Prevent self-tipping
  IF v_recipient_id = p_sender_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot tip your own post');
  END IF;
  
  -- Calculate 15% platform fee
  v_platform_fee_cents := FLOOR(p_amount_cents * 0.15);
  v_net_amount_cents := p_amount_cents - v_platform_fee_cents;
  
  -- Insert the tip record
  INSERT INTO feed_tips (post_id, sender_id, recipient_id, amount_cents, platform_fee_cents, stripe_payment_intent_id, status)
  VALUES (p_post_id, p_sender_id, v_recipient_id, p_amount_cents, v_platform_fee_cents, p_stripe_payment_intent_id, 'succeeded')
  RETURNING id INTO v_tip_id;
  
  -- Update post tip totals
  UPDATE feed_posts 
  SET tip_total_cents = COALESCE(tip_total_cents, 0) + p_amount_cents,
      tip_count = COALESCE(tip_count, 0) + 1
  WHERE id = p_post_id;
  
  -- Update or create recipient earnings
  INSERT INTO user_earnings (user_id, total_earned_cents, pending_balance_cents)
  VALUES (v_recipient_id, v_net_amount_cents, v_net_amount_cents)
  ON CONFLICT (user_id) DO UPDATE SET
    total_earned_cents = user_earnings.total_earned_cents + v_net_amount_cents,
    pending_balance_cents = user_earnings.pending_balance_cents + v_net_amount_cents,
    updated_at = NOW();
  
  RETURN json_build_object(
    'success', true,
    'tip_id', v_tip_id,
    'net_amount_cents', v_net_amount_cents,
    'platform_fee_cents', v_platform_fee_cents
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get user's earnings summary
CREATE OR REPLACE FUNCTION get_earnings_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_earnings user_earnings%ROWTYPE;
  v_tip_count INT;
  v_recent_tips JSON;
BEGIN
  SELECT * INTO v_earnings FROM user_earnings WHERE user_id = p_user_id;
  
  IF v_earnings IS NULL THEN
    RETURN json_build_object(
      'total_earned_cents', 0,
      'withdrawn_cents', 0,
      'pending_balance_cents', 0,
      'paypal_email', NULL,
      'venmo_username', NULL,
      'tip_count', 0,
      'recent_tips', '[]'::JSON
    );
  END IF;
  
  SELECT COUNT(*) INTO v_tip_count FROM feed_tips WHERE recipient_id = p_user_id AND status = 'succeeded';
  
  SELECT json_agg(t) INTO v_recent_tips FROM (
    SELECT ft.id, ft.amount_cents, ft.platform_fee_cents, ft.created_at, fp.content as post_preview
    FROM feed_tips ft
    JOIN feed_posts fp ON ft.post_id = fp.id
    WHERE ft.recipient_id = p_user_id AND ft.status = 'succeeded'
    ORDER BY ft.created_at DESC
    LIMIT 10
  ) t;
  
  RETURN json_build_object(
    'total_earned_cents', v_earnings.total_earned_cents,
    'withdrawn_cents', v_earnings.withdrawn_cents,
    'pending_balance_cents', v_earnings.pending_balance_cents,
    'paypal_email', v_earnings.paypal_email,
    'venmo_username', v_earnings.venmo_username,
    'tip_count', v_tip_count,
    'recent_tips', COALESCE(v_recent_tips, '[]'::JSON)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get tips on a post
CREATE OR REPLACE FUNCTION get_post_tips(p_post_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(t) FROM (
      SELECT ft.id, ft.amount_cents, ft.created_at
      FROM feed_tips ft
      WHERE ft.post_id = p_post_id AND ft.status = 'succeeded'
      ORDER BY ft.created_at DESC
      LIMIT 20
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE feed_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_history ENABLE ROW LEVEL SECURITY;

-- Feed tips: users can see tips on posts, create their own tips
CREATE POLICY "Anyone can view tips" ON feed_tips FOR SELECT USING (true);
CREATE POLICY "Users can create tips" ON feed_tips FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- User earnings: users can only see/update their own
CREATE POLICY "Users can view own earnings" ON user_earnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own earnings" ON user_earnings FOR UPDATE USING (auth.uid() = user_id);

-- Payout history: users can only see their own
CREATE POLICY "Users can view own payouts" ON payout_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own payouts" ON payout_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feed_tips_post_id ON feed_tips(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_tips_recipient_id ON feed_tips(recipient_id);
CREATE INDEX IF NOT EXISTS idx_feed_tips_sender_id ON feed_tips(sender_id);
CREATE INDEX IF NOT EXISTS idx_payout_history_user_id ON payout_history(user_id);
