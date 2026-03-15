import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Crossword } from '@/components/games/Crossword';
import type { CrosswordState, CrosswordCell, CrosswordPuzzle } from '@/types/game';

describe('Crossword Component', () => {
  const mockOnCellChange = jest.fn();

  // A minimal 3x3 grid for testing:
  //   A B ■
  //   C ■ D
  //   ■ E F
  const testGrid: CrosswordCell[][] = [
    [
      { letter: 'A', number: 1, isBlack: false },
      { letter: 'B', isBlack: false },
      { letter: null, isBlack: true },
    ],
    [
      { letter: 'C', isBlack: false },
      { letter: null, isBlack: true },
      { letter: 'D', number: 2, isBlack: false },
    ],
    [
      { letter: null, isBlack: true },
      { letter: 'E', number: 3, isBlack: false },
      { letter: 'F', isBlack: false },
    ],
  ];

  const testPuzzle: CrosswordPuzzle = {
    id: 'test-1',
    date: '2026-03-15',
    title: 'Test Puzzle',
    rows: 3,
    cols: 3,
    grid: testGrid,
    clues: {
      across: [
        { number: 1, clue: 'First across clue', answer: 'AB', row: 0, col: 0, length: 2 },
        { number: 3, clue: 'Second across clue', answer: 'EF', row: 2, col: 1, length: 2 },
      ],
      down: [
        { number: 1, clue: 'First down clue', answer: 'AC', row: 0, col: 0, length: 2 },
        { number: 2, clue: 'Second down clue', answer: 'DF', row: 1, col: 2, length: 2 },
      ],
    },
  };

  const baseGameState: CrosswordState = {
    puzzleId: 'test-1',
    grid: testGrid,
    clues: {
      across: { 1: 'First across clue', 3: 'Second across clue' },
      down: { 1: 'First down clue', 2: 'Second down clue' },
    },
    userAnswers: {},
    completed: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders across clues in the default tab', () => {
      const { getByText } = render(
        <Crossword puzzle={testPuzzle} gameState={baseGameState} onCellChange={mockOnCellChange} />
      );

      expect(getByText('Across')).toBeTruthy();
      expect(getByText('First across clue')).toBeTruthy();
      expect(getByText('Second across clue')).toBeTruthy();
    });

    it('renders down clues when Down tab is pressed', () => {
      const { getByText } = render(
        <Crossword puzzle={testPuzzle} gameState={baseGameState} onCellChange={mockOnCellChange} />
      );

      fireEvent.press(getByText('Down'));

      expect(getByText('First down clue')).toBeTruthy();
      expect(getByText('Second down clue')).toBeTruthy();
    });

    it('renders cell numbers for numbered cells', () => {
      const { getAllByText } = render(
        <Crossword puzzle={testPuzzle} gameState={baseGameState} onCellChange={mockOnCellChange} />
      );

      // Numbers 1, 2, 3 should appear in numbered cells (and possibly in clue list)
      expect(getAllByText('1').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('3').length).toBeGreaterThanOrEqual(1);
    });

    it('displays user answers in the grid', () => {
      const gameStateWithAnswers: CrosswordState = {
        ...baseGameState,
        userAnswers: { '0-0': 'A', '0-1': 'B' },
      };

      const { getAllByText } = render(
        <Crossword puzzle={testPuzzle} gameState={gameStateWithAnswers} onCellChange={mockOnCellChange} />
      );

      expect(getAllByText('A').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('B').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Disabled state', () => {
    it('disables all non-black cells when disabled prop is true', () => {
      const { UNSAFE_getAllByType } = render(
        <Crossword
          puzzle={testPuzzle}
          gameState={baseGameState}
          onCellChange={mockOnCellChange}
          disabled={true}
        />
      );

      const touchables = UNSAFE_getAllByType(
        require('react-native').TouchableOpacity
      );

      // All grid cell touchables should be disabled
      // (tabs and clue rows are also TouchableOpacity but they don't have disabled prop)
      const gridCells = touchables.filter((t) => t.props.disabled === true);
      // 9 cells total: 6 non-black (disabled via prop) + 3 black (always disabled)
      expect(gridCells.length).toBe(9);
    });

    it('enables non-black cells when disabled prop is false', () => {
      const { UNSAFE_getAllByType } = render(
        <Crossword
          puzzle={testPuzzle}
          gameState={baseGameState}
          onCellChange={mockOnCellChange}
          disabled={false}
        />
      );

      const touchables = UNSAFE_getAllByType(
        require('react-native').TouchableOpacity
      );

      // Only 3 black cells should be disabled
      const disabledCells = touchables.filter((t) => t.props.disabled === true);
      expect(disabledCells.length).toBe(3);
    });
  });

  describe('Completed state display', () => {
    it('renders correctly when puzzle is completed with all answers', () => {
      const completedState: CrosswordState = {
        ...baseGameState,
        userAnswers: {
          '0-0': 'A',
          '0-1': 'B',
          '1-0': 'C',
          '1-2': 'D',
          '2-1': 'E',
          '2-2': 'F',
        },
        completed: true,
      };

      const { getByText } = render(
        <Crossword
          puzzle={testPuzzle}
          gameState={completedState}
          onCellChange={mockOnCellChange}
        />
      );

      // Should render the clue tabs
      expect(getByText('Across')).toBeTruthy();
      expect(getByText('Down')).toBeTruthy();
    });
  });

  describe('Active clue panel', () => {
    it('shows the active clue when a cell is tapped', () => {
      const { UNSAFE_getAllByType, getByText } = render(
        <Crossword puzzle={testPuzzle} gameState={baseGameState} onCellChange={mockOnCellChange} />
      );

      const touchables = UNSAFE_getAllByType(
        require('react-native').TouchableOpacity
      );

      // Press first cell (row 0, col 0)
      fireEvent.press(touchables[0]);

      // Should show the active clue for 1 Across
      expect(getByText('First across clue')).toBeTruthy();
    });
  });

  describe('Clue completion', () => {
    it('applies strikethrough style to completed clues', () => {
      const gameStateWithCompleted: CrosswordState = {
        ...baseGameState,
        userAnswers: {
          '0-0': 'A',
          '0-1': 'B', // completes clue 1 across (AB)
        },
      };

      const { getByText } = render(
        <Crossword
          puzzle={testPuzzle}
          gameState={gameStateWithCompleted}
          onCellChange={mockOnCellChange}
        />
      );

      const firstClueText = getByText('First across clue');
      const flatStyle = Array.isArray(firstClueText.props.style)
        ? Object.assign({}, ...firstClueText.props.style)
        : firstClueText.props.style;
      expect(flatStyle.textDecorationLine).toBe('line-through');
    });
  });
});
