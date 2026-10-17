# TUB-243: Delete validate-iap Edge Function - Deployment Steps

## Summary
The `validate-iap` edge function has been deleted from the codebase. This document outlines the remaining manual deployment steps.

## Changes Made
✅ **Completed:**
- Deleted `supabase/functions/validate-iap/` directory
- Removed references from `README.md` and `supabase/README.md`
- Verified no code references `validate-iap` or `transactionJws`
- Committed changes to branch `cursor/delete-validate-iap-function-134f`

## Remaining Manual Steps

### 1. Check Current Function Deployments

Check which environments have the function deployed:

```bash
# Check current environment (appears to be prod based on secrets)
supabase functions list
```

**Current Status:** ✅ The function is **NOT** deployed in the current environment (only `schedule-daily-games` is deployed).

### 2. Undeploy from Staging (if applicable)

If you have a separate staging environment:

```bash
# Switch to staging project
supabase link --project-ref <staging-project-ref>

# Check if validate-iap is deployed
supabase functions list

# If deployed, delete it
supabase functions delete validate-iap

# Verify deletion
supabase functions list
```

### 3. Check for Unused Secrets

No Apple-specific secrets (like `APPLE_BUNDLE_ID` or `APPLE_ROOT_CERT`) were found in the secrets list. The function was self-contained and verified JWS transactions using certificates embedded in the transaction itself.

**Current secrets:**
- `ANTHROPIC_API_KEY` - Used by `schedule-daily-games` ✅ Keep
- `ANTHROPIC_DAILY_PUZZLE_SKILL_ID` - Used by `schedule-daily-games` ✅ Keep
- `ANTHROPIC_DAILY_PUZZLE_SKILL_VERSION` - Used by `schedule-daily-games` ✅ Keep
- `SUPABASE_*` - Standard Supabase environment secrets ✅ Keep

**No secrets need to be removed.**

### 4. Merge and Deploy

Once the above steps are complete:

```bash
# Merge the PR on GitHub
# Then deploy the updated code
git checkout main
git pull
```

### 5. Verify RevenueCat Integration

Test that premium purchases still work via RevenueCat (the issue's "Done when" criteria):

1. Open the app in a development/sandbox environment
2. Log in or create a test account
3. Attempt a sandbox/test purchase
4. Verify that premium access is granted
5. Check that the purchase is reflected in RevenueCat dashboard

**Expected behavior:** RevenueCat webhooks should update the `is_premium` status in the profiles table, completely independent of the deleted function.

## Verification Checklist

- [ ] Function is absent from `supabase functions list` on prod
- [ ] Function is absent from `supabase functions list` on staging (if applicable)
- [ ] No Apple-specific secrets remain that were only used by this function
- [ ] Sandbox purchase still unlocks premium in the app (RevenueCat path unaffected)
- [ ] Code references to `validate-iap` and `transactionJws` are gone

## Notes

- The function wrote to `subscription_status` and `subscription_id` columns that were dropped in migration `20250315000006`, confirming it was already broken
- RevenueCat is now the single source of truth for premium status
- The function was Apple-only, so Android purchases never used it
