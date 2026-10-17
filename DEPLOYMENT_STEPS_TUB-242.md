# Manual Deployment Steps for TUB-242

## ⚠️ CRITICAL: Function Removal from Production

**These steps must be completed BEFORE merging the PR.**

### 1. Delete function from Production

```bash
# List functions to confirm it exists
supabase functions list --project-ref <prod-project-ref>

# Delete the function
supabase functions delete e2e-test-helper --project-ref <prod-project-ref>

# Verify deletion
supabase functions list --project-ref <prod-project-ref>
```

### 2. Delete function from Staging

```bash
# List functions to confirm it exists
supabase functions list --project-ref <staging-project-ref>

# Delete the function
supabase functions delete e2e-test-helper --project-ref <staging-project-ref>

# Verify deletion
supabase functions list --project-ref <staging-project-ref>
```

### 3. Verify in Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your production project
3. Navigate to Edge Functions
4. Confirm `e2e-test-helper` is not listed
5. Repeat for staging project

## After Merging

### Test Subscribe Flow Manually

1. Build and run the app in development mode:
   ```bash
   npm start
   # Press 'i' for iOS simulator
   ```

2. Create or sign in with a test account

3. Navigate to Crossword Puzzle (premium game)

4. Verify the subscribe screen appears

5. Tap "Subscribe Now" button

6. **Expected**: RevenueCat paywall should appear with subscription options

7. **Expected**: No errors in console related to `e2e-test-helper`

### Run Maestro E2E Tests Locally (Optional)

```bash
# Ensure simulator is running
# Install Maestro if not already installed:
# curl -Ls "https://get.maestro.mobile.dev" | bash

# Run the remaining E2E flows
maestro test .maestro/flow.yaml
maestro test .maestro/auth_flow.yaml
```

## Completion Checklist

- [ ] Production function deleted and verified
- [ ] Staging function deleted and verified
- [ ] PR merged to main
- [ ] Manual test of subscribe flow completed successfully
- [ ] No references to `e2e-test-helper` remain in any deployed environment
- [ ] This file can be deleted after all steps are complete

## Notes

- The CI workflow runs Maestro tests (`flow.yaml` and `auth_flow.yaml`) automatically on push or when the PR has the `e2e-test` label
- The deleted `subscribe_flow.yaml` was not part of the CI workflow
- Premium E2E coverage is intentionally dropped for now; future implementation should use RevenueCat Test Store
