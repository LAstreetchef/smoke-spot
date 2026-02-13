-- Run this in Supabase SQL Editor to fix advertiser signup

-- Create a function that bypasses RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_advertiser(
  p_user_id UUID,
  p_business_name TEXT,
  p_business_type business_type,
  p_logo_url TEXT,
  p_website_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the function owner's privileges, bypassing RLS
SET search_path = public
AS $$
DECLARE
  v_advertiser_id UUID;
BEGIN
  -- Verify the caller is the user they claim to be
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: user mismatch';
  END IF;

  -- Ensure user profile exists first
  INSERT INTO users (id, email, username, referral_code, role)
  SELECT 
    p_user_id,
    (SELECT email FROM auth.users WHERE id = p_user_id),
    (SELECT COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1) || '_' || substr(md5(random()::text), 1, 6)) FROM auth.users WHERE id = p_user_id),
    upper(substr(md5(random()::text), 1, 8)),
    'business'
  ON CONFLICT (id) DO UPDATE SET role = 'business';

  -- Create the advertiser
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_advertiser TO authenticated;
