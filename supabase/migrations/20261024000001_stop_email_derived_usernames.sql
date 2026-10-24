-- TUB-268: Stop deriving public usernames from email addresses.
-- NOT YET APPLIED. Review before running against prod.
--
-- 20260415000001 backfilled profiles.username with SPLIT_PART(email,'@',1) and
-- handle_new_user() still falls back to it, so get_weekly_leaderboard /
-- get_borough_breakdown publish part of the user's email.

-- 1. New signups: only use an explicit username; otherwise leave NULL
--    (the app shows "Commuter NNNN").
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), '')
  );
  RETURN NEW;
END;
$$;

-- 2. Clear usernames that are just the email local part (backfilled values),
--    unless the user explicitly chose that same string in auth metadata.
UPDATE public.profiles p
SET username = NULL
WHERE p.username IS NOT NULL
  AND LOWER(p.username) = LOWER(SPLIT_PART(p.email, '@', 1))
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = p.id
      AND LOWER(u.raw_user_meta_data->>'username') = LOWER(p.username)
  );
