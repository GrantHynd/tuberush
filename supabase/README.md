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
2. Copy contents of `supabase/schema.sql`
3. Paste and run the SQL

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

### 5. Deploy Edge Function (Optional - for Stripe)
1. Login to Supabase CLI:
   ```bash
   supabase login
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Deploy the webhook function:
   ```bash
   supabase functions deploy stripe-webhook
   ```

4. Set secrets:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key
   supabase secrets set STRIPE_WEBHOOK_SECRET=your_webhook_secret
   ```

### 6. Configure Stripe Webhook (Optional)
1. In Stripe Dashboard, go to Developers → Webhooks
2. Add endpoint URL: `https://your-project-ref.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - checkout.session.completed
   - customer.subscription.updated
   - customer.subscription.deleted

## Testing
After setup, test by:
1. Running the app
2. Creating an account
3. Playing a game
4. Checking Supabase dashboard to see data

## Notes
- RLS (Row Level Security) is enabled - users can only access their own data
- Profiles are automatically created on signup
- Game states are automatically synced when online
