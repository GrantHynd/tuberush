-- TUB-257 / TUB-260 / TUB-265
-- Additive only. Safe to apply before or after the app release:
--   * New nullable columns; existing rows keep NULL (treated as legacy "won").
--   * get_weekly_leaderboard gains an optional p_borough (old 4-arg calls still work
--     via the default) and ignores rows with result = 'lost'.
--   * get_borough_breakdown also ignores lost rows.

-- 1. Real game outcome + Connections mistake count on each leaderboard row.
ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS result TEXT,
  ADD COLUMN IF NOT EXISTS mistakes SMALLINT;

ALTER TABLE public.leaderboard
  DROP CONSTRAINT IF EXISTS leaderboard_result_check,
  ADD CONSTRAINT leaderboard_result_check CHECK (result IS NULL OR result IN ('won', 'lost')),
  DROP CONSTRAINT IF EXISTS leaderboard_mistakes_check,
  ADD CONSTRAINT leaderboard_mistakes_check CHECK (mistakes IS NULL OR mistakes BETWEEN 0 AND 4);

-- 2. Weekly leaderboard with optional borough filter; lost games never rank.
DROP FUNCTION IF EXISTS get_weekly_leaderboard(TEXT, DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION get_weekly_leaderboard(
  p_game_type TEXT,
  p_week_start DATE,
  p_week_end DATE,
  p_city TEXT DEFAULT NULL,
  p_borough TEXT DEFAULT NULL
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
      AND l.result IS DISTINCT FROM 'lost'
    GROUP BY l.user_id
  ),
  filtered AS (
    SELECT s.uid, p.username, p.city, p.borough, s.total_score, s.games_played
    FROM scores s
    JOIN profiles p ON p.id = s.uid
    WHERE (p_city IS NULL OR p.city = p_city)
      AND (p_borough IS NULL OR p.borough = p_borough)
  ),
  ranked AS (
    SELECT
      f.*,
      ROW_NUMBER() OVER (ORDER BY f.total_score ASC) AS rank,
      COUNT(*) OVER () AS total_players
    FROM filtered f
  )
  SELECT r.uid AS user_id, r.username, r.city, r.borough, r.total_score,
         r.games_played, r.rank, r.total_players
  FROM ranked r
  ORDER BY r.rank ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- 3. Borough breakdown: exclude lost games (signature unchanged).
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
    SELECT p.borough AS b, l.user_id AS uid, p.username AS uname, SUM(l.score) AS total_score
    FROM leaderboard l
    JOIN profiles p ON p.id = l.user_id
    WHERE l.game_type = p_game_type
      AND l.game_date BETWEEN p_week_start AND p_week_end
      AND l.result IS DISTINCT FROM 'lost'
      AND p.city = 'London'
      AND p.borough IS NOT NULL
    GROUP BY p.borough, l.user_id, p.username
  ),
  borough_leaders AS (
    SELECT DISTINCT ON (b) b, uname, total_score
    FROM user_scores
    ORDER BY b, total_score ASC
  ),
  borough_counts AS (
    SELECT b, COUNT(DISTINCT uid) AS commuter_count
    FROM user_scores
    GROUP BY b
  )
  SELECT bc.b AS borough, bc.commuter_count, bl.uname AS leader_username, bl.total_score AS top_score
  FROM borough_counts bc
  JOIN borough_leaders bl ON bl.b = bc.b
  ORDER BY bc.b;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- 4. Same EXECUTE lockdown as 20260415000001 (authenticated only).
REVOKE ALL ON FUNCTION get_weekly_leaderboard(TEXT, DATE, DATE, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_weekly_leaderboard(TEXT, DATE, DATE, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION get_weekly_leaderboard(TEXT, DATE, DATE, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION get_borough_breakdown(TEXT, DATE, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_borough_breakdown(TEXT, DATE, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION get_borough_breakdown(TEXT, DATE, DATE) TO authenticated;
