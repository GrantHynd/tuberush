# Deployment Guide: is_premium Security Fix (TUB-234)

## Quick Start

This security fix is ready to deploy. Follow these steps to safely roll out the changes.

## Step 1: Test Environment Deployment (Required)

### Apply Migration to Test Database

1. **Via Supabase Dashboard**:
   - Go to your test/staging Supabase project
   - Navigate to SQL Editor
   - Copy contents of `supabase/migrations/20260401000000_lock_is_premium_column.sql`
   - Execute the migration

2. **Via Supabase CLI** (if you have it set up):
   ```bash
   supabase db push
   ```

### Verify Migration Success

Run the SQL test script:

1. Open Supabase SQL Editor
2. Copy contents of `supabase/test_is_premium_security.sql`
3. Execute
4. Verify all tests pass with "PASSED" messages

### Test IAP Flow (Critical)

1. Make a test purchase on iOS
2. Verify the `validate-iap` edge function successfully grants premium access
3. Check the `profiles` table to confirm `is_premium = true` for the test user

**Expected Result**: IAP verification should work normally because it uses service role.

## Step 2: Production Deployment

### Apply Migration to Production

⚠️ **Before applying to production**:
- Ensure test environment tests passed
- Ensure IAP flow works in test environment
- Have rollback plan ready (see below)

1. **Via Supabase Dashboard**:
   - Go to production Supabase project
   - Navigate to SQL Editor
   - Copy contents of `supabase/migrations/20260401000000_lock_is_premium_column.sql`
   - Execute the migration

2. **Via Supabase CLI**:
   ```bash
   supabase db push --production
   ```

### Post-Deployment Verification

1. **Test User Profile Updates**:
   - Have a test user update their city/borough
   - Verify it works normally

2. **Test IAP Purchase**:
   - Make a test purchase
   - Verify premium access is granted

3. **Monitor Logs**:
   - Check Supabase logs for any errors
   - Check Sentry for any client-side errors
   - Monitor IAP webhook logs

## Step 3: Application Code Deployment

**Good News**: No application code changes needed!

The client code never writes to `is_premium`, so the app can continue running with the current version. However, it's good practice to deploy the PR to ensure the test suite is available for future reference.

## Rollback Plan

If something goes wrong, you can rollback the migration:

```sql
-- Remove the triggers
DROP TRIGGER IF EXISTS prevent_is_premium_update_trigger ON profiles;
DROP TRIGGER IF EXISTS prevent_is_premium_insert_trigger ON profiles;

-- Remove the trigger functions
DROP FUNCTION IF EXISTS prevent_is_premium_update();
DROP FUNCTION IF EXISTS prevent_is_premium_insert();
```

⚠️ **Warning**: Rollback removes security protection. Only rollback temporarily to diagnose issues.

## Common Issues & Solutions

### Issue: IAP verification fails after migration

**Symptom**: Users can't unlock premium after purchase

**Diagnosis**:
```sql
-- Check if validate-iap edge function has correct service role key
SELECT * FROM profiles WHERE id = '<failing-user-id>';
-- Check is_premium value
```

**Solution**: 
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correctly set in edge function environment
- Check edge function logs for errors

### Issue: Profile updates fail

**Symptom**: Users can't update city/borough

**Diagnosis**: Check if client code is accidentally trying to update `is_premium`

**Solution**:
- Review `stores/auth-store.ts` `updateProfile()` function
- Ensure `is_premium` is not in `dbUpdates` object

## Success Criteria

✅ All SQL tests pass  
✅ IAP purchase flow works  
✅ User profile updates work  
✅ No errors in logs  
✅ Security vulnerability is closed

## Timeline

- **Testing**: 30-60 minutes (includes test purchase)
- **Production deployment**: 5 minutes
- **Monitoring**: 24 hours post-deployment

## Support

If you encounter issues:

1. Check `SECURITY_FIX_TUB-234.md` for technical details
2. Review `supabase/migrations/20260401000000_lock_is_premium_column.README.md`
3. Run `supabase/test_is_premium_security.sql` to diagnose
4. Check Supabase logs and Sentry for errors

## Verification Checklist

After deployment, verify:

- [ ] SQL test script passes
- [ ] Test user can update profile (city/borough)
- [ ] Test user CANNOT update is_premium (should fail)
- [ ] IAP purchase grants premium access
- [ ] validate-iap edge function works
- [ ] No errors in Supabase logs
- [ ] No errors in Sentry
- [ ] Security vulnerability is resolved

## Post-Deployment

Once deployed successfully:

- [ ] Update Linear issue TUB-234 status to "Done"
- [ ] Document deployment date and any learnings
- [ ] Archive test credentials securely
- [ ] Consider adding this to your security audit checklist
