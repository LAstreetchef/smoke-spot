// Temporary migration endpoint - run once then delete
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  // Only allow from admin
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== 'Bearer migrate-tips-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sql = `
-- Update global_feed to include tip data
CREATE OR REPLACE FUNCTION global_feed(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION DEFAULT 5,
  sort_by TEXT DEFAULT 'hot',
  page_limit INT DEFAULT 50,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  nickname TEXT,
  content TEXT,
  image_url TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  spot_id UUID,
  vote_score INT,
  comment_count INT,
  tip_total_cents INT,
  tip_count INT,
  distance_miles DOUBLE PRECISION,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  my_vote SMALLINT
) AS $$
DECLARE
  radius_meters DOUBLE PRECISION := radius_miles * 1609.34;
  user_point GEOGRAPHY := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.nickname,
    p.content,
    p.image_url,
    p.lat,
    p.lng,
    p.spot_id,
    p.vote_score,
    p.comment_count,
    COALESCE(p.tip_total_cents, 0) AS tip_total_cents,
    COALESCE(p.tip_count, 0) AS tip_count,
    ROUND((ST_Distance(p.location, user_point) / 1609.34)::numeric, 2)::double precision AS distance_miles,
    p.created_at,
    p.expires_at,
    v.direction AS my_vote
  FROM feed_posts p
  LEFT JOIN feed_post_votes v ON v.post_id = p.id AND v.user_id = auth.uid()
  WHERE p.spot_id IS NULL
    AND ST_DWithin(p.location, user_point, radius_meters)
    AND p.expires_at > NOW()
  ORDER BY
    CASE WHEN sort_by = 'hot'
      THEN p.vote_score::double precision / GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600, 1)
      ELSE NULL
    END DESC NULLS LAST,
    CASE WHEN sort_by = 'new' THEN p.created_at ELSE NULL END DESC NULLS LAST
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update spot_feed to include tip data
CREATE OR REPLACE FUNCTION spot_feed(
  p_spot_id UUID,
  sort_by TEXT DEFAULT 'new',
  page_limit INT DEFAULT 50,
  page_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  nickname TEXT,
  content TEXT,
  image_url TEXT,
  vote_score INT,
  comment_count INT,
  tip_total_cents INT,
  tip_count INT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  my_vote SMALLINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.nickname,
    p.content,
    p.image_url,
    p.vote_score,
    p.comment_count,
    COALESCE(p.tip_total_cents, 0) AS tip_total_cents,
    COALESCE(p.tip_count, 0) AS tip_count,
    p.created_at,
    p.expires_at,
    v.direction AS my_vote
  FROM feed_posts p
  LEFT JOIN feed_post_votes v ON v.post_id = p.id AND v.user_id = auth.uid()
  WHERE p.spot_id = p_spot_id
    AND p.expires_at > NOW()
  ORDER BY
    CASE WHEN sort_by = 'hot'
      THEN p.vote_score::double precision / GREATEST(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600, 1)
      ELSE NULL
    END DESC NULLS LAST,
    CASE WHEN sort_by = 'new' THEN p.created_at ELSE NULL END DESC NULLS LAST
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  // Execute the migration using a raw query
  // Note: Supabase doesn't allow raw DDL via REST, so we need to run this via dashboard
  // This endpoint just returns the SQL to run
  
  return NextResponse.json({ 
    message: 'Run this SQL in Supabase Dashboard > SQL Editor',
    sql 
  });
}
