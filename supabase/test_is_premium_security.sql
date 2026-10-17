-- Test script for is_premium column security
-- Run this in Supabase SQL Editor after applying the lock_is_premium migration
-- This script creates a test user, verifies security, then cleans up

-- Create a test user profile
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Clean up if exists
  DELETE FROM profiles WHERE id = test_user_id;
  
  -- Insert test profile
  INSERT INTO profiles (id, email, is_premium)
  VALUES (test_user_id, 'test@example.com', false);
  
  RAISE NOTICE 'Test user created with id: %', test_user_id;
END $$;

-- Test 1: Authenticated user cannot update is_premium to true
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  test_passed BOOLEAN := false;
BEGIN
  -- Simulate authenticated user session
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || test_user_id || '"}', false);
  PERFORM set_config('role', 'authenticated', false);
  
  -- Try to update is_premium (should fail)
  BEGIN
    UPDATE profiles SET is_premium = true WHERE id = test_user_id;
    RAISE EXCEPTION 'TEST FAILED: Authenticated user was able to update is_premium';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Cannot modify is_premium field%' THEN
        test_passed := true;
        RAISE NOTICE 'Test 1 PASSED: Authenticated user blocked from updating is_premium';
      ELSE
        RAISE EXCEPTION 'TEST FAILED: Wrong error message: %', SQLERRM;
      END IF;
  END;
  
  -- Reset role
  RESET role;
END $$;

-- Test 2: Authenticated user CAN update other fields
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  updated_email TEXT;
BEGIN
  -- Simulate authenticated user session
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || test_user_id || '"}', false);
  PERFORM set_config('role', 'authenticated', false);
  
  -- Update email (should succeed)
  UPDATE profiles SET email = 'updated@example.com' WHERE id = test_user_id;
  
  -- Verify update worked
  SELECT email INTO updated_email FROM profiles WHERE id = test_user_id;
  
  IF updated_email = 'updated@example.com' THEN
    RAISE NOTICE 'Test 2 PASSED: Authenticated user can update other fields';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: Email was not updated';
  END IF;
  
  -- Reset role
  RESET role;
END $$;

-- Test 3: Service role CAN update is_premium
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  current_is_premium BOOLEAN;
BEGIN
  -- Reset to service role (default)
  RESET role;
  
  -- Update is_premium to true (should succeed)
  UPDATE profiles SET is_premium = true WHERE id = test_user_id;
  
  -- Verify update worked
  SELECT is_premium INTO current_is_premium FROM profiles WHERE id = test_user_id;
  
  IF current_is_premium = true THEN
    RAISE NOTICE 'Test 3 PASSED: Service role can update is_premium to true';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: is_premium was not updated to true';
  END IF;
  
  -- Update back to false (should also succeed)
  UPDATE profiles SET is_premium = false WHERE id = test_user_id;
  
  SELECT is_premium INTO current_is_premium FROM profiles WHERE id = test_user_id;
  
  IF current_is_premium = false THEN
    RAISE NOTICE 'Test 3 PASSED: Service role can update is_premium to false';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: is_premium was not updated to false';
  END IF;
END $$;

-- Test 4: Authenticated user cannot set is_premium back to false
DO $$
DECLARE
  test_user_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- First set is_premium to true as service role
  RESET role;
  UPDATE profiles SET is_premium = true WHERE id = test_user_id;
  
  -- Now try to set it back to false as authenticated user
  PERFORM set_config('request.jwt.claims', '{"role":"authenticated","sub":"' || test_user_id || '"}', false);
  PERFORM set_config('role', 'authenticated', false);
  
  BEGIN
    UPDATE profiles SET is_premium = false WHERE id = test_user_id;
    RAISE EXCEPTION 'TEST FAILED: Authenticated user was able to change is_premium from true to false';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Cannot modify is_premium field%' THEN
        RAISE NOTICE 'Test 4 PASSED: Authenticated user blocked from changing is_premium';
      ELSE
        RAISE EXCEPTION 'TEST FAILED: Wrong error message: %', SQLERRM;
      END IF;
  END;
  
  RESET role;
END $$;

-- Clean up test data
DO $$
BEGIN
  DELETE FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;
  RAISE NOTICE 'Test cleanup complete';
END $$;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All tests completed successfully!';
  RAISE NOTICE 'is_premium column is properly secured.';
  RAISE NOTICE '========================================';
END $$;
