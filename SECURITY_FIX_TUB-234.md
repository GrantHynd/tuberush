# Security Fix: Lock is_premium Column (TUB-234)

## Summary

This fix prevents authenticated users from granting themselves premium access by directly updating the `is_premium` field in their profile. The fix uses PostgreSQL triggers to enforce column-level security while preserving the ability for backend services to grant premium access through Apple IAP verification.

## Changes Made

### 1. Database Migration
**File**: `supabase/migrations/20260401000000_lock_is_premium_column.sql`

- Created `prevent_is_premium_update()` trigger function that blocks UPDATE operations on `is_premium` from authenticated users
- Created `prevent_is_premium_insert()` trigger function that blocks INSERT operations with `is_premium = true` from authenticated users
- Both triggers allow the `service_role` to bypass restrictions
- Both triggers are applied BEFORE the operation, ensuring security at the database level

### 2. Integration Tests
**File**: `__tests__/is-premium-security.test.ts`

Comprehensive test suite that verifies:
- ✅ Authenticated users cannot update `is_premium` to `true`
- ✅ Authenticated users can update other profile fields (email, city, borough)
- ✅ Authenticated users cannot set `is_premium = true` on profile creation
- ✅ Service role can update `is_premium` to both `true` and `false`
- ✅ Authenticated users cannot change `is_premium` from `true` back to `false`

**To run**: Set up test environment variables and run `npm test is-premium-security.test.ts`

### 3. Manual SQL Test
**File**: `supabase/test_is_premium_security.sql`

Self-contained SQL script that can be run in Supabase SQL Editor to verify:
- Creates a test user
- Runs all security tests
- Cleans up test data
- Reports pass/fail for each test

**To run**: Copy the entire script into Supabase SQL Editor and execute

### 4. Documentation
**File**: `supabase/migrations/20260401000000_lock_is_premium_column.README.md`

Complete documentation including:
- Purpose and implementation details
- Automated and manual testing instructions
- Deployment steps
- Rollback procedure (if needed)

### 5. Environment Configuration
**File**: `.env.example`

Added optional test environment variables:
- `TEST_SUPABASE_URL`
- `TEST_SUPABASE_ANON_KEY`
- `TEST_SUPABASE_SERVICE_KEY`

## Verification of Existing Code

### Client Code ✅
**File**: `stores/auth-store.ts`

The `updateProfile()` function only updates `city` and `borough` fields. It never attempts to write `is_premium`, so client code is unaffected by this security fix.

### Backend Edge Functions ✅

1. **validate-iap** (IAP purchase verification)
   - Uses `SUPABASE_SERVICE_ROLE_KEY` to create admin client
   - Can successfully update `is_premium` after verifying Apple IAP receipts
   - No changes needed

2. **e2e-test-helper** (E2E testing)
   - Uses `SUPABASE_SERVICE_ROLE_KEY` to promote test users to premium
   - Can successfully update `is_premium` for test scenarios
   - No changes needed

## Security Impact

### Before
- Any authenticated user could execute:
  ```sql
  UPDATE profiles SET is_premium = true WHERE id = auth.uid();
  ```
- This would grant free premium access

### After
- The same query will fail with error: `Cannot modify is_premium field`
- Only service role (backend webhooks/verification) can update `is_premium`
- Other profile fields remain fully updatable by users

## Deployment Checklist

- [ ] Apply migration to staging/test Supabase project
- [ ] Run `supabase/test_is_premium_security.sql` in SQL Editor
- [ ] Optionally run integration tests with test credentials
- [ ] Verify IAP purchase flow still works (validate-iap edge function)
- [ ] Apply migration to production Supabase project
- [ ] Monitor logs for any unexpected errors

## Linear Issue

Resolves: [TUB-234](https://linear.app/tuberush/issue/TUB-234)

## Related Files

- Migration: `supabase/migrations/20260401000000_lock_is_premium_column.sql`
- Integration Test: `__tests__/is-premium-security.test.ts`
- SQL Test: `supabase/test_is_premium_security.sql`
- Documentation: `supabase/migrations/20260401000000_lock_is_premium_column.README.md`
- Summary: `SECURITY_FIX_TUB-234.md` (this file)
