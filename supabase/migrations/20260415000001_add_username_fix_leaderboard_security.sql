-- Migration: Add username to profiles and fix leaderboard security
-- This fixes TUB-230: Hide player emails from leaderboard RPCs

-- 1. Add username column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- 2. Backfill usernames from auth.users metadata for existing users
-- Fall back to email prefix if no username in metadata
UPDATE profiles p
SET username = COALESCE(
    (SELECT raw_user_meta_data->>'username' 
     FROM auth.users 
     WHERE id = p.id),
    SPLIT_PART(p.email, '@', 1)
)
WHERE username IS NULL;

-- 3. Update handle_new_user trigger to populate username from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_premium, username)
  VALUES (
    NEW.id, 
    NEW.email, 
    FALSE,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate get_weekly_leaderboard to return username instead of email.
-- Postgres cannot CREATE OR REPLACE a function when the RETURNS TABLE
-- columns change (email → username), so drop first.
DROP FUNCTION IF EXISTS get_weekly_leaderboard(TEXT, DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION get_weekly_leaderboard(
  p_game_type TEXT,
  p_week_start DATE,
  p_week_end DATE,
  p_city TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  city TEXT,
  borough TEXT,
  total_score BIGINT,
  games_played BIGINT,
  rank BIGINT,
  total_players BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH scores AS (
    SELECT
      l.user_id AS uid,
      SUM(l.score) AS total_score,
      COUNT(*) AS games_played
    FROM leaderboard l
    WHERE l.game_type = p_game_type
      AND l.game_date BETWEEN p_week_start AND p_week_end
    GROUP BY l.user_id
  ),
  filtered AS (
    SELECT
      s.uid,
      p.username,
      p.city,
      p.borough,
      s.total_score,
      s.games_played
    FROM scores s
    JOIN profiles p ON p.id = s.uid
    WHERE (p_city IS NULL OR p.city = p_city)
  ),
  ranked AS (
    SELECT
      f.*,
      ROW_NUMBER() OVER (ORDER BY f.total_score ASC) AS rank,
      COUNT(*) OVER () AS total_players
    FROM filtered f
  )
  SELECT
    r.uid AS user_id,
    r.username,
    r.city,
    r.borough,
    r.total_score,
    r.games_played,
    r.rank,
    r.total_players
  FROM ranked r
  ORDER BY r.rank ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- 5. Recreate get_borough_breakdown to return leader username instead of email
DROP FUNCTION IF EXISTS get_borough_breakdown(TEXT, DATE, DATE);

CREATE OR REPLACE FUNCTION get_borough_breakdown(
  p_game_type TEXT,
  p_week_start DATE,
  p_week_end DATE
)
RETURNS TABLE (
  borough TEXT,
  commuter_count BIGINT,
  leader_username TEXT,
  top_score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_scores AS (
    SELECT
      p.borough AS b,
      l.user_id AS uid,
      p.username AS uname,
      SUM(l.score) AS total_score
    FROM leaderboard l
    JOIN profiles p ON p.id = l.user_id
    WHERE l.game_type = p_game_type
      AND l.game_date BETWEEN p_week_start AND p_week_end
      AND p.city = 'London'
      AND p.borough IS NOT NULL
    GROUP BY p.borough, l.user_id, p.username
  ),
  borough_leaders AS (
    SELECT DISTINCT ON (b)
      b,
      uname,
      total_score
    FROM user_scores
    ORDER BY b, total_score ASC
  ),
  borough_counts AS (
    SELECT
      b,
      COUNT(DISTINCT uid) AS commuter_count
    FROM user_scores
    GROUP BY b
  )
  SELECT
    bc.b AS borough,
    bc.commuter_count,
    bl.uname AS leader_username,
    bl.total_score AS top_score
  FROM borough_counts bc
  JOIN borough_leaders bl ON bl.b = bc.b
  ORDER BY bc.b;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- 6. Lock EXECUTE to authenticated users.
-- New functions inherit EXECUTE for PUBLIC, which includes the anon role.
-- Revoking only FROM anon leaves the PUBLIC grant in place.
REVOKE ALL ON FUNCTION get_weekly_leaderboard(TEXT, DATE, DATE, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_weekly_leaderboard(TEXT, DATE, DATE, TEXT) FROM anon;
REVOKE ALL ON FUNCTION get_borough_breakdown(TEXT, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_borough_breakdown(TEXT, DATE, DATE) FROM anon;

GRANT EXECUTE ON FUNCTION get_weekly_leaderboard(TEXT, DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_borough_breakdown(TEXT, DATE, DATE) TO authenticated;

-- Note: get_available_cities doesn't expose sensitive data, so we leave it accessible
