# TUB-230 Security Fix - Verification Guide

This guide helps you verify that the security fix is working correctly after deployment.

## Quick Verification Checklist

Use this checklist to verify the fix is working:

- [ ] Migration applied successfully
- [ ] All users have usernames
- [ ] RPCs return username (not email)
- [ ] Anon users are blocked
- [ ] UI shows usernames
- [ ] Tests pass

## Detailed Verification Steps

### 1. Database Verification

#### Check Username Column Exists
```sql
-- Should return the username column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name = 'username';

-- Expected result:
-- column_name | data_type | is_nullable
-- username    | text      | YES
```

#### Verify Users Have Usernames
```sql
-- Check a sample of users
SELECT id, email, username
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- All users should have a username
-- Username should NOT be an email address
```

#### Verify Handle New User Trigger
```sql
-- Check the trigger exists
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- The function should include username population logic
```

### 2. RPC Function Verification

#### Test get_weekly_leaderboard as Authenticated User
```typescript
// In your app or test environment
import { supabase } from '@/lib/supabase-client';

// Ensure you're authenticated
const { data: { user } } = await supabase.auth.getUser();
console.log('Testing as user:', user?.email);

// Call the RPC
const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
  p_game_type: 'crossword',
  p_week_start: '2026-04-14',
  p_week_end: '2026-04-20',
  p_city: null,
});

// Verify response structure
if (data && data.length > 0) {
  const entry = data[0];
  
  console.log('✅ Has username:', !!entry.username);
  console.log('✅ No email:', !entry.email);
  console.log('Sample entry:', {
    user_id: entry.user_id,
    username: entry.username,
    city: entry.city,
    borough: entry.borough,
    total_score: entry.total_score,
  });
  
  // Assertions
  if (!entry.username) {
    console.error('❌ FAIL: username is missing!');
  }
  if (entry.email) {
    console.error('❌ FAIL: email is still present!');
  }
  if (entry.username.includes('@')) {
    console.warn('⚠️  WARNING: username looks like an email');
  }
}
```

#### Test get_borough_breakdown as Authenticated User
```typescript
const { data, error } = await supabase.rpc('get_borough_breakdown', {
  p_game_type: 'crossword',
  p_week_start: '2026-04-14',
  p_week_end: '2026-04-20',
});

if (data && data.length > 0) {
  const entry = data[0];
  
  console.log('✅ Has leader_username:', !!entry.leader_username);
  console.log('✅ No leader_email:', !entry.leader_email);
  console.log('Sample borough entry:', {
    borough: entry.borough,
    commuter_count: entry.commuter_count,
    leader_username: entry.leader_username,
    top_score: entry.top_score,
  });
}
```

#### Test Anonymous Access is Blocked
```typescript
// Sign out to test as anonymous user
await supabase.auth.signOut();

// Try to call the RPC
const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
  p_game_type: 'crossword',
  p_week_start: '2026-04-14',
  p_week_end: '2026-04-20',
  p_city: null,
});

// Should get an error
if (error) {
  console.log('✅ Anonymous access blocked:', error.message);
  // Expected error: permission denied or similar
} else {
  console.error('❌ FAIL: Anonymous access was NOT blocked!');
}
```

### 3. UI Verification

#### Leaderboard Screen
1. Navigate to the leaderboard screen in the app
2. Check the weekly leaderboard list
3. Verify:
   - Display names are shown (not emails)
   - Names look like usernames (not "firstname.lastname" from email)
   - Your own entry shows "you" badge correctly

#### Podium (Top 3)
1. View the podium section
2. Verify:
   - Top 3 players show usernames
   - No email addresses visible
   - Names are properly formatted

#### Borough Breakdown
1. View London boroughs section
2. Verify:
   - Leader names are usernames (not emails)
   - "Leader: [username]" text is displayed correctly

### 4. Permission Verification

#### Check Function Permissions
```sql
-- Check who can execute get_weekly_leaderboard
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_weekly_leaderboard';

-- Should show:
-- routine_name              | grantee        | privilege_type
-- get_weekly_leaderboard    | authenticated  | EXECUTE
-- get_weekly_leaderboard    | postgres       | EXECUTE
-- (anon should NOT be listed)

-- Check who can execute get_borough_breakdown
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_borough_breakdown';

-- Should show:
-- routine_name           | grantee        | privilege_type
-- get_borough_breakdown  | authenticated  | EXECUTE
-- get_borough_breakdown  | postgres       | EXECUTE
-- (anon should NOT be listed)
```

### 5. Test User Signup Flow

1. Create a new test account with a username
2. Verify the profile is created with the username
3. Submit a game score
4. Check that the new user appears in leaderboards with their username

```typescript
// Test signup
const { data, error } = await supabase.auth.signUp({
  email: 'testuser@example.com',
  password: 'securepassword123',
  options: {
    data: {
      username: 'TestPlayer123'
    }
  }
});

// Check profile was created with username
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', 'testuser@example.com')
  .single();

console.log('✅ Profile created with username:', profile?.username);
```

### 6. Automated Tests

Run the test suite:

```bash
npm test
```

Specific security tests:
```bash
npm test -- __tests__/leaderboard-security.test.ts
```

Expected output:
- ✅ should not return email addresses in response
- ✅ should reject calls from anon users
- ✅ should return leader_username instead of leader_email

## Common Issues and Solutions

### Issue: Users have email-like usernames

**Symptom**: Usernames look like "john.doe" or "firstname.lastname"

**Cause**: Backfill used email prefix for users without username in auth metadata

**Solution**: This is expected for existing users. New signups will have proper usernames.

**Optional Fix**: Prompt users to set a custom username in settings

---

### Issue: Some users have NULL username

**Symptom**: `username IS NULL` for some users

**Cause**: Backfill didn't run or failed for some users

**Solution**: Run manual backfill:
```sql
UPDATE profiles
SET username = COALESCE(
  (SELECT raw_user_meta_data->>'username' 
   FROM auth.users 
   WHERE id = profiles.id),
  SPLIT_PART(email, '@', 1)
)
WHERE username IS NULL;
```

---

### Issue: Anon users can still call RPCs

**Symptom**: Anonymous requests succeed

**Cause**: REVOKE didn't apply correctly

**Solution**: Re-run the REVOKE commands:
```sql
REVOKE EXECUTE ON FUNCTION get_weekly_leaderboard(TEXT, DATE, DATE, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION get_borough_breakdown(TEXT, DATE, DATE) FROM anon;
```

---

### Issue: UI shows "Anonymous" for all users

**Symptom**: All names show as "Anonymous"

**Cause**: Frontend not receiving username field

**Solution**: 
1. Check RPC response in network tab
2. Verify TypeScript types match
3. Check component is using `item.username` not `item.email`

## Success Criteria

The fix is working correctly when:

✅ All users in the database have a username  
✅ RPC responses contain `username`, NOT `email`  
✅ Anonymous calls to RPCs are rejected with permission error  
✅ Leaderboard UI shows usernames throughout  
✅ All tests pass  
✅ No email addresses visible in any leaderboard view  

## Security Audit

After verification, confirm:

1. **Email Exposure**: ❌ No emails exposed in any public API
2. **Authentication Required**: ✅ Only authenticated users can view leaderboards
3. **Data Minimization**: ✅ Only necessary data (username) is returned
4. **Backward Compatibility**: ✅ Existing functionality preserved

## Rollback Procedure

If critical issues are found:

1. **DO NOT** rollback the migration (data loss risk)
2. Instead, apply hotfix migration:
   - Temporarily grant anon access
   - Add email field back to RPC response
3. Fix issues in a new PR
4. Re-apply security restrictions

**NOTE**: Rollback is NOT recommended. Fix issues forward.

## Support

If you encounter issues not covered in this guide:

1. Check PR #56 for discussion
2. Review `docs/TUB-230-SECURITY-FIX.md`
3. Check migration file comments
4. Contact the team

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-15  
**Related**: TUB-230, PR #56
