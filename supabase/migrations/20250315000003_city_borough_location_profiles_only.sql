-- Minimal migration: Add city column to profiles only
-- Run this in Supabase SQL Editor if "Failed to update location" occurs.
-- This enables the City/Town selector in Settings.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;

-- Migrate existing borough-only data: borough → city='London', borough=value
UPDATE profiles
SET city = 'London'
WHERE borough IS NOT NULL AND (city IS NULL OR city = '');
