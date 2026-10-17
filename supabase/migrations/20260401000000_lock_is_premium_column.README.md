# Lock is_premium Column Security

**Migration**: `20260401000000_lock_is_premium_column.sql`

## Purpose

This migration prevents authenticated users from modifying the `is_premium` field in the `profiles` table, closing a security vulnerability where users could grant themselves premium access for free.

## What It Does

1. **Blocks UPDATE operations**: Authenticated users cannot change `is_premium` from `false` to `true` (or vice versa)
2. **Blocks INSERT operations**: Authenticated users cannot create profiles with `is_premium = true`
3. **Service role still works**: Backend webhooks and purchase verification can still update `is_premium`
4. **Other fields work**: Users can still update all other profile fields (email, city, borough, etc.)

## Implementation

The migration uses PostgreSQL triggers to enforce column-level security:

- `prevent_is_premium_update_trigger`: Blocks UPDATE attempts on `is_premium` from authenticated users
- `prevent_is_premium_insert_trigger`: Blocks INSERT attempts with `is_premium = true` from authenticated users

Both triggers allow the `service_role` to bypass these restrictions, ensuring backend purchase verification can still grant premium access.

## Testing

### Automated Tests

Run the integration test suite:

```bash
# Set up test environment variables
export TEST_SUPABASE_URL="your-test-supabase-url"
export TEST_SUPABASE_ANON_KEY="your-test-anon-key"
export TEST_SUPABASE_SERVICE_KEY="your-test-service-key"

# Run the security test
npm test is-premium-security.test.ts
```

### Manual Testing in Supabase SQL Editor

1. **Test authenticated user cannot update is_premium:**

```sql
-- Set session to authenticated user (replace with real user ID)
SET request.jwt.claims = '{"role":"authenticated","sub":"user-id-here"}';
SET role TO authenticated;

-- This should FAIL with "Cannot modify is_premium field"
UPDATE profiles 
SET is_premium = true 
WHERE id = 'user-id-here';

-- This should SUCCEED
UPDATE profiles 
SET email = 'newemail@example.com' 
WHERE id = 'user-id-here';
```

2. **Test service role can update is_premium:**

```sql
-- Set session to service role
RESET role;
SET role TO service_role;

-- This should SUCCEED
UPDATE profiles 
SET is_premium = true 
WHERE id = 'user-id-here';

-- Verify
SELECT id, email, is_premium FROM profiles WHERE id = 'user-id-here';
```

## Deployment

1. Apply this migration to your Supabase project:
   - Via Supabase CLI: `supabase db push`
   - Via Supabase Dashboard: Copy migration SQL and run in SQL Editor

2. Verify with the manual tests above

3. Deploy your application code that relies on this security

## Rollback

If you need to rollback this migration (NOT recommended for production):

```sql
-- Remove the triggers
DROP TRIGGER IF EXISTS prevent_is_premium_update_trigger ON profiles;
DROP TRIGGER IF EXISTS prevent_is_premium_insert_trigger ON profiles;

-- Remove the trigger functions
DROP FUNCTION IF EXISTS prevent_is_premium_update();
DROP FUNCTION IF EXISTS prevent_is_premium_insert();
```

## Related Files

- Migration: `supabase/migrations/20260401000000_lock_is_premium_column.sql`
- Test: `__tests__/is-premium-security.test.ts`
- Linear Issue: TUB-234
