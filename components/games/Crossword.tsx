import type { CrosswordClue, CrosswordPuzzle, CrosswordState } from '@/types/game';
import { Colors, Layout, Spacing, TFL, Typography } from '@/constants/theme';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';

type Direction = 'across' | 'down';

interface CrosswordProps {
    puzzle: CrosswordPuzzle;
    gameState: CrosswordState;
    onCellChange: (row: number, col: number, value: string) => void;
    disabled?: boolean;
}

export function Crossword({ puzzle, gameState, onCellChange, disabled = false }: CrosswordProps) {
    const { width: screenWidth } = useWindowDimensions();
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [direction, setDirection] = useState<Direction>('across');
    const inputRef = useRef<TextInput>(null);

    const grid = gameState.grid;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;

    // Responsive cell size: fill available width with padding
    const gridPadding = Spacing.md * 2;
    const borderWidth = 1;
    const totalBorders = cols + 1; // borders between cells + outer borders
    const cellSize = Math.floor((screenWidth - gridPadding - totalBorders * borderWidth) / cols);

    // Build lookup: for each cell, which across/down clue it belongs to
    const cellToClue = useMemo(() => {
        const map: Record<string, { across?: CrosswordClue; down?: CrosswordClue }> = {};

        for (const clue of puzzle.clues.across) {
            for (let i = 0; i < clue.length; i++) {
                const key = `${clue.row}-${clue.col + i}`;
                if (!map[key]) map[key] = {};
                map[key].across = clue;
            }
        }
        for (const clue of puzzle.clues.down) {
            for (let i = 0; i < clue.length; i++) {
                const key = `${clue.row + i}-${clue.col}`;
                if (!map[key]) map[key] = {};
                map[key].down = clue;
            }
        }
        return map;
    }, [puzzle]);

    // Get the active clue based on selected cell and direction
    const activeClue = useMemo(() => {
        if (!selectedCell) return null;
        const key = `${selectedCell.row}-${selectedCell.col}`;
        const clues = cellToClue[key];
        if (!clues) return null;
        // Prefer current direction; fall back to the other
        return clues[direction] ?? clues[direction === 'across' ? 'down' : 'across'] ?? null;
    }, [selectedCell, direction, cellToClue]);

    // Cells belonging to the active word
    const activeWordCells = useMemo(() => {
        if (!activeClue) return new Set<string>();
        const cells = new Set<string>();
        const isAcross = puzzle.clues.across.includes(activeClue);
        for (let i = 0; i < activeClue.length; i++) {
            const r = isAcross ? activeClue.row : activeClue.row + i;
            const c = isAcross ? activeClue.col + i : activeClue.col;
            cells.add(`${r}-${c}`);
        }
        return cells;
    }, [activeClue, puzzle]);

    // Check if a clue is fully completed
    const isClueCompleted = useCallback(
        (clue: CrosswordClue, isAcross: boolean) => {
            for (let i = 0; i < clue.length; i++) {
                const r = isAcross ? clue.row : clue.row + i;
                const c = isAcross ? clue.col + i : clue.col;
                const answer = gameState.userAnswers[`${r}-${c}`];
                if (!answer) return false;
            }
            return true;
        },
        [gameState.userAnswers],
    );

    const handleCellPress = (row: number, col: number) => {
        const cell = grid[row][col];
        if (cell.isBlack) return;

        if (selectedCell?.row === row && selectedCell?.col === col) {
            // Tapping same cell toggles direction
            const key = `${row}-${col}`;
            const clues = cellToClue[key];
            if (clues?.across && clues?.down) {
                setDirection(prev => (prev === 'across' ? 'down' : 'across'));
            }
        } else {
            setSelectedCell({ row, col });
            // Auto-pick direction based on available clues
            const key = `${row}-${col}`;
            const clues = cellToClue[key];
            if (clues && !clues[direction]) {
                setDirection(direction === 'across' ? 'down' : 'across');
            }
        }
        inputRef.current?.focus();
    };

    const handleCluePress = (clue: CrosswordClue, dir: Direction) => {
        setSelectedCell({ row: clue.row, col: clue.col });
        setDirection(dir);
        inputRef.current?.focus();
    };

    const advanceToNextCell = (row: number, col: number) => {
        if (direction === 'across') {
            const nextCol = col + 1;
            if (nextCol < cols && !grid[row][nextCol].isBlack) {
                setSelectedCell({ row, col: nextCol });
                return;
            }
        } else {
            const nextRow = row + 1;
            if (nextRow < rows && !grid[nextRow][col].isBlack) {
                setSelectedCell({ row: nextRow, col });
                return;
            }
        }
    };

    const handleKeyInput = (value: string) => {
        if (!selectedCell) return;

        if (value === '') {
            // Backspace: clear current cell and move back
            onCellChange(selectedCell.row, selectedCell.col, '');
            if (direction === 'across') {
                const prevCol = selectedCell.col - 1;
                if (prevCol >= 0 && !grid[selectedCell.row][prevCol].isBlack) {
                    setSelectedCell({ row: selectedCell.row, col: prevCol });
                }
            } else {
                const prevRow = selectedCell.row - 1;
                if (prevRow >= 0 && !grid[prevRow][selectedCell.col].isBlack) {
                    setSelectedCell({ row: prevRow, col: selectedCell.col });
                }
            }
            return;
        }

        const letter = value.slice(-1).toUpperCase();
        if (/^[A-Z]$/.test(letter)) {
            onCellChange(selectedCell.row, selectedCell.col, letter);
            advanceToNextCell(selectedCell.row, selectedCell.col);
        }
    };

    const cluesForDirection = direction === 'across' ? puzzle.clues.across : puzzle.clues.down;

    const renderClueItem = ({ item }: { item: CrosswordClue }) => {
        const completed = isClueCompleted(item, direction === 'across');
        const isActive = activeClue?.number === item.number &&
            ((direction === 'across' && puzzle.clues.across.includes(item)) ||
             (direction === 'down' && puzzle.clues.down.includes(item)));

        return (
            <TouchableOpacity
                style={[styles.clueRow, isActive && styles.clueRowActive]}
                onPress={() => handleCluePress(item, direction)}
            >
                <Text
                    style={[
                        styles.clueNumber,
                        completed && styles.clueCompleted,
                    ]}
                >
                    {item.number}
                </Text>
                <Text
                    style={[
                        styles.clueText,
                        completed && styles.clueCompleted,
                    ]}
                >
                    {item.clue}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Hidden input for keyboard */}
            <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value=""
                onChangeText={handleKeyInput}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                caretHidden
                contextMenuHidden
            />

            {/* Grid */}
            <View style={styles.gridWrapper}>
                <View
                    style={[
                        styles.gridContainer,
                        { width: cellSize * cols + totalBorders * borderWidth },
                    ]}
                >
                    {grid.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.row}>
                            {row.map((cell, colIndex) => {
                                const cellKey = `${rowIndex}-${colIndex}`;
                                const isSelected =
                                    selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                                const isActiveWord = activeWordCells.has(cellKey);
                                const userAnswer = gameState.userAnswers[cellKey] || '';

                                return (
                                    <TouchableOpacity
                                        key={colIndex}
                                        style={[
                                            styles.cell,
                                            {
                                                width: cellSize,
                                                height: cellSize,
                                            },
                                            cell.isBlack && styles.blackCell,
                                            isActiveWord && !isSelected && styles.activeWordCell,
                                            isSelected && styles.selectedCell,
                                        ]}
                                        onPress={() => handleCellPress(rowIndex, colIndex)}
                                        disabled={disabled || cell.isBlack}
                                        activeOpacity={0.7}
                                    >
                                        {cell.number != null && (
                                            <Text
                                                style={[
                                                    styles.cellNumber,
                                                    { fontSize: Math.max(8, cellSize * 0.2) },
                                                    isSelected && styles.cellNumberSelected,
                                                ]}
                                            >
                                                {cell.number}
                                            </Text>
                                        )}
                                        {!cell.isBlack && (
                                            <Text
                                                style={[
                                                    styles.cellLetter,
                                                    { fontSize: Math.max(14, cellSize * 0.45) },
                                                    isSelected && styles.cellLetterSelected,
                                                ]}
                                            >
                                                {userAnswer}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </View>

            {/* Active clue panel */}
            {activeClue && (
                <View style={styles.activeClueCard}>
                    <View style={styles.activeClueAccent} />
                    <Text style={styles.activeClueText}>
                        <Text style={styles.activeClueRef}>
                            {activeClue.number}
                            {puzzle.clues.across.includes(activeClue) ? 'A' : 'D'}.{' '}
                        </Text>
                        {activeClue.clue}
                    </Text>
                </View>
            )}

            {/* Direction tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, direction === 'across' && styles.tabActive]}
                    onPress={() => setDirection('across')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            direction === 'across' && styles.tabTextActive,
                        ]}
                    >
                        Across
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, direction === 'down' && styles.tabActive]}
                    onPress={() => setDirection('down')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            direction === 'down' && styles.tabTextActive,
                        ]}
                    >
                        Down
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Clue list - use View + map to avoid nesting VirtualizedList inside ScrollView */}
            <View style={styles.clueList}>
                <View style={styles.clueListContent}>
                    {cluesForDirection.map((item) => (
                        <View key={`${direction}-${item.number}`}>
                            {renderClueItem({ item })}
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const NAVY = TFL.blue; // #003688
const ACTIVE_WORD_BG = '#D6DFFB';

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    hiddenInput: {
        position: 'absolute',
        opacity: 0,
        height: 0,
        width: 0,
    },
    gridWrapper: {
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    gridContainer: {
        borderWidth: 1,
        borderColor: '#999',
        backgroundColor: '#999',
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        backgroundColor: '#FFFFFF',
        borderWidth: 0.5,
        borderColor: '#CCCCCC',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    blackCell: {
        backgroundColor: '#111111',
        borderColor: '#111111',
    },
    selectedCell: {
        backgroundColor: NAVY,
    },
    activeWordCell: {
        backgroundColor: ACTIVE_WORD_BG,
    },
    cellNumber: {
        position: 'absolute',
        top: 1,
        left: 2,
        color: '#555',
        fontWeight: '500',
    },
    cellNumberSelected: {
        color: '#FFFFFF',
    },
    cellLetter: {
        fontWeight: '700',
        color: Colors.light.text,
    },
    cellLetterSelected: {
        color: '#FFFFFF',
    },
    activeClueCard: {
        flexDirection: 'row',
        marginHorizontal: Spacing.md,
        marginTop: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        backgroundColor: TFL.grey.light,
        borderRadius: Layout.borderRadius.lg,
        alignItems: 'center',
        overflow: 'hidden',
    },
    activeClueAccent: {
        width: 4,
        alignSelf: 'stretch',
        backgroundColor: NAVY,
        borderRadius: 2,
        marginRight: Spacing.sm,
    },
    activeClueRef: {
        fontWeight: '700',
        color: Colors.light.text,
    },
    activeClueText: {
        ...Typography.body,
        flex: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    tab: {
        paddingBottom: Spacing.sm,
        marginRight: Spacing.lg,
    },
    tabActive: {
        borderBottomWidth: 2,
        borderBottomColor: NAVY,
    },
    tabText: {
        ...Typography.body,
        color: TFL.grey.dark,
    },
    tabTextActive: {
        fontWeight: '600',
        color: NAVY,
    },
    clueList: {
        flex: 1,
    },
    clueListContent: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xl,
    },
    clueRow: {
        flexDirection: 'row',
        paddingVertical: Spacing.sm,
    },
    clueRowActive: {
        backgroundColor: TFL.grey.light,
        borderRadius: Layout.borderRadius.sm,
        marginHorizontal: -Spacing.xs,
        paddingHorizontal: Spacing.xs,
    },
    clueNumber: {
        ...Typography.body,
        fontWeight: '700',
        width: 32,
        color: Colors.light.text,
    },
    clueText: {
        ...Typography.body,
        flex: 1,
        color: Colors.light.text,
    },
    clueCompleted: {
        textDecorationLine: 'line-through',
        color: TFL.grey.dark,
    },
});
