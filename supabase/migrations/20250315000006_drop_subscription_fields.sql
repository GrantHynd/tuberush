-- Migration: Remove subscription_id and subscription_status (RevenueCat manages subscription state)

ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_id;
ALTER TABLE profiles DROP COLUMN IF EXISTS subscription_status;
