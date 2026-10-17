-- Migration: Lock is_premium column to service role only
-- Prevents authenticated users from setting is_premium = true

-- Create a trigger function that prevents authenticated users from modifying is_premium
CREATE OR REPLACE FUNCTION prevent_is_premium_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service role to modify is_premium
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For authenticated users, preserve the old is_premium value
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated' THEN
    IF OLD.is_premium IS DISTINCT FROM NEW.is_premium THEN
      RAISE EXCEPTION 'Cannot modify is_premium field'
        USING HINT = 'Only service role can update premium status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger to the profiles table
DROP TRIGGER IF EXISTS prevent_is_premium_update_trigger ON profiles;
CREATE TRIGGER prevent_is_premium_update_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_is_premium_update();

-- Also prevent INSERT with is_premium = true from authenticated users
CREATE OR REPLACE FUNCTION prevent_is_premium_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service role to insert with any is_premium value
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For authenticated users, force is_premium to false on insert
  IF current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated' THEN
    IF NEW.is_premium = true THEN
      RAISE EXCEPTION 'Cannot set is_premium to true on insert'
        USING HINT = 'Only service role can set premium status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the insert trigger to the profiles table
DROP TRIGGER IF EXISTS prevent_is_premium_insert_trigger ON profiles;
CREATE TRIGGER prevent_is_premium_insert_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_is_premium_insert();
