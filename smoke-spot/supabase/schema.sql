-- Smoke Spot Database Schema
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_role AS ENUM ('smoker', 'business', 'staff', 'admin');
CREATE TYPE spot_type AS ENUM ('outdoor', 'indoor', 'covered', 'rooftop', 'balcony', 'alley', 'park', 'other');
CREATE TYPE spot_status AS ENUM ('pending', 'approved', 'flagged', 'removed');
CREATE TYPE business_type AS ENUM ('smoke_shop', 'dispensary', 'bar', 'lounge', 'restaurant', 'vape_shop', 'brand', 'other');
CREATE TYPE ad_type AS ENUM ('banner', 'featured_spot', 'sponsored_pin', 'interstitial');
CREATE TYPE ad_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE ad_event_type AS ENUM ('impression', 'click');
CREATE TYPE referral_status AS ENUM ('pending', 'qualified', 'paid');
CREATE TYPE share_type AS ENUM ('spot', 'profile', 'contact');

-- Users table
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smoke spots table
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

-- Reviews table
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spot_id UUID NOT NULL REFERENCES smoke_spots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photos TEXT[] DEFAULT '{}',
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spot_id, user_id) -- One review per user per spot
);

-- Advertisers table
CREATE TABLE advertisers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type business_type NOT NULL,
  logo_url TEXT NOT NULL,
  website_url TEXT,
  stripe_account_id TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad campaigns table
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
  cpm_cents INTEGER NOT NULL, -- cost per 1000 impressions
  status ad_status DEFAULT 'draft',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad events table (impressions and clicks)
CREATE TABLE ad_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type ad_event_type NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate referrals table
CREATE TABLE affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  status referral_status DEFAULT 'pending',
  commission_cents INTEGER DEFAULT 0,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NFC shares table
CREATE TABLE nfc_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_type share_type NOT NULL,
  payload_id UUID NOT NULL, -- SmokeSpot.id or User.id
  short_code TEXT UNIQUE NOT NULL,
  scans INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved spots (bookmarks)
CREATE TABLE saved_spots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spot_id UUID NOT NULL REFERENCES smoke_spots(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, spot_id)
);

-- Indexes for performance
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

-- Function to update avg_rating on review changes
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

-- Trigger for rating updates
CREATE TRIGGER trigger_update_spot_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_spot_rating();

-- Function to increment user's total_spots_created
CREATE OR REPLACE FUNCTION increment_user_spots()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET total_spots_created = total_spots_created + 1 WHERE id = NEW.created_by;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for spot creation
CREATE TRIGGER trigger_increment_user_spots
AFTER INSERT ON smoke_spots
FOR EACH ROW EXECUTE FUNCTION increment_user_spots();

-- Function to generate unique referral code
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

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE smoke_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_spots ENABLE ROW LEVEL SECURITY;

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

-- Ad events policies (write-only for logging)
CREATE POLICY "Anyone can log ad events" ON ad_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Advertisers can view own campaign events" ON ad_events FOR SELECT USING (campaign_id IN (SELECT id FROM ad_campaigns WHERE advertiser_id IN (SELECT id FROM advertisers WHERE user_id = auth.uid())));

-- Affiliate referrals policies
CREATE POLICY "Users can view own referrals" ON affiliate_referrals FOR SELECT USING (auth.uid() = referrer_user_id);

-- NFC shares policies
CREATE POLICY "Anyone can view shares for scanning" ON nfc_shares FOR SELECT USING (true);
CREATE POLICY "Users can create shares" ON nfc_shares FOR INSERT WITH CHECK (auth.uid() = sender_user_id);
CREATE POLICY "Anyone can increment scan count" ON nfc_shares FOR UPDATE USING (true);
