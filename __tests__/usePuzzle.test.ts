import { renderHook, waitFor } from '@testing-library/react-native';
import { usePuzzle } from '@/hooks/usePuzzle';
import type { CrosswordPuzzle } from '@/types/game';

const mockDaily: CrosswordPuzzle = {
  id: 'daily-1',
  date: '2026-03-14',
  title: 'Daily Puzzle',
  rows: 5,
  cols: 5,
  grid: [],
  clues: { across: [], down: [] },
};

const mockSpecific: CrosswordPuzzle = {
  id: 'specific-1',
  date: '2026-03-13',
  title: 'Specific Puzzle',
  rows: 5,
  cols: 5,
  grid: [],
  clues: { across: [], down: [] },
};

jest.mock('@/lib/daily-games', () => ({
  getDailyGame: jest.fn(),
  getCrosswordByPuzzleId: jest.fn(),
}));

import { getCrosswordByPuzzleId, getDailyGame } from '@/lib/daily-games';

describe('usePuzzle hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDailyGame as jest.Mock).mockResolvedValue(mockDaily);
    (getCrosswordByPuzzleId as jest.Mock).mockImplementation(async (id: string) => {
      if (id === 'specific-1') return { game_date: '2026-03-13', puzzle_data: mockSpecific };
      return undefined;
    });
  });

  it('starts loading then returns daily puzzle from DB layer', async () => {
    // Hold the DB call open so the initial loading state is observable
    // (RNTL v14's async renderHook flushes already-resolved promises).
    let resolveDaily!: (p: CrosswordPuzzle) => void;
    (getDailyGame as jest.Mock).mockReturnValue(
      new Promise<CrosswordPuzzle>((resolve) => {
        resolveDaily = resolve;
      }),
    );

    const { result } = await renderHook(() => usePuzzle());

    expect(result.current.loading).toBe(true);
    expect(result.current.puzzle).toBeNull();

    resolveDaily(mockDaily);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(getDailyGame).toHaveBeenCalledWith('crossword');
    expect(result.current.puzzle?.id).toBe('daily-1');
    expect(result.current.puzzle?.title).toBe('Daily Puzzle');
  });

  it('returns a specific puzzle when puzzleId matches DB', async () => {
    const { result } = await renderHook(() => usePuzzle('specific-1'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(getCrosswordByPuzzleId).toHaveBeenCalledWith('specific-1');
    expect(result.current.puzzle?.id).toBe('specific-1');
  });

  it('returns null when puzzleId is not found', async () => {
    const { result } = await renderHook(() => usePuzzle('non-existent'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.puzzle).toBeNull();
  });

  it('recomputes when puzzleId changes', async () => {
    const { result, rerender } = await renderHook<
      { puzzle: CrosswordPuzzle | null; gameDate: string | null; loading: boolean },
      { id: string | undefined }
    >(
      ({ id }) => usePuzzle(id),
      { initialProps: { id: undefined as string | undefined } },
    );

    await waitFor(() => {
      expect(result.current.puzzle?.id).toBe('daily-1');
    });

    await rerender({ id: 'specific-1' });

    await waitFor(() => {
      expect(result.current.puzzle?.id).toBe('specific-1');
    });
  });
});
