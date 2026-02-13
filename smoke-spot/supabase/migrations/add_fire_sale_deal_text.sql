-- Add deal_text column for Fire Sale campaigns
ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS deal_text TEXT;

-- Add comment for clarity
COMMENT ON COLUMN ad_campaigns.deal_text IS 'Deal headline for fire_sale ad type (e.g., "BOGO Lighters", "Free Rolling Papers")';

-- Update ad_type check constraint to include fire_sale
-- First drop the existing constraint if any, then add updated one
DO $$
BEGIN
  -- Try to drop existing constraint (may not exist)
  ALTER TABLE ad_campaigns DROP CONSTRAINT IF EXISTS ad_campaigns_ad_type_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Note: Supabase uses enum types, so we need to add the new value to the enum
DO $$
BEGIN
  ALTER TYPE ad_type ADD VALUE IF NOT EXISTS 'fire_sale';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
