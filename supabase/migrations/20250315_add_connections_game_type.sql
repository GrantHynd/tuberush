-- Migration: Add 'connections' to game_states game_type check constraint
-- The app uses 'connections' for the Connections game but the DB only allowed 'tictactoe' and 'crossword'

ALTER TABLE game_states DROP CONSTRAINT IF EXISTS game_states_game_type_check;
ALTER TABLE game_states ADD CONSTRAINT game_states_game_type_check
  CHECK (game_type IN ('connections', 'crossword', 'tictactoe'));
