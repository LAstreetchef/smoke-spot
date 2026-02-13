-- ============================================================
-- FEED SYSTEM (Global + Spot sub-feeds)
-- Migration for FindSmokeSpot.com
-- ============================================================

-- 1. Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Feed Posts table
CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT 'Anonymous',
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  image_url TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  -- NULL = global feed, set = spot sub-feed
  spot_id UUID REFERENCES smoke_spots(id) ON DELETE CASCADE,
  vote_score INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spatial index for proximity queries
CREATE INDEX idx_feed_posts_location ON feed_posts USING GIST (location);
-- Index for expiration cleanup
CREATE INDEX idx_feed_posts_expires_at ON feed_posts (expires_at);
-- Index for hot sorting (score + recency)
CREATE INDEX idx_feed_posts_score ON feed_posts (vote_score DESC, created_at DESC);
-- Index for spot sub-feeds
CREATE INDEX idx_feed_posts_spot ON feed_posts (spot_id, created_at DESC) WHERE spot_id IS NOT NULL;

-- Auto-populate geography column from lat/lng
CREATE OR REPLACE FUNCTION set_post_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_post_location
  BEFORE INSERT OR UPDATE OF lat, lng ON feed_posts
  FOR EACH ROW EXECUTE FUNCTION set_post_location();

-- 3. Votes table
CREATE TABLE IF NOT EXISTS feed_post_votes (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  direction SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- 4. Comments table
CREATE TABLE IF NOT EXISTS feed_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT 'Anonymous',
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feed_post_comments_post ON feed_post_comments (post_id, created_at);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Fetch nearby posts for GLOBAL feed (spot_id IS NULL only)
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

-- Fetch posts for a SPOT sub-feed
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

-- Vote on a post (upsert: change vote or remove if same direction)
CREATE OR REPLACE FUNCTION vote_on_post(
  p_post_id UUID,
  p_direction SMALLINT
)
RETURNS TABLE (new_score INT) AS $$
DECLARE
  existing_direction SMALLINT;
  score_delta INT := 0;
BEGIN
  -- Check existing vote
  SELECT direction INTO existing_direction
  FROM feed_post_votes
  WHERE user_id = auth.uid() AND post_id = p_post_id;

  IF existing_direction IS NOT NULL THEN
    IF existing_direction = p_direction THEN
      -- Same vote: remove it (toggle off)
      DELETE FROM feed_post_votes WHERE user_id = auth.uid() AND post_id = p_post_id;
      score_delta := -existing_direction;
    ELSE
      -- Different vote: flip it
      UPDATE feed_post_votes SET direction = p_direction, created_at = NOW()
      WHERE user_id = auth.uid() AND post_id = p_post_id;
      score_delta := p_direction * 2;
    END IF;
  ELSE
    -- No existing vote: insert
    INSERT INTO feed_post_votes (user_id, post_id, direction)
    VALUES (auth.uid(), p_post_id, p_direction);
    score_delta := p_direction;
  END IF;

  -- Update denormalized score
  UPDATE feed_posts SET vote_score = vote_score + score_delta WHERE id = p_post_id;

  RETURN QUERY SELECT feed_posts.vote_score FROM feed_posts WHERE feed_posts.id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment comment count trigger
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feed_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feed_posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_comment_count
  AFTER INSERT OR DELETE ON feed_post_comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_post_comments ENABLE ROW LEVEL SECURITY;

-- Posts: anyone can read non-expired, authenticated can insert own
CREATE POLICY "Anyone can read active posts" ON feed_posts
  FOR SELECT USING (expires_at > NOW());

CREATE POLICY "Authenticated users can create posts" ON feed_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON feed_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Votes
CREATE POLICY "Users can read own votes" ON feed_post_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can vote" ON feed_post_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change votes" ON feed_post_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can remove votes" ON feed_post_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Anyone can read comments" ON feed_post_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON feed_post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON feed_post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- CLEANUP
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_posts()
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM feed_posts WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
