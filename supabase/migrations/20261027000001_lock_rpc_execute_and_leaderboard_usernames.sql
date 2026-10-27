-- Lock SECURITY DEFINER RPCs and let the daily leaderboard read other players' usernames.
-- NOT YET APPLIED. Grant runs this once on prod. Do not edit earlier migrations.
--
-- Daily scores already load from leaderboard, then embed profiles(username).
-- profiles SELECT is auth.uid() = id, so every other player's username comes back null.
-- A wider SELECT policy would expose profiles.email (RLS is per row, and the app
-- loads its own profile with select *). This adds a column-limited security-definer
-- read instead: id and username only, and only for users who already have a score.

-- 1. nextval_text: empty search_path, two puzzle sequences, service_role only.
-- Lambdas call this with the service role key and an unqualified sequence name.
CREATE OR REPLACE FUNCTION public.nextval_text(seq_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  CASE seq_name
    WHEN 'connections_puzzle_id_seq' THEN
      RETURN pg_catalog.nextval('public.connections_puzzle_id_seq'::pg_catalog.regclass)::TEXT;
    WHEN 'crossword_puzzle_id_seq' THEN
      RETURN pg_catalog.nextval('public.crossword_puzzle_id_seq'::pg_catalog.regclass)::TEXT;
    ELSE
      RAISE EXCEPTION 'sequence not allowed' USING ERRCODE = '42501';
  END CASE;
  RETURN NULL;
END;
$$;

-- 2. Play-count RPCs: empty search_path. Bodies are unchanged apart from schema qualification.
CREATE OR REPLACE FUNCTION public.get_connections_play_count(puzzle_date TEXT)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pg_catalog.coalesce(pg_catalog.count(*)::INTEGER, 0)
  FROM public.game_states
  WHERE game_type = 'connections'
  AND id LIKE 'connections_%_' || puzzle_date
  AND (state->>'status' = 'won' OR state->>'status' = 'lost');
$$;

CREATE OR REPLACE FUNCTION public.get_connections_play_counts(puzzle_dates TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB := '{}'::pg_catalog.jsonb;
  d TEXT;
  cnt INTEGER;
BEGIN
  FOREACH d IN ARRAY puzzle_dates
  LOOP
    SELECT pg_catalog.coalesce(pg_catalog.count(*)::INTEGER, 0) INTO cnt
    FROM public.game_states
    WHERE game_type = 'connections'
    AND id LIKE 'connections_%_' || d
    AND (state->>'status' = 'won' OR state->>'status' = 'lost');
    result := result || pg_catalog.jsonb_build_object(d, cnt);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_crossword_play_count(puzzle_id TEXT)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pg_catalog.coalesce(pg_catalog.count(*)::INTEGER, 0)
  FROM public.game_states
  WHERE game_type = 'crossword'
  AND id LIKE 'crossword_%_' || puzzle_id
  AND (state->>'completed')::boolean = true;
$$;

CREATE OR REPLACE FUNCTION public.get_crossword_play_counts(puzzle_ids TEXT[])
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSONB := '{}'::pg_catalog.jsonb;
  pid TEXT;
  cnt INTEGER;
BEGIN
  FOREACH pid IN ARRAY puzzle_ids
  LOOP
    SELECT pg_catalog.coalesce(pg_catalog.count(*)::INTEGER, 0) INTO cnt
    FROM public.game_states
    WHERE game_type = 'crossword'
    AND id LIKE 'crossword_%_' || pid
    AND (state->>'completed')::boolean = true;
    result := result || pg_catalog.jsonb_build_object(pid, cnt);
  END LOOP;
  RETURN result;
END;
$$;

-- 3. Usernames for the daily board. Column-limited: id and username, never other profile columns.
-- Restricted to users who already appear on leaderboard (those ids are already readable there).
CREATE OR REPLACE FUNCTION public.get_profile_usernames(p_ids UUID[])
RETURNS TABLE (id UUID, username TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.username
  FROM public.profiles p
  WHERE p.id = ANY (p_ids)
    AND EXISTS (
      SELECT 1
      FROM public.leaderboard l
      WHERE l.user_id = p.id
    );
$$;

-- 4. Lock EXECUTE the same way as 20260415000001.
-- New and replaced functions inherit EXECUTE for PUBLIC, which includes anon.
-- Revoking only FROM anon leaves the PUBLIC grant in place.
REVOKE ALL ON FUNCTION nextval_text(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION nextval_text(TEXT) FROM anon;
REVOKE ALL ON FUNCTION nextval_text(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION nextval_text(TEXT) TO service_role;

REVOKE ALL ON FUNCTION get_connections_play_count(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_connections_play_count(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION get_connections_play_count(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION get_connections_play_counts(TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_connections_play_counts(TEXT[]) FROM anon;
GRANT EXECUTE ON FUNCTION get_connections_play_counts(TEXT[]) TO authenticated;

REVOKE ALL ON FUNCTION get_crossword_play_count(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_crossword_play_count(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION get_crossword_play_count(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION get_crossword_play_counts(TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_crossword_play_counts(TEXT[]) FROM anon;
GRANT EXECUTE ON FUNCTION get_crossword_play_counts(TEXT[]) TO authenticated;

REVOKE ALL ON FUNCTION get_profile_usernames(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_profile_usernames(UUID[]) FROM anon;
GRANT EXECUTE ON FUNCTION get_profile_usernames(UUID[]) TO authenticated;

-- 5. 20261017154551 granted INSERT, UPDATE on profiles to anon and authenticated.
-- Anon must not write profiles. Authenticated keeps the grant; RLS still requires auth.uid() = id.
REVOKE INSERT, UPDATE ON TABLE public.profiles FROM anon;
