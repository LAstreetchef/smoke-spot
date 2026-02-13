-- ============================================
-- SMOKE SPOT - COMPLETE DATABASE SCHEMA
-- findsmokespot.com
-- Generated: 2026-02-13
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('smoker', 'business', 'staff', 'admin');
CREATE TYPE spot_type AS ENUM ('outdoor', 'indoor', 'covered', 'rooftop', 'balcony', 'alley', 'park', 'other');
CREATE TYPE spot_status AS ENUM ('pending', 'approved', 'flagged', 'removed');
CREATE TYPE business_type AS ENUM ('smoke_shop', 'dispensary', 'bar', 'lounge', 'restaurant', 'vape_shop', 'brand', 'other');
CREATE TYPE ad_type AS ENUM ('banner', 'featured_spot', 'sponsored_pin', 'interstitial', 'fire_sale');
CREATE TYPE ad_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE ad_event_type AS ENUM ('impression', 'click');
CREATE TYPE referral_status AS ENUM ('pending', 'qualified', 'paid');
CREATE TYPE share_type AS ENUM ('spot', 'profile', 'contact');

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'smoker',
  bio TEXT,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT REFERENCES users(referral_code),
  nfc_card_id TEXT UNIQUE,
  total_spots_created INTEGER DEFAULT 0,
  total_affiliate_earnings INTEGER DEFAULT 0, -- cents
  paypal_email TEXT,
  venmo_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SMOKE SPOTS TABLE
-- ============================================
CREATE TABLE smoke_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  spot_type spot_type NOT NULL,
  vibe_tags TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',
  photos TEXT[] DEFAULT '{}',
  avg_rating NUMERIC(2,1) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  operating_hours TEXT,
  status spot_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REVIEWS TABLE
-- ============================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID NOT NULL REFERENCES smoke_spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photos TEXT[] DEFAULT '{}',
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

-- ============================================
-- ADVERTISERS TABLE
-- ============================================
CREATE TABLE advertisers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type business_type NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  stripe_account_id TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  referred_by_code VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AD CAMPAIGNS TABLE
-- ============================================
CREATE TABLE ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ad_type ad_type NOT NULL,
  creative_url TEXT NOT NULL,
  click_url TEXT NOT NULL,
  target_radius_km NUMERIC(6,2) NOT NULL,
  target_center_lat DOUBLE PRECISION NOT NULL,
  target_center_lng DOUBLE PRECISION NOT NULL,
  budget_cents INTEGER NOT NULL,
  spent_cents INTEGER DEFAULT 0,
  cpm_cents INTEGER NOT NULL,
  status ad_status DEFAULT 'draft',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  deal_text TEXT, -- For fire_sale ad type
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN ad_campaigns.deal_text IS 'Deal headline for fire_sale ad type (e.g., "BOGO Lighters", "Free Rolling Papers")';

-- ============================================
-- AD EVENTS TABLE
-- ============================================
CREATE TABLE ad_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type ad_event_type NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AFFILIATE REFERRALS TABLE (Legacy)
-- ============================================
CREATE TABLE affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  status referral_status DEFAULT 'pending',
  commission_cents INTEGER DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AFFILIATES TABLE (Phase 5)
-- ============================================
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  stripe_account_id VARCHAR(255),
  stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
  commission_rate DECIMAL(5,2) DEFAULT 15.00,
  total_earned_cents INTEGER DEFAULT 0,
  total_paid_cents INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- REFERRALS TABLE (Phase 5)
-- ============================================
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(advertiser_id)
);

-- ============================================
-- COMMISSIONS TABLE (Phase 5)
-- ============================================
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  payment_amount_cents INTEGER NOT NULL,
  commission_amount_cents INTEGER NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  stripe_transfer_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- ============================================
-- NFC SHARES TABLE
-- ============================================
CREATE TABLE nfc_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_type share_type NOT NULL,
  payload_id UUID NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  scans INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SAVED SPOTS TABLE
-- ============================================
CREATE TABLE saved_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES smoke_spots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, spot_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_smoke_spots_location ON smoke_spots(latitude, longitude);
CREATE INDEX idx_smoke_spots_status ON smoke_spots(status) WHERE status = 'approved';
CREATE INDEX idx_smoke_spots_created_by ON smoke_spots(created_by);
CREATE INDEX idx_reviews_spot_id ON reviews(spot_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_ad_campaigns_status ON ad_campaigns(status) WHERE status = 'active';
CREATE INDEX idx_ad_campaigns_location ON ad_campaigns(target_center_lat, target_center_lng);
CREATE INDEX idx_ad_events_campaign_id ON ad_events(campaign_id);
CREATE INDEX idx_nfc_shares_short_code ON nfc_shares(short_code);
CREATE INDEX idx_saved_spots_user_id ON saved_spots(user_id);
CREATE INDEX idx_affiliates_user_id ON affiliates(user_id);
CREATE INDEX idx_affiliates_referral_code ON affiliates(referral_code);
CREATE INDEX idx_referrals_affiliate_id ON referrals(affiliate_id);
CREATE INDEX idx_referrals_advertiser_id ON referrals(advertiser_id);
CREATE INDEX idx_commissions_referral_id ON commissions(referral_id);
CREATE INDEX idx_commissions_status ON commissions(status);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update spot rating on review changes
CREATE OR REPLACE FUNCTION update_spot_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE smoke_spots
  SET 
    avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE spot_id = COALESCE(NEW.spot_id, OLD.spot_id)),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE spot_id = COALESCE(NEW.spot_id, OLD.spot_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.spot_id, OLD.spot_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Increment user's total_spots_created
CREATE OR REPLACE FUNCTION increment_user_spots()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET total_spots_created = total_spots_created + 1 WHERE id = NEW.created_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Generate affiliate referral code
CREATE OR REPLACE FUNCTION generate_affiliate_referral_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  code VARCHAR(20);
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := 'REF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM affiliates WHERE referral_code = code) INTO exists_check;
    EXIT WHEN NOT exists_check;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Increment affiliate earnings
CREATE OR REPLACE FUNCTION increment_affiliate_earnings(
  p_affiliate_id UUID,
  p_amount INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE affiliates
  SET 
    total_earned_cents = total_earned_cents + p_amount,
    total_paid_cents = total_paid_cents + p_amount,
    updated_at = NOW()
  WHERE id = p_affiliate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create advertiser (bypasses RLS)
CREATE OR REPLACE FUNCTION create_advertiser(
  p_user_id UUID,
  p_business_name TEXT,
  p_business_type business_type,
  p_logo_url TEXT,
  p_website_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_advertiser_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: user mismatch';
  END IF;

  INSERT INTO users (id, email, username, referral_code, role)
  SELECT 
    p_user_id,
    (SELECT email FROM auth.users WHERE id = p_user_id),
    (SELECT COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1) || '_' || substr(md5(random()::text), 1, 6)) FROM auth.users WHERE id = p_user_id),
    upper(substr(md5(random()::text), 1, 8)),
    'business'
  ON CONFLICT (id) DO UPDATE SET role = 'business';

  INSERT INTO advertisers (user_id, business_name, business_type, logo_url, website_url, stripe_account_id)
  VALUES (
    p_user_id,
    p_business_name,
    p_business_type,
    COALESCE(p_logo_url, 'https://via.placeholder.com/150'),
    NULLIF(p_website_url, ''),
    'acct_pending_' || extract(epoch from now())::bigint
  )
  RETURNING id INTO v_advertiser_id;

  RETURN v_advertiser_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_advertiser TO authenticated;

-- ============================================
-- TRIGGERS
-- ============================================
CREATE TRIGGER trigger_update_spot_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_spot_rating();

CREATE TRIGGER trigger_increment_user_spots
AFTER INSERT ON smoke_spots
FOR EACH ROW EXECUTE FUNCTION increment_user_spots();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE smoke_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Smoke spots policies
CREATE POLICY "Anyone can view approved spots" ON smoke_spots FOR SELECT USING (status = 'approved' OR created_by = auth.uid());
CREATE POLICY "Authenticated users can create spots" ON smoke_spots FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update own spots" ON smoke_spots FOR UPDATE USING (auth.uid() = created_by);

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Saved spots policies
CREATE POLICY "Users can view own saved spots" ON saved_spots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can save spots" ON saved_spots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unsave spots" ON saved_spots FOR DELETE USING (auth.uid() = user_id);

-- Advertisers policies
CREATE POLICY "Anyone can view verified advertisers" ON advertisers FOR SELECT USING (is_verified = true OR user_id = auth.uid());
CREATE POLICY "Business users can create advertiser profile" ON advertisers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Advertisers can update own profile" ON advertisers FOR UPDATE USING (auth.uid() = user_id);

-- Ad campaigns policies
CREATE POLICY "Active campaigns visible to all" ON ad_campaigns FOR SELECT USING (status = 'active' OR advertiser_id IN (SELECT id FROM advertisers WHERE user_id = auth.uid()));
CREATE POLICY "Advertisers can manage own campaigns" ON ad_campaigns FOR ALL USING (advertiser_id IN (SELECT id FROM advertisers WHERE user_id = auth.uid()));

-- Ad events policies
CREATE POLICY "Anyone can log ad events" ON ad_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Advertisers can view own campaign events" ON ad_events FOR SELECT USING (campaign_id IN (SELECT id FROM ad_campaigns WHERE advertiser_id IN (SELECT id FROM advertisers WHERE user_id = auth.uid())));

-- Affiliate referrals policies
CREATE POLICY "Users can view own referrals" ON affiliate_referrals FOR SELECT USING (auth.uid() = referrer_user_id);

-- NFC shares policies
CREATE POLICY "Anyone can view shares for scanning" ON nfc_shares FOR SELECT USING (true);
CREATE POLICY "Users can create shares" ON nfc_shares FOR INSERT WITH CHECK (auth.uid() = sender_user_id);
CREATE POLICY "Anyone can increment scan count" ON nfc_shares FOR UPDATE USING (true);

-- Affiliates policies
CREATE POLICY "Users can view own affiliate profile" ON affiliates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own affiliate profile" ON affiliates FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own affiliate profile" ON affiliates FOR UPDATE USING (user_id = auth.uid());

-- Referrals policies
CREATE POLICY "Affiliates can view own referrals" ON referrals FOR SELECT USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- Commissions policies
CREATE POLICY "Affiliates can view own commissions" ON commissions FOR SELECT USING (referral_id IN (SELECT r.id FROM referrals r JOIN affiliates a ON r.affiliate_id = a.id WHERE a.user_id = auth.uid()));

-- ============================================
-- STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('spot-photos', 'spot-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload spot photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'spot-photos');

CREATE POLICY "Anyone can view spot photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'spot-photos');

CREATE POLICY "Users can delete their own spot photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'spot-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
