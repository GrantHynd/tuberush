import type { CrosswordCell as CrosswordCellType, CrosswordClue, CrosswordPuzzle, CrosswordState } from '@/types/game';
import { Colors, Layout, Spacing, TFL, Typography } from '@/constants/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';

type Direction = 'across' | 'down';

// ─── Memoized grid cell ───────────────────────────────────────────────

interface GridCellProps {
    cell: CrosswordCellType;
    rowIndex: number;
    colIndex: number;
    cellSize: number;
    isSelected: boolean;
    isActiveWord: boolean;
    userAnswer: string;
    direction: Direction;
    disabled: boolean;
    accessibilityLabel: string;
    onPress: (row: number, col: number) => void;
    onLongPress: (row: number, col: number) => void;
}

const GridCell = React.memo(function GridCell({
    cell, rowIndex, colIndex, cellSize, isSelected, isActiveWord,
    userAnswer, direction, disabled, accessibilityLabel, onPress, onLongPress,
}: GridCellProps) {
    return (
        <TouchableOpacity
            style={[
                styles.cell,
                { width: cellSize, height: cellSize, minWidth: 44, minHeight: 44 },
                cell.isBlack && styles.blackCell,
                isActiveWord && !isSelected && styles.activeWordCell,
                isSelected && styles.selectedCell,
            ]}
            onPress={() => onPress(rowIndex, colIndex)}
            onLongPress={() => onLongPress(rowIndex, colIndex)}
            disabled={disabled || cell.isBlack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={cell.isBlack ? 'Black cell' : accessibilityLabel}
            accessibilityHint={cell.isBlack ? undefined : `Entering ${direction}`}
            accessibilityState={{ selected: isSelected, disabled: disabled || cell.isBlack }}
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
});

// ─── Memoized clue row ────────────────────────────────────────────────

interface ClueItemProps {
    item: CrosswordClue;
    direction: Direction;
    isActive: boolean;
    isFilled: boolean;
    puzzleCompleted: boolean;
    onPress: (clue: CrosswordClue, dir: Direction) => void;
}

const ClueItem = React.memo(function ClueItem({
    item, direction, isActive, isFilled, puzzleCompleted, onPress,
}: ClueItemProps) {
    const dirLabel = direction === 'across' ? 'Across' : 'Down';
    const showDimmed = isFilled;
    const showCheckmark = isFilled && puzzleCompleted;
    return (
        <TouchableOpacity
            style={[styles.clueRow, isActive && styles.clueRowActive]}
            onPress={() => onPress(item, direction)}
            accessibilityRole="button"
            accessibilityLabel={`${dirLabel} ${item.number}: ${item.clue}${showCheckmark ? ', completed' : ''}`}
            accessibilityState={{ selected: isActive }}
        >
            <Text style={[styles.clueNumber, showDimmed && styles.clueCompleted]}>
                {item.number}
            </Text>
            <Text style={[styles.clueText, showDimmed && styles.clueCompleted]}>
                {item.clue}
            </Text>
            {showCheckmark && (
                <Text style={styles.clueCheckmark} accessibilityElementsHidden>✓</Text>
            )}
        </TouchableOpacity>
    );
});

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

    const gridPadding = Spacing.md * 2;
    const borderWidth = 1;
    const totalBorders = cols + 1;
    const MIN_CELL_SIZE = 44;
    const naturalCellSize = Math.floor((screenWidth - gridPadding - totalBorders * borderWidth) / cols);
    const cellSize = Math.max(naturalCellSize, MIN_CELL_SIZE);
    const gridWidth = cellSize * cols + totalBorders * borderWidth;
    const needsHorizontalScroll = gridWidth > screenWidth - gridPadding;

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

    useEffect(() => {
        if (activeClue) {
            const dir = puzzle.clues.across.includes(activeClue) ? 'Across' : 'Down';
            AccessibilityInfo.announceForAccessibility(
                `${dir} ${activeClue.number}: ${activeClue.clue}`
            );
        }
    }, [activeClue, puzzle.clues.across]);

    const getCellAccessibilityLabel = useCallback(
        (rowIndex: number, colIndex: number, userAnswer: string) => {
            const key = `${rowIndex}-${colIndex}`;
            const clueInfo = cellToClue[key];
            let label = `Row ${rowIndex + 1}, Column ${colIndex + 1}`;
            if (userAnswer) label += `, letter ${userAnswer}`;
            else label += ', empty';
            if (clueInfo?.across) {
                label += `, across ${clueInfo.across.number}: ${clueInfo.across.clue}`;
            }
            if (clueInfo?.down) {
                label += `, down ${clueInfo.down.number}: ${clueInfo.down.clue}`;
            }
            return label;
        },
        [cellToClue],
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
        const isAcross = dir === 'across';
        let targetRow = clue.row;
        let targetCol = clue.col;
        for (let i = 0; i < clue.length; i++) {
            const r = isAcross ? clue.row : clue.row + i;
            const c = isAcross ? clue.col + i : clue.col;
            if (!gameState.userAnswers[`${r}-${c}`]) {
                targetRow = r;
                targetCol = c;
                break;
            }
        }
        setSelectedCell({ row: targetRow, col: targetCol });
        setDirection(dir);
        inputRef.current?.focus();
    };

    const advanceToNextCell = (row: number, col: number) => {
        if (direction === 'across') {
            for (let c = col + 1; c < cols; c++) {
                if (grid[row][c].isBlack) break;
                if (!gameState.userAnswers[`${row}-${c}`]) {
                    setSelectedCell({ row, col: c });
                    return;
                }
            }
            const nextCol = col + 1;
            if (nextCol < cols && !grid[row][nextCol].isBlack) {
                setSelectedCell({ row, col: nextCol });
            }
        } else {
            for (let r = row + 1; r < rows; r++) {
                if (grid[r][col].isBlack) break;
                if (!gameState.userAnswers[`${r}-${col}`]) {
                    setSelectedCell({ row: r, col });
                    return;
                }
            }
            const nextRow = row + 1;
            if (nextRow < rows && !grid[nextRow][col].isBlack) {
                setSelectedCell({ row: nextRow, col });
            }
        }
    };

    const handleKeyInput = (value: string) => {
        if (!selectedCell) return;

        if (value === '') {
            const currentKey = `${selectedCell.row}-${selectedCell.col}`;
            const currentAnswer = gameState.userAnswers[currentKey];
            if (currentAnswer) {
                onCellChange(selectedCell.row, selectedCell.col, '');
            } else {
                if (direction === 'across') {
                    const prevCol = selectedCell.col - 1;
                    if (prevCol >= 0 && !grid[selectedCell.row][prevCol].isBlack) {
                        onCellChange(selectedCell.row, prevCol, '');
                        setSelectedCell({ row: selectedCell.row, col: prevCol });
                    }
                } else {
                    const prevRow = selectedCell.row - 1;
                    if (prevRow >= 0 && !grid[prevRow][selectedCell.col].isBlack) {
                        onCellChange(prevRow, selectedCell.col, '');
                        setSelectedCell({ row: prevRow, col: selectedCell.col });
                    }
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

    const handleCellLongPress = useCallback(
        (row: number, col: number) => {
            const cell = grid[row]?.[col];
            if (!disabled && cell && !cell.isBlack) {
                onCellChange(row, col, '');
            }
        },
        [disabled, grid, onCellChange],
    );

    return (
        <View style={styles.container}>
            {/* Hidden input for keyboard */}
            <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value=""
                onChangeText={handleKeyInput}
                onKeyPress={(e) => {
                    if (!selectedCell) return;
                    const { key } = e.nativeEvent;
                    let nextRow = selectedCell.row;
                    let nextCol = selectedCell.col;
                    if (key === 'ArrowUp') nextRow = Math.max(0, nextRow - 1);
                    else if (key === 'ArrowDown') nextRow = Math.min(rows - 1, nextRow + 1);
                    else if (key === 'ArrowLeft') nextCol = Math.max(0, nextCol - 1);
                    else if (key === 'ArrowRight') nextCol = Math.min(cols - 1, nextCol + 1);
                    else if (key === 'Tab') {
                        e.preventDefault?.();
                        setDirection((prev) => (prev === 'across' ? 'down' : 'across'));
                        return;
                    } else return;

                    if (!grid[nextRow][nextCol].isBlack) {
                        setSelectedCell({ row: nextRow, col: nextCol });
                    }
                }}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                caretHidden
                contextMenuHidden
            />

            {/* Grid */}
            <View style={styles.gridWrapper}>
              <ScrollView
                horizontal={needsHorizontalScroll}
                scrollEnabled={needsHorizontalScroll}
                showsHorizontalScrollIndicator={needsHorizontalScroll}
              >
                <View
                    style={[
                        styles.gridContainer,
                        { width: gridWidth },
                    ]}
                    accessibilityRole="grid"
                    accessibilityLabel={`Crossword grid, ${rows} rows by ${cols} columns`}
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
                                    <GridCell
                                        key={colIndex}
                                        cell={cell}
                                        rowIndex={rowIndex}
                                        colIndex={colIndex}
                                        cellSize={cellSize}
                                        isSelected={isSelected}
                                        isActiveWord={isActiveWord}
                                        userAnswer={userAnswer}
                                        direction={direction}
                                        disabled={disabled}
                                        accessibilityLabel={getCellAccessibilityLabel(rowIndex, colIndex, userAnswer)}
                                        onPress={handleCellPress}
                                        onLongPress={handleCellLongPress}
                                    />
                                );
                            })}
                        </View>
                    ))}
                </View>
              </ScrollView>
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
            <View style={styles.tabContainer} accessibilityRole="tablist">
                <TouchableOpacity
                    style={[styles.tab, direction === 'across' && styles.tabActive]}
                    onPress={() => setDirection('across')}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: direction === 'across' }}
                    accessibilityLabel="Across clues"
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
                    accessibilityRole="tab"
                    accessibilityState={{ selected: direction === 'down' }}
                    accessibilityLabel="Down clues"
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

            {/* Clue list */}
            <View style={styles.clueList}>
                <View style={styles.clueListContent}>
                    {cluesForDirection.map((item) => {
                        const filled = isClueCompleted(item, direction === 'across');
                        const isActive = activeClue?.number === item.number &&
                            ((direction === 'across' && puzzle.clues.across.includes(item)) ||
                             (direction === 'down' && puzzle.clues.down.includes(item)));
                        return (
                            <ClueItem
                                key={`${direction}-${item.number}`}
                                item={item}
                                direction={direction}
                                isActive={isActive}
                                isFilled={filled}
                                puzzleCompleted={gameState.completed}
                                onPress={handleCluePress}
                            />
                        );
                    })}
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
    clueCheckmark: {
        fontSize: 14,
        fontWeight: '700',
        color: TFL.green ?? Colors.light.success,
        marginLeft: Spacing.xs,
    },
});
