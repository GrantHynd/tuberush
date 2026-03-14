import { renderHook } from '@testing-library/react-native';
import { usePuzzle } from '@/hooks/usePuzzle';
import { getDailyPuzzle, getPuzzleById } from '@/constants/CrosswordData';

jest.mock('@/constants/CrosswordData', () => {
  const dailyPuzzle = {
    id: 'daily-1',
    date: '2026-03-14',
    title: 'Daily Puzzle',
    rows: 5,
    cols: 5,
    grid: [],
    clues: { across: [], down: [] },
  };

  const specificPuzzle = {
    id: 'specific-1',
    date: '2026-03-13',
    title: 'Specific Puzzle',
    rows: 5,
    cols: 5,
    grid: [],
    clues: { across: [], down: [] },
  };

  return {
    getDailyPuzzle: jest.fn(() => dailyPuzzle),
    getPuzzleById: jest.fn((id: string) => {
      if (id === 'specific-1') return specificPuzzle;
      return undefined;
    }),
  };
});

describe('usePuzzle hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the daily puzzle when no puzzleId is provided', () => {
    const { result } = renderHook(() => usePuzzle());

    expect(getDailyPuzzle).toHaveBeenCalled();
    expect(result.current.id).toBe('daily-1');
    expect(result.current.title).toBe('Daily Puzzle');
  });

  it('returns a specific puzzle when puzzleId is provided', () => {
    const { result } = renderHook(() => usePuzzle('specific-1'));

    expect(getPuzzleById).toHaveBeenCalledWith('specific-1');
    expect(result.current.id).toBe('specific-1');
    expect(result.current.title).toBe('Specific Puzzle');
  });

  it('falls back to daily puzzle when puzzleId is not found', () => {
    const { result } = renderHook(() => usePuzzle('non-existent'));

    expect(getPuzzleById).toHaveBeenCalledWith('non-existent');
    expect(getDailyPuzzle).toHaveBeenCalled();
    expect(result.current.id).toBe('daily-1');
  });

  it('memoizes the result for the same puzzleId', () => {
    const { result, rerender } = renderHook(
      ({ id }) => usePuzzle(id),
      { initialProps: { id: 'specific-1' } }
    );

    const firstResult = result.current;

    rerender({ id: 'specific-1' });

    expect(result.current).toBe(firstResult);
  });

  it('recomputes when puzzleId changes', () => {
    const { result, rerender } = renderHook(
      ({ id }) => usePuzzle(id),
      { initialProps: { id: undefined as string | undefined } }
    );

    expect(result.current.id).toBe('daily-1');

    rerender({ id: 'specific-1' });

    expect(result.current.id).toBe('specific-1');
  });
});
