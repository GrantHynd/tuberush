-- Rename daily_games -> games and reset for a fresh start

-- 1. Drop existing policies, triggers, and indexes (they reference the old name)
DROP POLICY IF EXISTS "Authenticated users can read published upcoming games" ON daily_games;
DROP POLICY IF EXISTS "Service role has full access to daily_games" ON daily_games;
DROP TRIGGER IF EXISTS daily_games_updated_at ON daily_games;
DROP INDEX IF EXISTS idx_daily_games_type_date;
DROP INDEX IF EXISTS idx_daily_games_published;

-- 2. Rename the table
ALTER TABLE daily_games RENAME TO games;

-- 3. Truncate all existing data (fresh start)
TRUNCATE games;

-- 4. Reset sequences to start from 1
ALTER SEQUENCE connections_puzzle_id_seq RESTART WITH 1;
ALTER SEQUENCE crossword_puzzle_id_seq RESTART WITH 1;

-- 5. Rename the trigger function and recreate trigger
DROP FUNCTION IF EXISTS update_daily_games_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_games_updated_at();

-- 6. Recreate RLS policies on the renamed table
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read published upcoming games"
    ON games
    FOR SELECT
    TO authenticated
    USING (
        is_published = true
        AND game_date <= CURRENT_DATE + INTERVAL '7 days'
    );

CREATE POLICY "Service role has full access to games"
    ON games
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 7. Recreate indexes with new names
CREATE INDEX idx_games_type_date ON games (game_type, game_date);
CREATE INDEX idx_games_published ON games (is_published, game_date) WHERE is_published = true;
