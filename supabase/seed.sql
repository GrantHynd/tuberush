-- ============================================================
-- TubeRush Leaderboard Seed Data
-- 50 test users across UK cities, scores for current week.
-- Run in Supabase SQL Editor to populate a test environment.
--
-- Prerequisites: all migrations applied (schema.sql through
-- 20250315_leaderboard_weekly_rpcs.sql).
--
-- To reset: run the cleanup block at the bottom first.
-- ============================================================

-- ----------------------------------------------------------
-- Cleanup: Remove any existing seed data before reinserting
-- (makes the script idempotent / safe to re-run)
-- ----------------------------------------------------------
DELETE FROM leaderboard
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@tuberush.test'
);
DELETE FROM profiles
WHERE id IN (
  SELECT id FROM auth.users WHERE email LIKE '%@tuberush.test'
);
DELETE FROM auth.users
WHERE email LIKE '%@tuberush.test';

BEGIN;

-- ----------------------------------------------------------
-- 1. Temp table to hold seed user definitions
-- ----------------------------------------------------------
CREATE TEMP TABLE _seed_users (
  idx   SERIAL,
  id    UUID DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  city  TEXT,
  borough TEXT,
  is_premium BOOLEAN DEFAULT FALSE
);

INSERT INTO _seed_users (email, city, borough, is_premium) VALUES
  -- London (10 users, various boroughs) --------------------------
  ('tube.master@tuberush.test',    'London', 'Camden',                  TRUE),
  ('northern.liner@tuberush.test', 'London', 'Islington',              FALSE),
  ('district.dash@tuberush.test',  'London', 'Hammersmith and Fulham', TRUE),
  ('victoria.sprint@tuberush.test','London', 'Westminster',            TRUE),
  ('bakerloo.boss@tuberush.test',  'London', 'Lambeth',               FALSE),
  ('jubilee.jet@tuberush.test',    'London', 'Tower Hamlets',          TRUE),
  ('central.champ@tuberush.test',  'London', 'Hackney',               FALSE),
  ('circle.star@tuberush.test',    'London', 'Southwark',             TRUE),
  ('piccadilly.pro@tuberush.test', 'London', 'Kensington and Chelsea', TRUE),
  ('elizabeth.ace@tuberush.test',  'London', 'Newham',                FALSE),
  -- Manchester (5) -----------------------------------------------
  ('manc.runner@tuberush.test',    'Manchester', NULL, TRUE),
  ('bee.city@tuberush.test',       'Manchester', NULL, FALSE),
  ('old.trafford@tuberush.test',   'Manchester', NULL, TRUE),
  ('deansgate.pro@tuberush.test',  'Manchester', NULL, FALSE),
  ('northern.quarter@tuberush.test','Manchester', NULL, FALSE),
  -- Edinburgh (5) ------------------------------------------------
  ('royal.mile@tuberush.test',     'Edinburgh', NULL, TRUE),
  ('castle.rock@tuberush.test',    'Edinburgh', NULL, FALSE),
  ('arthur.seat@tuberush.test',    'Edinburgh', NULL, TRUE),
  ('leith.walker@tuberush.test',   'Edinburgh', NULL, FALSE),
  ('fringe.fan@tuberush.test',     'Edinburgh', NULL, FALSE),
  -- Birmingham (4) -----------------------------------------------
  ('bull.ring@tuberush.test',      'Birmingham', NULL, TRUE),
  ('brum.racer@tuberush.test',     'Birmingham', NULL, FALSE),
  ('canal.side@tuberush.test',     'Birmingham', NULL, TRUE),
  ('jewellery.q@tuberush.test',    'Birmingham', NULL, FALSE),
  -- Bristol (4) ---------------------------------------------------
  ('clifton.bridge@tuberush.test', 'Bristol', NULL, TRUE),
  ('harbour.dash@tuberush.test',   'Bristol', NULL, FALSE),
  ('balloon.fest@tuberush.test',   'Bristol', NULL, TRUE),
  ('temple.meads@tuberush.test',   'Bristol', NULL, FALSE),
  -- Leeds (4) -----------------------------------------------------
  ('headingley.hero@tuberush.test','Leeds', NULL, TRUE),
  ('kirkgate.kid@tuberush.test',   'Leeds', NULL, FALSE),
  ('roundhay.run@tuberush.test',   'Leeds', NULL, FALSE),
  ('corn.exchange@tuberush.test',  'Leeds', NULL, TRUE),
  -- Glasgow (3) ---------------------------------------------------
  ('clyde.side@tuberush.test',     'Glasgow', NULL, TRUE),
  ('buchanan.st@tuberush.test',    'Glasgow', NULL, FALSE),
  ('kelvin.grove@tuberush.test',   'Glasgow', NULL, TRUE),
  -- Liverpool (3) -------------------------------------------------
  ('mersey.beat@tuberush.test',    'Liverpool', NULL, TRUE),
  ('anfield.ace@tuberush.test',    'Liverpool', NULL, FALSE),
  ('albert.dock@tuberush.test',    'Liverpool', NULL, FALSE),
  -- Cardiff (3) ---------------------------------------------------
  ('castle.quarter@tuberush.test', 'Cardiff', NULL, TRUE),
  ('bay.runner@tuberush.test',     'Cardiff', NULL, FALSE),
  ('millennium.dash@tuberush.test','Cardiff', NULL, FALSE),
  -- Sheffield (3) -------------------------------------------------
  ('steel.city@tuberush.test',     'Sheffield', NULL, TRUE),
  ('peak.district@tuberush.test',  'Sheffield', NULL, FALSE),
  ('crucible.pro@tuberush.test',   'Sheffield', NULL, FALSE),
  -- Other cities (6) ---------------------------------------------
  ('tyne.bridge@tuberush.test',    'Newcastle upon Tyne', NULL, TRUE),
  ('lace.market@tuberush.test',    'Nottingham',          NULL, FALSE),
  ('lanes.walker@tuberush.test',   'Brighton',            NULL, TRUE),
  ('spires.dash@tuberush.test',    'Oxford',              NULL, FALSE),
  ('cam.punter@tuberush.test',     'Cambridge',           NULL, TRUE),
  ('titanic.q@tuberush.test',      'Belfast',             NULL, FALSE);

-- ----------------------------------------------------------
-- 2. Insert auth.users (triggers automatic profile creation)
-- ----------------------------------------------------------
INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
SELECT
  s.id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  s.email,
  crypt('testpass123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
  '{}'::jsonb
FROM _seed_users s
ON CONFLICT DO NOTHING;

-- Small pause for trigger to fire (profiles auto-created)
-- Then update profiles with location + premium status
UPDATE profiles p
SET
  city       = s.city,
  borough    = s.borough,
  is_premium = s.is_premium
FROM _seed_users s
WHERE p.id = s.id;

-- ----------------------------------------------------------
-- 3. Generate leaderboard scores for the current week
--    Week containing today (Mon–Sun). Each user gets 3–7
--    daily entries per game type they have access to.
-- ----------------------------------------------------------

-- Helper: current week bounds
CREATE TEMP TABLE _week AS
SELECT
  date_trunc('week', CURRENT_DATE)::date AS week_start,
  (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::date AS week_end;

-- Connections scores — all 50 users, 3-7 days each
-- Score = time in seconds (lower = better), range 35–280s
INSERT INTO leaderboard (user_id, city, borough, score, game_date, game_type)
SELECT
  s.id,
  s.city,
  s.borough,
  -- Deterministic but varied score: base + per-day jitter
  35 + ((s.idx * 7 + d) % 246),
  w.week_start + d,
  'connections'
FROM _seed_users s
CROSS JOIN _week w
CROSS JOIN generate_series(0, 6) AS d
-- Each user plays 3-7 days: keep day if (idx + d) mod 8 < 5..7
WHERE (s.idx + d) % 8 < (3 + (s.idx % 5))
  AND w.week_start + d <= w.week_end
ON CONFLICT (user_id, game_date, game_type)
DO UPDATE SET score = LEAST(leaderboard.score, EXCLUDED.score);

-- Crossword scores — only premium users, 2-5 days each
-- Score = time in seconds, range 120–780s (crosswords take longer)
INSERT INTO leaderboard (user_id, city, borough, score, game_date, game_type)
SELECT
  s.id,
  s.city,
  s.borough,
  120 + ((s.idx * 11 + d * 3) % 661),
  w.week_start + d,
  'crossword'
FROM _seed_users s
CROSS JOIN _week w
CROSS JOIN generate_series(0, 6) AS d
WHERE s.is_premium = TRUE
  AND (s.idx + d) % 7 < (2 + (s.idx % 4))
  AND w.week_start + d <= w.week_end
ON CONFLICT (user_id, game_date, game_type)
DO UPDATE SET score = LEAST(leaderboard.score, EXCLUDED.score);

-- ----------------------------------------------------------
-- 4. Verify counts
-- ----------------------------------------------------------
DO $$
DECLARE
  user_count   INT;
  conn_count   INT;
  cross_count  INT;
  city_count   INT;
  london_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count  FROM _seed_users;
  SELECT COUNT(*) INTO conn_count  FROM leaderboard WHERE game_type = 'connections'
    AND game_date >= (SELECT week_start FROM _week);
  SELECT COUNT(*) INTO cross_count FROM leaderboard WHERE game_type = 'crossword'
    AND game_date >= (SELECT week_start FROM _week);
  SELECT COUNT(DISTINCT city) INTO city_count FROM _seed_users;
  SELECT COUNT(*) INTO london_count FROM _seed_users WHERE city = 'London';

  RAISE NOTICE '=== Seed Summary ===';
  RAISE NOTICE 'Users created:           %', user_count;
  RAISE NOTICE 'Connections scores:      %', conn_count;
  RAISE NOTICE 'Crossword scores:        %', cross_count;
  RAISE NOTICE 'Distinct cities:         %', city_count;
  RAISE NOTICE 'London users:            %', london_count;
END $$;

DROP TABLE _seed_users;
DROP TABLE _week;

COMMIT;


