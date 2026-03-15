# TubeRush - Supabase Setup Guide

## Prerequisites
- Supabase account (https://supabase.com)
- Supabase CLI installed (`npm install -g supabase`)

## Setup Steps

### 1. Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details and create

### 2. Run Database Schema
1. Go to SQL Editor in Supabase Dashboard
2. Run migrations in order:
   - `supabase/schema.sql` (base schema)
   - `supabase/migrations/update_schema.sql` (borough, leaderboard)
   - `supabase/migrations/20250314_apple_iap_schema.sql` (Apple IAP)
   - `supabase/migrations/20250315_drop_subscription_fields.sql` (if applicable)
   - `supabase/migrations/20250315_add_connections_game_type.sql` (if applicable)
   - `supabase/migrations/20250315_city_borough_location.sql` (city/town support)

### 3. Get API Keys
1. In Supabase Dashboard, go to Settings → API
2. Copy the Project URL and anon/public key
3. Create a `.env` file in project root:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_project_url
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   ```

### 4. Configure Auth Redirect URLs (Email Confirmation & Password Reset)
1. In Supabase Dashboard, go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add:
   - `tuberushv2://**` (catches all auth callbacks for the app scheme)
3. The app uses the `tuberushv2` scheme (configured in `app.config.ts`). When users tap email confirmation or password reset links, they will be redirected back into the app.

### 5. Deploy Edge Functions (Optional)
1. Login to Supabase CLI:
   ```bash
   supabase login
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Deploy the validate-iap function (for Apple IAP receipt validation):
   ```bash
   supabase functions deploy validate-iap
   ```

4. Deploy the e2e-test-helper (for E2E testing only):
   ```bash
   supabase functions deploy e2e-test-helper
   ```

## Testing
After setup, test by:
1. Running the app
2. Creating an account
3. Playing a game
4. Checking Supabase dashboard to see data

## Troubleshooting

**"Failed to update location" when changing City/Town:** The `profiles` table needs a `city` column. Run `supabase/migrations/20250315_city_borough_location_profiles_only.sql` in the Supabase SQL Editor. Or run the full migration: `supabase/migrations/20250315_city_borough_location.sql`.

## Notes
- RLS (Row Level Security) is enabled - users can only access their own data
- Profiles are automatically created on signup
- Game states are automatically synced when online

## Migrating from Stripe

If you previously used Stripe, see [SUPABASE_STRIPE_CLEANUP.md](../docs/SUPABASE_STRIPE_CLEANUP.md) for steps to remove deployed functions and secrets.
