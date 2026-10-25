import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
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


  const renderCw = (props: Partial<React.ComponentProps<typeof Crossword>> = {}, state: CrosswordState = baseGameState) =>
    render(<Crossword puzzle={testPuzzle} gameState={state} onCellChange={mockOnCellChange} onCheck={jest.fn()} {...props} />);

  describe('Rendering (TUB-298)', () => {
    it('selects the first across clue on load and shows it in the clue bar', async () => {
      const { getByTestId, getByText } = await renderCw();
      expect(getByText(/First across clue/)).toBeTruthy();
      expect(getByTestId('cell-0-0').props.accessibilityState.selected).toBe(true);
    });

    it('renders cell numbers and user answers', async () => {
      const { getAllByText } = await renderCw({}, { ...baseGameState, userAnswers: { '0-0': 'A', '0-1': 'B' } });
      expect(getAllByText('2').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('3').length).toBeGreaterThanOrEqual(1);
      expect(getAllByText('B').length).toBeGreaterThanOrEqual(1);
    });

    it('uses the in-app keyboard with Check on row 3 and no ScrollView/TextInput', async () => {
      const { getByTestId, toJSON } = await renderCw();
      expect(getByTestId('game-keyboard')).toBeTruthy();
      expect(getByTestId('key-check')).toBeTruthy();
      const tree = JSON.stringify(toJSON());
      expect(tree).not.toContain('"type":"RCTScrollView"');
      expect(tree).not.toContain('"type":"TextInput"');
    });

    it('labels cells as "Row R, column C, N Across, letter X"', async () => {
      const { getByTestId } = await renderCw({}, { ...baseGameState, userAnswers: { '0-1': 'T' } });
      expect(getByTestId('cell-0-1').props.accessibilityLabel).toBe('Row 1, column 2, 1 Across, letter T');
      expect(getByTestId('cell-0-0').props.accessibilityLabel).toBe('Row 1, column 1, 1 Across, empty');
    });

    it('sizes cells from the measured area and never below 36pt', async () => {
      const { getByTestId } = await renderCw();
      await act(async () => {
        fireEvent(getByTestId('crossword-grid-area'), 'layout', { nativeEvent: { layout: { width: 390, height: 457 } } });
      });
      // availW 358, availH 441, n=3 → clamp to 64
      expect(getByTestId('cell-0-0').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ width: 64, height: 64 })]));
    });

    it('snaps grid taps to the nearest open cell when cells are below 44pt', async () => {
      const { getByTestId } = await renderCw();
      await act(async () => {
        fireEvent(getByTestId('crossword-grid-area'), 'layout', { nativeEvent: { layout: { width: 152, height: 152 } } });
      });
      // 120x136 → raw 39 → cell 39 (< 44): grid-level touch
      const touch = getByTestId('crossword-grid-touch');
      // Tap the black cell at row 1, col 1 → nearest open cell
      await act(async () => {
        fireEvent.press(touch, { nativeEvent: { locationX: 1 + 40 * 1 + 10, locationY: 1 + 40 * 2 + 10 } });
      });
      expect(getByTestId('cell-2-1').props.accessibilityState.selected).toBe(true);
    });
  });

  describe('Typing and clearing', () => {
    it('types a letter into the selected cell and advances', async () => {
      const { getByTestId } = await renderCw();
      await fireEvent.press(getByTestId('key-Q'));
      expect(mockOnCellChange).toHaveBeenCalledWith(0, 0, 'Q');
      expect(getByTestId('cell-0-1').props.accessibilityState.selected).toBe(true);
    });

    // TUB-292 regression: letters could not be cleared (the hidden TextInput never reported Backspace).
    it('Backspace clears the letter in the selected cell (TUB-292)', async () => {
      const { getByTestId } = await renderCw({}, { ...baseGameState, userAnswers: { '0-0': 'A' } });
      await fireEvent.press(getByTestId('key-backspace'));
      expect(mockOnCellChange).toHaveBeenCalledWith(0, 0, '');
    });

    it('Backspace on an empty cell moves back one cell and clears it (TUB-292)', async () => {
      const { getByTestId } = await renderCw({}, { ...baseGameState, userAnswers: { '0-0': 'A' } });
      await fireEvent.press(getByTestId('cell-0-1'));
      await fireEvent.press(getByTestId('key-backspace'));
      expect(mockOnCellChange).toHaveBeenCalledWith(0, 0, '');
      expect(getByTestId('cell-0-0').props.accessibilityState.selected).toBe(true);
    });

    it('tapping the selected cell toggles direction', async () => {
      const { getByTestId, getByText } = await renderCw();
      await fireEvent.press(getByTestId('cell-0-0'));
      expect(getByText(/First down clue/)).toBeTruthy();
    });

    it('clue bar next/prev and toggle move between clues', async () => {
      const { getByTestId, getByText } = await renderCw();
      await fireEvent.press(getByTestId('clue-next'));
      expect(getByText(/Second across clue/)).toBeTruthy();
      await fireEvent.press(getByTestId('clue-prev'));
      await fireEvent.press(getByTestId('clue-toggle'));
      expect(getByText(/First down clue/)).toBeTruthy();
    });
  });

  describe('Check and errors (TUB-299)', () => {
    it('disables Check until filled and calls onCheck', async () => {
      const onCheck = jest.fn();
      const { getByTestId, rerender } = await renderCw({ onCheck, checkDisabled: true });
      expect(getByTestId('key-check').props.accessibilityState.disabled).toBe(true);
      await rerender(<Crossword puzzle={testPuzzle} gameState={baseGameState} onCellChange={mockOnCellChange} onCheck={onCheck} />);
      await fireEvent.press(getByTestId('key-check'));
      expect(onCheck).toHaveBeenCalled();
    });

    it('marks wrong cells as incorrect for VoiceOver', async () => {
      const { getByTestId } = await renderCw({ errorCells: new Set(['0-1']) }, { ...baseGameState, userAnswers: { '0-1': 'X' } });
      expect(getByTestId('cell-0-1').props.accessibilityValue).toEqual({ text: 'incorrect' });
      expect(getByTestId('cell-0-0').props.accessibilityValue?.text).toBeUndefined();
    });
  });

  describe('Disabled state', () => {
    it('hides keyboard and clue bar and disables cells', async () => {
      const { queryByTestId, getByTestId } = await renderCw({ disabled: true });
      expect(queryByTestId('game-keyboard')).toBeNull();
      expect(queryByTestId('clue-bar')).toBeNull();
      expect(getByTestId('cell-0-0').props.accessibilityState.disabled).toBe(true);
    });
  });
});
