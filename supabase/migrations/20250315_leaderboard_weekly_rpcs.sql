-- Weekly leaderboard RPCs for aggregated week-scoped boards
-- Supports: per-game ranked list, borough breakdown, dynamic city tabs

-- Index to speed up week-range queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_game_date_range
ON leaderboard (game_type, game_date);

-- RPC 1: Weekly leaderboard — ranked list of users with aggregated scores
CREATE OR REPLACE FUNCTION get_weekly_leaderboard(
  p_game_type TEXT,
  p_week_start DATE,
  p_week_end DATE,
  p_city TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
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
      p.email,
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
    r.email,
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

-- RPC 2: Borough breakdown — aggregated stats per London borough
CREATE OR REPLACE FUNCTION get_borough_breakdown(
  p_game_type TEXT,
  p_week_start DATE,
  p_week_end DATE
)
RETURNS TABLE (
  borough TEXT,
  commuter_count BIGINT,
  leader_email TEXT,
  top_score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_scores AS (
    SELECT
      p.borough AS b,
      l.user_id AS uid,
      p.email AS uemail,
      SUM(l.score) AS total_score
    FROM leaderboard l
    JOIN profiles p ON p.id = l.user_id
    WHERE l.game_type = p_game_type
      AND l.game_date BETWEEN p_week_start AND p_week_end
      AND p.city = 'London'
      AND p.borough IS NOT NULL
    GROUP BY p.borough, l.user_id, p.email
  ),
  borough_leaders AS (
    SELECT DISTINCT ON (b)
      b,
      uemail,
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
    bl.uemail AS leader_email,
    bl.total_score AS top_score
  FROM borough_counts bc
  JOIN borough_leaders bl ON bl.b = bc.b
  ORDER BY bc.b;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;

-- RPC 3: Available cities — distinct cities with player counts for filter tabs
CREATE OR REPLACE FUNCTION get_available_cities(
  p_game_type TEXT,
  p_week_start DATE,
  p_week_end DATE
)
RETURNS TABLE (
  city TEXT,
  player_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.city,
    COUNT(DISTINCT l.user_id) AS player_count
  FROM leaderboard l
  JOIN profiles p ON p.id = l.user_id
  WHERE l.game_type = p_game_type
    AND l.game_date BETWEEN p_week_start AND p_week_end
    AND p.city IS NOT NULL
  GROUP BY p.city
  ORDER BY player_count DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public;
