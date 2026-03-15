import {
  CONNECTIONS_PUZZLE_COUNT,
  getRecentPuzzlesWithOffset as getConnectionsWithOffset,
} from "@/constants/ConnectionsData";
import {
  CROSSWORD_PUZZLE_COUNT,
  getRecentPuzzlesWithOffset as getCrosswordWithOffset,
} from "@/constants/CrosswordData";
import { supabase } from "@/lib/supabase-client";
import type { ConnectionsState, CrosswordState } from "@/types/game";
import type { GameHistoryConfig } from "@/types/game-history";

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

async function getConnectionsPlayCounts(dates: string[]): Promise<number[]> {
  if (dates.length === 0) return [];
  try {
    const { data, error } = await supabase.rpc("get_connections_play_counts", {
      puzzle_dates: dates,
    });
    if (!error && data && typeof data === "object") {
      return dates.map((d) =>
        typeof (data as Record<string, number>)[d] === "number"
          ? (data as Record<string, number>)[d]
          : 0,
      );
    }
    const results = await Promise.all(
      dates.map((date) =>
        supabase.rpc("get_connections_play_count", { puzzle_date: date }),
      ),
    );
    return results.map(({ data: d, error: e }) =>
      e || typeof d !== "number" ? 0 : d,
    );
  } catch {
    return dates.map(() => 0);
  }
}

export const connectionsGameHistoryConfig: GameHistoryConfig = {
  gameType: "connections",
  totalPuzzleCount: CONNECTIONS_PUZZLE_COUNT,
  getPuzzlesWithOffset: getConnectionsWithOffset,
  getGameId: (userId, puzzle) => `connections_${userId}_${puzzle.date}`,
  getPuzzleDate: (puzzle) => puzzle.date,
  parseState: (game) => {
    const state = game?.state as ConnectionsState | undefined;
    const isCompleted = state?.status === "won" || state?.status === "lost";
    const isWon = state?.status === "won";
    let completionTime: string | undefined;
    let score: string | undefined;
    if (isCompleted && state?.startTime && state?.endTime) {
      const duration = Math.floor((state.endTime - state.startTime) / 1000);
      completionTime = formatTime(duration);
      score = `${state.mistakesRemaining}/4`;
    }
    return { isCompleted, isWon, completionTime, score };
  },
  getPlayCounts: getConnectionsPlayCounts,
  hasWinLoss: true,
  showScore: true,
};

async function getCrosswordPlayCounts(puzzleIds: string[]): Promise<number[]> {
  if (puzzleIds.length === 0) return [];
  try {
    const { data, error } = await supabase.rpc("get_crossword_play_counts", {
      puzzle_ids: puzzleIds,
    });
    if (!error && data && typeof data === "object") {
      return puzzleIds.map((id) =>
        typeof (data as Record<string, number>)[id] === "number"
          ? (data as Record<string, number>)[id]
          : 0,
      );
    }
    const results = await Promise.all(
      puzzleIds.map((id) =>
        supabase.rpc("get_crossword_play_count", { puzzle_id: id }),
      ),
    );
    return results.map(({ data: d, error: e }) =>
      e || typeof d !== "number" ? 0 : d,
    );
  } catch {
    return puzzleIds.map(() => 0);
  }
}

export const crosswordGameHistoryConfig: GameHistoryConfig = {
  gameType: "crossword",
  totalPuzzleCount: CROSSWORD_PUZZLE_COUNT,
  getPuzzlesWithOffset: getCrosswordWithOffset,
  getGameId: (userId, puzzle) => `crossword_${userId}_${puzzle.id}`,
  getPuzzleDate: (puzzle) => puzzle.date,
  getPlayCountIdentifier: (puzzle) => puzzle.id,
  getPlayCounts: getCrosswordPlayCounts,
  parseState: (game) => {
    const state = game?.state as CrosswordState | undefined;
    const isCompleted = state?.completed === true;
    let completionTime: string | undefined;
    if (isCompleted && state?.startTime != null && state?.endTime != null) {
      const duration = Math.floor((state.endTime - state.startTime) / 1000);
      completionTime = formatTime(duration);
    }
    return { isCompleted, isWon: isCompleted, completionTime };
  },
  hasWinLoss: false,
  showScore: false,
};
