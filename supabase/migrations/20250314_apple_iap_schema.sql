-- Migration: Apple IAP / RevenueCat schema

-- 1. Add subscription columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT;

-- 2. Remove legacy payment column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_customer_id;

-- 3. Drop legacy subscriptions table (subscription state now in profiles)
DROP TABLE IF EXISTS subscriptions;
