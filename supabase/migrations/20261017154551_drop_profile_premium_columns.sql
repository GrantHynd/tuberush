-- TUB-244: RevenueCat is the only source of truth for premium.
-- Drop stale profiles columns and any TUB-234 draft locks. Staging had those
-- objects applied; prod did not. Every step is safe to run in either state.

-- 1. Remove premium-column guards from either TUB-234 draft, if present.
DROP TRIGGER IF EXISTS prevent_is_premium_update_trigger ON public.profiles;
DROP TRIGGER IF EXISTS prevent_is_premium_insert_trigger ON public.profiles;
DROP TRIGGER IF EXISTS protect_premium_columns ON public.profiles;

DROP FUNCTION IF EXISTS public.prevent_is_premium_update();
DROP FUNCTION IF EXISTS public.prevent_is_premium_insert();
DROP FUNCTION IF EXISTS public.protect_premium_columns();

-- 2. Restore the table-level writes that draft revoked from client roles.
-- Prod already has these. RLS still restricts rows to auth.uid() = id.
GRANT INSERT, UPDATE ON TABLE public.profiles TO anon, authenticated;

-- 3. New signups must not insert is_premium once that column is gone.
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
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- 4. Drop the unused columns. The stored values are stale and this cannot be undone.
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS is_premium,
  DROP COLUMN IF EXISTS expires_at,
  DROP COLUMN IF EXISTS apple_original_transaction_id;
