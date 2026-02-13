-- Fix RLS policies for advertisers table
-- Run this in your Supabase SQL editor

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Business users can create advertiser profile" ON advertisers;

-- Create a more permissive policy for authenticated users
-- This allows any authenticated user to create an advertiser profile for themselves
CREATE POLICY "Authenticated users can create advertiser profile" 
  ON advertisers 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Also ensure users can create their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can insert own profile" 
  ON users 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Verify policies
SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('users', 'advertisers');
