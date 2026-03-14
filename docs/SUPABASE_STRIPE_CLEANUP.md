# Supabase Stripe Cleanup

If you previously deployed Stripe-related resources to Supabase, remove them manually:

## 1. Delete Stripe Edge Functions (if deployed)

In Supabase Dashboard → Edge Functions, delete:
- `stripe-webhook`
- `create-payment-sheet`

Or via CLI:
```bash
supabase functions delete stripe-webhook
supabase functions delete create-payment-sheet
```

## 2. Remove Stripe Secrets

In Supabase Dashboard → Project Settings → Edge Functions → Secrets, remove:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Or via CLI:
```bash
supabase secrets unset STRIPE_SECRET_KEY
supabase secrets unset STRIPE_WEBHOOK_SECRET
```

## 3. Remove Stripe Webhook (Stripe Dashboard)

If you configured a webhook in Stripe Dashboard pointing to your Supabase project:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Delete the endpoint that points to `https://your-project.supabase.co/functions/v1/stripe-webhook`

## 4. Database Migration

If your database still has `stripe_customer_id` on profiles or a `subscriptions` table, run the migration:
```sql
-- Run in Supabase SQL Editor
ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_customer_id;
DROP TABLE IF EXISTS subscriptions;
```
