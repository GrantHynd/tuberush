# TubeRush - Supabase Setup Guide

## Prerequisites
- Supabase account (https://supabase.com)
- Supabase CLI installed (`npm install -g supabase`)

## Setup Steps

### 1. Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details and create

### 2. Build the database

Timestamped files in `supabase/migrations` are the change history. They alter tables created by `supabase/schema.sql` and `supabase/migrations/update_schema.sql`.

The CLI applies only files named `<timestamp>_name.sql`. A fresh `supabase start` skips `update_schema.sql` and does not run `schema.sql`. `20250314000000_apple_iap_schema.sql` then fails with `relation "profiles" does not exist`. Applied after `schema.sql` and without `update_schema.sql`, `20250315000002_city_borough_location.sql` fails with `column "borough" does not exist`. That file also alters `leaderboard`. This repo has no `supabase/config.toml`. `supabase db reset` is documented to apply that same migrations directory, but on CLI 3.0.0 with the native stack already running it returned `LocalDbRunningError`, so that command was not confirmed here.

Apply these in the SQL editor, in order:

1. `supabase/schema.sql`
2. `supabase/migrations/update_schema.sql`
3. Every `supabase/migrations/<timestamp>_*.sql` file, in filename order

That order completed on a local Supabase Postgres 17.11. `schema.sql` still installs `handle_new_user()` with an email-derived username, and `update_schema.sql` still creates a borough-only `leaderboard`. Later files replace that function (`20261024000001_stop_email_derived_usernames.sql`) and add city, a nullable borough, `result`, `mistakes`, and `leaderboard_user_game_date_key`. Stopping after step 2 leaves the old shape. Those two files stay in the repo because deleting them leaves no fresh setup. Turning them into an earlier timestamped migration would rewrite production migration history, which this repo does not do.

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

## Seeding Test Data

`supabase/seed.sql` loads 50 leaderboard users (10 in London with boroughs, 40 across other UK cities) with Connections and Crossword scores for the current week.

`ON CONFLICT (user_id, game_date, game_type)` needs one unique index on those three columns. `leaderboard_user_game_date_key` from `20261025000001_leaderboard_unique_user_game_date.sql` is enough. The `UNIQUE (user_id, game_date, game_type)` constraint in `update_schema.sql` is enough on its own as well. The inserts also need `leaderboard.city` and a nullable `borough`. Run the seed only after the full order in step 2. Running the file again deletes existing `@tuberush.test` users first.

## Testing
After setup, test by:
1. Running the app
2. Creating an account
3. Playing a game
4. Checking Supabase dashboard to see data

## Troubleshooting

**"Failed to update location" when changing City/Town:** The `profiles` table needs a `city` column. Run `supabase/migrations/20250315000003_city_borough_location_profiles_only.sql` in the Supabase SQL Editor. Or run the full migration: `supabase/migrations/20250315000002_city_borough_location.sql`.

## Notes
- RLS (Row Level Security) is enabled - users can only access their own data
- Profiles are automatically created on signup
- Game states are automatically synced when online
