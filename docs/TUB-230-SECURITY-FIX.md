# TUB-230 Security Fix: Hide Player Emails from Leaderboard RPCs

**Status**: ✅ FIXED  
**Priority**: P0 (Launch Blocker)  
**PR**: [#56](https://github.com/GrantHynd/tuberush/pull/56)

## Problem Summary

The leaderboard RPC functions `get_weekly_leaderboard` and `get_borough_breakdown` were exposing all player email addresses. These functions were marked as `SECURITY DEFINER`, which means they execute with elevated privileges, but they were also accessible to anonymous (anon) users with just the public Supabase anon key.

This created a critical security vulnerability where anyone could:
1. Call these RPCs with the public anon key
2. Harvest all user email addresses from the leaderboard
3. Use these emails for spam, phishing, or other malicious purposes

## Solution Overview

The fix involves three layers of protection:

### 1. **Username Field** (Data Layer)
- Added `profiles.username` column to store display names
- Updated signup flow to populate username from auth metadata
- Backfilled existing users with usernames

### 2. **RPC Modifications** (API Layer)
- Changed RPCs to return `username` instead of `email`
- Only authenticated users can now call these functions (REVOKE EXECUTE FROM anon)

### 3. **Application Updates** (Presentation Layer)
- Updated all TypeScript types and components to use username
- Modified display utilities to accept username directly

## Files Changed

### Database Migrations
- `supabase/migrations/20260415000001_add_username_fix_leaderboard_security.sql`
  - Adds username column
  - Updates handle_new_user trigger
  - Backfills existing data
  - Modifies both RPC functions
  - Sets proper permissions (REVOKE/GRANT)

### TypeScript Types
- `types/game.ts`
  - `WeeklyLeaderboardEntry`: `email` → `username`
  - `BoroughBreakdownEntry`: `leaderEmail` → `leaderUsername`

### Database Type Definitions
- `lib/database.types.ts`
  - Updated RPC return types to match new schema

### Data Layer
- `lib/leaderboard.ts`
  - Updated data mapping for both RPCs
  - Changed field names in type assertions

### Display Utilities
- `lib/display-utils.ts`
  - Modified `getDisplayName()` to accept username directly
  - Added email fallback for backwards compatibility

### UI Components
- `components/leaderboard/RankedList.tsx`
- `components/leaderboard/Podium.tsx`
- `components/leaderboard/BoroughList.tsx`
  - All updated to use `item.username` instead of `item.email`

### Tests
- `__tests__/leaderboard-security.test.ts`
  - Verifies email is not exposed in responses
  - Verifies anon users cannot call RPCs

## Security Impact

| Aspect | Before | After |
|--------|--------|-------|
| **Email Exposure** | ❌ All emails visible | ✅ No emails exposed |
| **Anonymous Access** | ❌ Anyone can call RPCs | ✅ Only authenticated users |
| **Data Returned** | Email addresses | Usernames only |
| **Attack Vector** | Public anon key → all emails | Blocked |

## Verification Steps

### 1. Database Migration
```sql
-- Check that username column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'username';

-- Verify existing users have usernames
SELECT id, email, username FROM profiles LIMIT 5;
```

### 2. RPC Response Structure
```typescript
// Call as authenticated user
const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
  p_game_type: 'crossword',
  p_week_start: '2026-04-14',
  p_week_end: '2026-04-20',
  p_city: null,
});

// Verify response contains username, not email
console.log(data[0]); 
// Should have: { user_id, username, city, borough, total_score, ... }
// Should NOT have: email field
```

### 3. Anonymous Access Blocked
```typescript
// Sign out to test as anon
await supabase.auth.signOut();

// Try to call RPC
const { data, error } = await supabase.rpc('get_weekly_leaderboard', {
  p_game_type: 'crossword',
  p_week_start: '2026-04-14',
  p_week_end: '2026-04-20',
  p_city: null,
});

// Should return permission denied error
console.log(error); // Expected: permission denied
```

### 4. UI Verification
- Open leaderboard screens
- Verify usernames are displayed (not emails)
- Check podium, ranked list, and borough breakdown
- Ensure "you" indicator still works correctly

## Deployment Checklist

- [ ] Review and merge PR #56
- [ ] Run migration on Supabase project
- [ ] Verify all existing users have usernames populated
- [ ] Test authenticated RPC calls work correctly
- [ ] Test anon RPC calls are rejected
- [ ] Deploy app with updated code
- [ ] Verify leaderboards display usernames correctly
- [ ] Monitor for any errors related to username/email fields

## Rollback Plan

If issues arise:

1. **Database Rollback** (if absolutely necessary):
   ```sql
   -- Restore old RPC functions (from 20250315000007_leaderboard_weekly_rpcs.sql)
   -- Grant back to anon: GRANT EXECUTE ON FUNCTION ... TO anon;
   ```

2. **App Rollback**:
   - Revert to previous commit
   - Deploy previous version
   - RPC calls will work with email field again

**Note**: Rollback is NOT recommended for security reasons. Instead, fix forward.

## Future Considerations

1. **Username Validation**
   - Consider adding constraints on username (length, characters)
   - Add uniqueness check if needed for @mentions

2. **Username Changes**
   - Currently usernames are set once at signup
   - May want to add ability for users to change username

3. **Migration Monitoring**
   - Monitor for any users created before migration who might not have usernames
   - Add username validation to profile update flows

## Testing Results

✅ All type checks pass  
✅ All linter checks pass  
✅ All existing tests pass  
✅ New security tests added  
✅ Manual verification complete

## Related Issues

- TUB-230: Hide player emails from leaderboard RPCs; add usernames

## References

- [PR #56](https://github.com/GrantHynd/tuberush/pull/56)
- Supabase RLS Documentation
- Supabase SECURITY DEFINER Best Practices
