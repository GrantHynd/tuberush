-- Migration: Add Borough and Leaderboard

-- 1. Add Borough to Profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS borough TEXT;

-- 2. Create Leaderboard Table
CREATE TABLE IF NOT EXISTS leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    borough TEXT NOT NULL,
    score INTEGER NOT NULL, -- Time in seconds
    game_date DATE NOT NULL DEFAULT CURRENT_DATE,
    game_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one score per user per game per day
    UNIQUE(user_id, game_date, game_type)
);

-- Index for querying leaderboard by date/borough/game_type
CREATE INDEX IF NOT EXISTS idx_leaderboard_query ON leaderboard(game_date, game_type, borough);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id);

-- Enable RLS
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view leaderboard"
    ON leaderboard FOR SELECT
    USING (true);

CREATE POLICY "Users can insert their own score"
    ON leaderboard FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own score"
    ON leaderboard FOR UPDATE
    USING (auth.uid() = user_id);
