-- Daily games table for automated game scheduling
-- Stores puzzle data for both connections and crossword game types

CREATE TABLE IF NOT EXISTS daily_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_type TEXT NOT NULL CHECK (game_type IN ('connections', 'crossword')),
    game_date DATE NOT NULL,
    puzzle_data JSONB NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (game_type, game_date)
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_daily_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_games_updated_at
    BEFORE UPDATE ON daily_games
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_games_updated_at();

-- Sequences for stable, incrementing puzzle IDs
-- Connections: continues from 247 (current hardcoded max)
CREATE SEQUENCE IF NOT EXISTS connections_puzzle_id_seq START WITH 248;
-- Crossword: continues from 2 (current hardcoded max)
CREATE SEQUENCE IF NOT EXISTS crossword_puzzle_id_seq START WITH 3;

-- Enable RLS
ALTER TABLE daily_games ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read published games up to 7 days in the future
CREATE POLICY "Authenticated users can read published upcoming games"
    ON daily_games
    FOR SELECT
    TO authenticated
    USING (
        is_published = true
        AND game_date <= CURRENT_DATE + INTERVAL '7 days'
    );

-- Service role has full access (for the edge function)
CREATE POLICY "Service role has full access to daily_games"
    ON daily_games
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Helper function to get next sequence value (callable from edge functions via RPC)
CREATE OR REPLACE FUNCTION nextval_text(seq_name TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT nextval(seq_name)::TEXT;
$$;

-- Index for common query patterns
CREATE INDEX idx_daily_games_type_date ON daily_games (game_type, game_date);
CREATE INDEX idx_daily_games_published ON daily_games (is_published, game_date) WHERE is_published = true;
