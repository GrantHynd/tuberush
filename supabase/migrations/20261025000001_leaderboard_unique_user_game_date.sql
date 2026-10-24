-- Offline sync (audit risks 1, 2, 12): make leaderboard writes idempotent per user + game + puzzle date.
-- NOT APPLIED. Needs a manual deploy by Grant. The app works without it (read-then-write path);
-- once present, a concurrent duplicate insert fails with 23505 and the client retries as an update.

-- 1. Collapse existing duplicates, keeping the best row (win over loss, then lowest score, then oldest).
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, game_type, game_date
           ORDER BY (COALESCE(result, 'won') = 'won') DESC, score ASC, created_at ASC NULLS LAST, id
         ) AS rn
  FROM leaderboard
)
DELETE FROM leaderboard l USING ranked r WHERE l.id = r.id AND r.rn > 1;

-- 2. Enforce one row per user/game/date.
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_user_game_date_key
  ON leaderboard (user_id, game_type, game_date);
