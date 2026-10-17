-- TUB-234 manual check. Run in the Supabase SQL Editor AFTER applying
-- 20261017000000_lock_is_premium_column.sql. Runs in a transaction and rolls back,
-- so it changes nothing. Expect "ALL CHECKS PASSED" in the output / notices.
BEGIN;

DO $$
DECLARE
  uid uuid;
  ok boolean;
BEGIN
  SELECT id INTO uid FROM public.profiles LIMIT 1;
  IF uid IS NULL THEN RAISE EXCEPTION 'Need at least one profile row to test against'; END IF;

  -- Act as that signed-in user.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  -- 1. Allowed field still updates.
  UPDATE public.profiles SET city = city WHERE id = uid;

  -- 2. is_premium is rejected.
  ok := false;
  BEGIN
    UPDATE public.profiles SET is_premium = true WHERE id = uid;
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL: authenticated could update is_premium'; END IF;

  -- 3. expires_at is rejected.
  ok := false;
  BEGIN
    UPDATE public.profiles SET expires_at = now() + interval '1 year' WHERE id = uid;
  EXCEPTION WHEN insufficient_privilege THEN ok := true;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'FAIL: authenticated could update expires_at'; END IF;

  RESET ROLE;

  -- 4. Service role can still write it.
  SET LOCAL ROLE service_role;
  UPDATE public.profiles SET is_premium = is_premium WHERE id = uid;
  RESET ROLE;

  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;

ROLLBACK;
