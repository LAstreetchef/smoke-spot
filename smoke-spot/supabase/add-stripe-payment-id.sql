-- Add stripe_payment_id to ad_campaigns table
-- Run this in Supabase SQL Editor

ALTER TABLE ad_campaigns 
ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT;

-- Also add SUPABASE_SERVICE_ROLE_KEY to .env.local for webhook
-- Get it from Supabase Dashboard > Settings > API > service_role key
