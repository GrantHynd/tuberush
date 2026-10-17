-- TUB-234: Lock premium/subscription columns on profiles to server-side writes.
-- Only the service role (validate-iap) and postgres-owned SECURITY DEFINER
-- functions (handle_new_user) may set is_premium, expires_at or
-- apple_original_transaction_id. Clients may still edit their own city/borough/username.

-- Clean up the trigger-only approach from the earlier draft of this PR, if it was applied anywhere.
DROP TRIGGER IF EXISTS prevent_is_premium_update_trigger ON public.profiles;
DROP TRIGGER IF EXISTS prevent_is_premium_insert_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_is_premium_update();
DROP FUNCTION IF EXISTS public.prevent_is_premium_insert();

-- 1. Column privileges (primary control, enforced by Postgres before RLS/triggers).
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT INSERT (id, email, city, borough, username) ON public.profiles TO authenticated;
GRANT UPDATE (city, borough, username) ON public.profiles TO authenticated;

-- 2. Trigger (defence in depth, in case a broad GRANT is re-added later). Fails closed:
--    only allow-listed server roles may change premium columns.
CREATE OR REPLACE FUNCTION public.protect_premium_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_premium IS TRUE
       OR NEW.expires_at IS NOT NULL
       OR NEW.apple_original_transaction_id IS NOT NULL THEN
      RAISE EXCEPTION 'premium columns can only be set server-side'
        USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.is_premium IS DISTINCT FROM OLD.is_premium
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.apple_original_transaction_id IS DISTINCT FROM OLD.apple_original_transaction_id THEN
    RAISE EXCEPTION 'premium columns can only be changed server-side'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_premium_columns ON public.profiles;
CREATE TRIGGER protect_premium_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_premium_columns();
