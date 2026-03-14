import { useGameStore } from '@/stores/game-store';
import type { CrosswordState, GameState } from '@/types/game';

// Mock offline sync manager
jest.mock('@/lib/offline-sync-manager', () => ({
  offlineSyncManager: {
    loadGameState: jest.fn(),
    saveGameState: jest.fn(),
    forceSync: jest.fn(),
    addSyncListener: jest.fn(),
  },
  SyncStatus: {},
}));

// Mock CrosswordData
jest.mock('@/constants/CrosswordData', () => ({
  getDailyPuzzle: jest.fn(() => ({
    id: 'puzzle-1',
    date: '2026-03-14',
    title: 'Test Puzzle',
    rows: 5,
    cols: 5,
    grid: [
      [
        { letter: 'T', number: 1, isBlack: false },
        { letter: 'A', isBlack: false },
        { letter: 'B', number: 2, isBlack: false },
        { letter: 'S', isBlack: false },
        { letter: null, isBlack: true },
      ],
    ],
    clues: {
      across: [
        { number: 1, clue: 'Test across clue', answer: 'TABS', row: 0, col: 0, length: 4 },
      ],
      down: [
        { number: 2, clue: 'Test down clue', answer: 'BIG', row: 0, col: 2, length: 3 },
      ],
    },
  })),
}));

describe('Game Store - Crossword', () => {
  beforeEach(() => {
    // Reset zustand store state between tests
    useGameStore.setState({
      currentGame: null,
      gameHistory: [],
      syncStatus: { status: 'synced', message: 'All changes synced' },
    });
    jest.clearAllMocks();
  });

  describe('createNewGame for crossword', () => {
    it('creates a new crossword game with correct structure', () => {
      const game = useGameStore.getState().createNewGame('user-1', 'crossword');

      expect(game).toBeDefined();
      expect(game.gameType).toBe('crossword');
      expect(game.userId).toBe('user-1');
      expect(game.syncStatus).toBe('pending');
      expect(game.version).toBe(1);
    });

    it('uses provided gameId when given', () => {
      const game = useGameStore.getState().createNewGame(
        'user-1',
        'crossword',
        'custom-game-id'
      );

      expect(game.id).toBe('custom-game-id');
    });

    it('generates a default gameId when none provided', () => {
      const game = useGameStore.getState().createNewGame('user-1', 'crossword');

      expect(game.id).toContain('crossword_user-1_');
    });

    it('initialises crossword state from daily puzzle data', () => {
      const game = useGameStore.getState().createNewGame('user-1', 'crossword');
      const state = game.state as CrosswordState;

      expect(state.puzzleId).toBe('puzzle-1');
      expect(state.grid).toBeDefined();
      expect(state.grid.length).toBeGreaterThan(0);
      expect(state.userAnswers).toEqual({});
      expect(state.completed).toBe(false);
    });

    it('converts clue arrays to keyed objects', () => {
      const game = useGameStore.getState().createNewGame('user-1', 'crossword');
      const state = game.state as CrosswordState;

      expect(state.clues.across).toEqual({ 1: 'Test across clue' });
      expect(state.clues.down).toEqual({ 2: 'Test down clue' });
    });

    it('sets the current game in store', () => {
      const game = useGameStore.getState().createNewGame('user-1', 'crossword');

      expect(useGameStore.getState().currentGame).toBe(game);
    });

    it('sets lastUpdated to a valid ISO date string', () => {
      const game = useGameStore.getState().createNewGame('user-1', 'crossword');

      expect(game.lastUpdated).toBeDefined();
      const parsed = new Date(game.lastUpdated);
      expect(parsed.getTime()).not.toBeNaN();
    });
  });

  describe('saveGame for crossword', () => {
    it('updates the current game in store optimistically', async () => {
      const { offlineSyncManager } = require('@/lib/offline-sync-manager');
      offlineSyncManager.saveGameState.mockResolvedValue(undefined);

      const game = useGameStore.getState().createNewGame('user-1', 'crossword');
      const state = game.state as CrosswordState;

      const updatedGame: GameState = {
        ...game,
        state: {
          ...state,
          userAnswers: { '0-0': 'T', '0-1': 'A' },
        },
        lastUpdated: new Date().toISOString(),
      };

      await useGameStore.getState().saveGame(updatedGame);

      const currentGame = useGameStore.getState().currentGame;
      const currentState = currentGame!.state as CrosswordState;
      expect(currentState.userAnswers).toEqual({ '0-0': 'T', '0-1': 'A' });
    });

    it('calls offlineSyncManager.saveGameState', async () => {
      const { offlineSyncManager } = require('@/lib/offline-sync-manager');
      offlineSyncManager.saveGameState.mockResolvedValue(undefined);

      const game = useGameStore.getState().createNewGame('user-1', 'crossword');

      await useGameStore.getState().saveGame(game);

      expect(offlineSyncManager.saveGameState).toHaveBeenCalledWith(game);
    });
  });

  describe('createNewGame for connections (regression)', () => {
    it('still creates connections games correctly', () => {
      const game = useGameStore.getState().createNewGame('user-1', 'connections');

      expect(game.gameType).toBe('connections');
      expect(game.state).toEqual(
        expect.objectContaining({
          completedGroups: [],
          mistakesRemaining: 4,
          history: [],
          status: 'playing',
        })
      );
    });
  });
});
