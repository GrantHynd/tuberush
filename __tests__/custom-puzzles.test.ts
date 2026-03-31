import { getCustomPuzzle, saveCustomPuzzleScore } from '@/lib/custom-puzzles';

const mockSelect = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();

jest.mock('@/lib/supabase-client', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'custom_puzzles') {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      }
      return {};
    }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();

  // Default chain: .select().eq().single()
  mockSelect.mockReturnValue({
    eq: mockEq,
  });
  mockEq.mockReturnValue({
    single: mockSingle,
  });

  // Default chain for update: .update().eq()
  mockUpdate.mockReturnValue({
    eq: jest.fn().mockResolvedValue({ error: null }),
  });
});

const mockCustomPuzzle = {
  id: 'cp-123',
  user_id: 'user-1',
  game_type: 'crossword' as const,
  puzzle_data: {
    id: 'CW-42',
    date: '2026-03-31',
    title: 'Custom Crossword',
    rows: 5,
    cols: 5,
    grid: [],
    clues: { across: [], down: [] },
  },
  score: null,
  completed_at: null,
  created_at: '2026-03-31T10:00:00Z',
};

describe('getCustomPuzzle', () => {
  it('returns a custom puzzle by ID', async () => {
    mockSingle.mockResolvedValue({ data: mockCustomPuzzle, error: null });

    const result = await getCustomPuzzle('cp-123');

    expect(result).toEqual(mockCustomPuzzle);
  });

  it('returns null when puzzle not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const result = await getCustomPuzzle('nonexistent');

    expect(result).toBeNull();
  });
});

describe('saveCustomPuzzleScore', () => {
  it('saves score when no existing score', async () => {
    mockSingle.mockResolvedValue({ data: { score: null }, error: null });
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });

    await saveCustomPuzzleScore('cp-123', 120);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ score: 120 }),
    );
  });

  it('saves score when new score is better (lower)', async () => {
    mockSingle.mockResolvedValue({ data: { score: 200 }, error: null });
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });

    await saveCustomPuzzleScore('cp-123', 120);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ score: 120 }),
    );
  });

  it('does not update when existing score is better', async () => {
    mockSingle.mockResolvedValue({ data: { score: 100 }, error: null });

    await saveCustomPuzzleScore('cp-123', 120);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('throws when update fails', async () => {
    mockSingle.mockResolvedValue({ data: { score: null }, error: null });
    const mockUpdateEq = jest.fn().mockResolvedValue({ error: { message: 'DB error' } });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });

    await expect(saveCustomPuzzleScore('cp-123', 120)).rejects.toEqual({ message: 'DB error' });
  });
});
