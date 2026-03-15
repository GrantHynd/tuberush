-- Migration: City/Town + Borough location model
-- Expands London-only borough to support UK cities with optional borough for London.

-- 1. Add city to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;

-- 2. Migrate existing profiles: borough value → city='London', borough=value
UPDATE profiles
SET city = 'London'
WHERE borough IS NOT NULL AND city IS NULL;

-- 3. Add city to leaderboard
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS city TEXT;

-- 4. Migrate leaderboard: existing borough in London boroughs list → city='London'; else → city=borough, borough=null
-- London boroughs (from constants/Boroughs.ts)
UPDATE leaderboard
SET city = 'London'
WHERE borough IN (
  'Barking and Dagenham', 'Barnet', 'Bexley', 'Brent', 'Bromley', 'Camden',
  'City of London', 'Croydon', 'Ealing', 'Enfield', 'Greenwich', 'Hackney',
  'Hammersmith and Fulham', 'Haringey', 'Harrow', 'Havering', 'Hillingdon',
  'Hounslow', 'Islington', 'Kensington and Chelsea', 'Kingston upon Thames',
  'Lambeth', 'Lewisham', 'Merton', 'Newham', 'Redbridge', 'Richmond upon Thames',
  'Southwark', 'Sutton', 'Tower Hamlets', 'Waltham Forest', 'Wandsworth', 'Westminster'
)
AND city IS NULL;

-- For any remaining rows (edge case: borough was set to non-London value)
UPDATE leaderboard
SET city = COALESCE(borough, 'London')
WHERE city IS NULL;

-- 5. Make leaderboard borough nullable (for non-London entries)
ALTER TABLE leaderboard ALTER COLUMN borough DROP NOT NULL;

-- 6. Drop old index and create new one for city-based queries
DROP INDEX IF EXISTS idx_leaderboard_query;
CREATE INDEX IF NOT EXISTS idx_leaderboard_query ON leaderboard(game_date, game_type, city);
CREATE INDEX IF NOT EXISTS idx_leaderboard_city_borough ON leaderboard(game_date, game_type, city, borough);
