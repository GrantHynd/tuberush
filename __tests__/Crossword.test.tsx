import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Crossword } from '@/components/games/Crossword';
import type { CrosswordState, CrosswordCell } from '@/types/game';

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
    it('renders the title', () => {
      const { getByText } = render(
        <Crossword gameState={baseGameState} onCellChange={mockOnCellChange} />
      );

      expect(getByText('Premium Crossword Puzzle')).toBeTruthy();
    });

    it('renders across clues section', () => {
      const { getByText } = render(
        <Crossword gameState={baseGameState} onCellChange={mockOnCellChange} />
      );

      expect(getByText('Across')).toBeTruthy();
      expect(getByText('1. First across clue')).toBeTruthy();
      expect(getByText('3. Second across clue')).toBeTruthy();
    });

    it('renders down clues section', () => {
      const { getByText } = render(
        <Crossword gameState={baseGameState} onCellChange={mockOnCellChange} />
      );

      expect(getByText('Down')).toBeTruthy();
      expect(getByText('1. First down clue')).toBeTruthy();
      expect(getByText('2. Second down clue')).toBeTruthy();
    });

    it('renders cell numbers for numbered cells', () => {
      const { getAllByText } = render(
        <Crossword gameState={baseGameState} onCellChange={mockOnCellChange} />
      );

      // Numbers 1, 2, 3 should appear in numbered cells
      // Note: number 1 appears in both across and down clues sections too
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
        <Crossword gameState={gameStateWithAnswers} onCellChange={mockOnCellChange} />
      );

      expect(getAllByText('A').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('B').length).toBeGreaterThanOrEqual(1);
    });

    it('does not show input when no cell is selected', () => {
      const { queryByPlaceholderText } = render(
        <Crossword gameState={baseGameState} onCellChange={mockOnCellChange} />
      );

      expect(queryByPlaceholderText('Enter letter')).toBeNull();
    });
  });

  describe('Cell interaction', () => {
    it('shows input field when a non-black cell is pressed', () => {
      const { UNSAFE_getAllByType, queryByPlaceholderText } = render(
        <Crossword gameState={baseGameState} onCellChange={mockOnCellChange} />
      );

      // Find all TouchableOpacity elements (cells)
      const touchables = UNSAFE_getAllByType(
        require('react-native').TouchableOpacity
      );

      // Press the first cell (non-black, row 0 col 0)
      fireEvent.press(touchables[0]);

      expect(queryByPlaceholderText('Enter letter')).toBeTruthy();
    });

    it('calls onCellChange with uppercase value when input is provided', () => {
      const { UNSAFE_getAllByType, getByPlaceholderText } = render(
        <Crossword gameState={baseGameState} onCellChange={mockOnCellChange} />
      );

      const touchables = UNSAFE_getAllByType(
        require('react-native').TouchableOpacity
      );

      // Press cell at row 0, col 0
      fireEvent.press(touchables[0]);

      const input = getByPlaceholderText('Enter letter');
      fireEvent.changeText(input, 'a');

      expect(mockOnCellChange).toHaveBeenCalledWith(0, 0, 'A');
    });

    it('does not call onCellChange when disabled', () => {
      const { UNSAFE_getAllByType } = render(
        <Crossword
          gameState={baseGameState}
          onCellChange={mockOnCellChange}
          disabled={true}
        />
      );

      const touchables = UNSAFE_getAllByType(
        require('react-native').TouchableOpacity
      );

      // All non-black cells should be disabled
      const firstNonBlackCell = touchables[0];
      expect(firstNonBlackCell.props.disabled).toBe(true);
    });
  });

  describe('Disabled state', () => {
    it('disables all non-black cells when disabled prop is true', () => {
      const { UNSAFE_getAllByType } = render(
        <Crossword
          gameState={baseGameState}
          onCellChange={mockOnCellChange}
          disabled={true}
        />
      );

      const touchables = UNSAFE_getAllByType(
        require('react-native').TouchableOpacity
      );

      // Every touchable should be disabled (black cells are always disabled, white cells disabled via prop)
      touchables.forEach((touchable) => {
        expect(touchable.props.disabled).toBe(true);
      });
    });

    it('enables non-black cells when disabled prop is false', () => {
      const { UNSAFE_getAllByType } = render(
        <Crossword
          gameState={baseGameState}
          onCellChange={mockOnCellChange}
          disabled={false}
        />
      );

      const touchables = UNSAFE_getAllByType(
        require('react-native').TouchableOpacity
      );

      // 3 black cells should be disabled in our 3x3 test grid
      const disabledCells = touchables.filter((t) => t.props.disabled);
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
          gameState={completedState}
          onCellChange={mockOnCellChange}
        />
      );

      // Should still render correctly even when completed
      expect(getByText('Premium Crossword Puzzle')).toBeTruthy();
    });
  });
});
