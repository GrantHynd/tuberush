-- Migration: Add RPC to get connections play count per puzzle date
-- Returns count of distinct users who completed (won or lost) a connections puzzle on that date

CREATE OR REPLACE FUNCTION get_connections_play_count(puzzle_date TEXT)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM game_states
  WHERE game_type = 'connections'
  AND id LIKE 'connections_%_' || puzzle_date
  AND (state->>'status' = 'won' OR state->>'status' = 'lost');
$$;

-- Batch version: single round-trip for multiple dates, returns JSONB { "date": count }
CREATE OR REPLACE FUNCTION get_connections_play_counts(puzzle_dates TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  d TEXT;
  cnt INTEGER;
BEGIN
  FOREACH d IN ARRAY puzzle_dates
  LOOP
    SELECT COALESCE(COUNT(*)::INTEGER, 0) INTO cnt
    FROM game_states
    WHERE game_type = 'connections'
    AND id LIKE 'connections_%_' || d
    AND (state->>'status' = 'won' OR state->>'status' = 'lost');
    result := result || jsonb_build_object(d, cnt);
  END LOOP;
  RETURN result;
END;
$$;
