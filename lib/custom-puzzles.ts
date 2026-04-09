import type { ConnectionsPuzzle } from '@/constants/ConnectionsData';
import type { CrosswordPuzzle } from '@/types/game';
import { supabase } from './supabase-client';

export interface CustomPuzzleRow {
  id: string;
  user_id: string;
  game_type: 'connections' | 'crossword';
  puzzle_data: ConnectionsPuzzle | CrosswordPuzzle;
  score: number | null;
  completed_at: string | null;
  created_at: string;
}

/**
 * Fetch a custom puzzle by its ID.
 */
export async function getCustomPuzzle(
  customPuzzleId: string,
): Promise<CustomPuzzleRow | null> {
  const { data, error } = await supabase
    .from('custom_puzzles')
    .select('*')
    .eq('id', customPuzzleId)
    .single();

  if (error || !data) return null;
  return data as unknown as CustomPuzzleRow;
}

/**
 * Save score and completed_at to a custom puzzle.
 * Only updates if no score exists yet or the new score is better (lower).
 */
export async function saveCustomPuzzleScore(
  customPuzzleId: string,
  score: number,
): Promise<void> {
  const { data: existing } = await supabase
    .from('custom_puzzles')
    .select('score')
    .eq('id', customPuzzleId)
    .single();

  if (existing?.score != null && score >= existing.score) {
    return; // existing score is already better
  }

  const { error } = await supabase
    .from('custom_puzzles')
    .update({
      score,
      completed_at: new Date().toISOString(),
    })
    .eq('id', customPuzzleId);

  if (error) throw error;
}
