-- Migration: Add RPC to get crossword play count per puzzle
-- Returns count of users who completed a crossword puzzle

CREATE OR REPLACE FUNCTION get_crossword_play_count(puzzle_id TEXT)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM game_states
  WHERE game_type = 'crossword'
  AND id LIKE 'crossword_%_' || puzzle_id
  AND (state->>'completed')::boolean = true;
$$;

-- Batch version: single round-trip for multiple puzzle IDs
CREATE OR REPLACE FUNCTION get_crossword_play_counts(puzzle_ids TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB := '{}'::JSONB;
  pid TEXT;
  cnt INTEGER;
BEGIN
  FOREACH pid IN ARRAY puzzle_ids
  LOOP
    SELECT COALESCE(COUNT(*)::INTEGER, 0) INTO cnt
    FROM game_states
    WHERE game_type = 'crossword'
    AND id LIKE 'crossword_%_' || pid
    AND (state->>'completed')::boolean = true;
    result := result || jsonb_build_object(pid, cnt);
  END LOOP;
  RETURN result;
END;
$$;
