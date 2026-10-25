import { ClueBar } from '@/components/game-ui/ClueBar';
import { GameKeyboard } from '@/components/game-ui/GameKeyboard';
import { FontScaleCap, GameColors, StateColors, TFL } from '@/constants/theme';
import {
    MIN_TARGET_CELL,
    MIN_CELL,
    cellSize as computeCellSize,
    gridExtent,
    letterSize,
    numberSize,
    rawCellSize,
} from '@/lib/grid-sizing';
import type { CrosswordCell as CrosswordCellType, CrosswordClue, CrosswordPuzzle, CrosswordState } from '@/types/game';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AccessibilityInfo,
    type AccessibilityActionEvent,
    type GestureResponderEvent,
    type LayoutChangeEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

export type Direction = 'across' | 'down';

const SIDE_MARGIN = 16;
const GRID_PAD_V = 16;
const KEY_DEFAULT = 46;
const KEY_COMPACT = 40;
const CLUE_DEFAULT = 64;
const CLUE_COMPACT = 52;

const keyOf = (r: number, c: number) => `${r}-${c}`;

// ─── Grid cell ────────────────────────────────────────────────────────

interface GridCellProps {
    cell: CrosswordCellType;
    rowIndex: number;
    colIndex: number;
    size: number;
    isSelected: boolean;
    isActiveWord: boolean;
    isError: boolean;
    userAnswer: string;
    disabled: boolean;
    /** False when cells are < 44pt: the grid-level Pressable handles touch instead. */
    pressable: boolean;
    accessibilityLabel: string;
    onPress: (row: number, col: number) => void;
    onAdjust: (delta: 1 | -1) => void;
}

const GridCell = React.memo(function GridCell({
    cell, rowIndex, colIndex, size, isSelected, isActiveWord, isError,
    userAnswer, disabled, pressable, accessibilityLabel, onPress, onAdjust,
}: GridCellProps) {
    const style = [
        styles.cell,
        { width: size, height: size },
        cell.isBlack && styles.blackCell,
        isActiveWord && !isSelected && styles.activeWordCell,
        isSelected && styles.selectedCell,
        isError && styles.errorCell,
    ];
    if (cell.isBlack) {
        return <View style={style} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
    }
    const content = (
        <>
            {cell.number != null && (
                <Text
                    style={[styles.cellNumber, { fontSize: numberSize(size) }, isSelected && styles.onSelected]}
                    maxFontSizeMultiplier={FontScaleCap.gridLetter}
                    importantForAccessibility="no"
                >
                    {cell.number}
                </Text>
            )}
            <Text
                style={[styles.cellLetter, { fontSize: letterSize(size) }, isSelected && styles.onSelected]}
                maxFontSizeMultiplier={FontScaleCap.gridLetter}
            >
                {userAnswer}
            </Text>
            {isError && (
                <View style={styles.errIcon} accessibilityElementsHidden importantForAccessibility="no">
                    <MaterialIcons name="close" size={10} color="#FFFFFF" />
                </View>
            )}
        </>
    );
    const a11y = {
        accessible: true,
        accessibilityRole: isSelected ? ('adjustable' as const) : ('button' as const),
        accessibilityLabel,
        accessibilityValue: isError ? { text: 'incorrect' } : undefined,
        accessibilityState: { selected: isSelected, disabled },
        accessibilityActions: [{ name: 'activate' }, { name: 'increment' }, { name: 'decrement' }],
        onAccessibilityAction: (e: AccessibilityActionEvent) => {
            if (e.nativeEvent.actionName === 'activate') onPress(rowIndex, colIndex);
            else if (e.nativeEvent.actionName === 'increment') onAdjust(1);
            else if (e.nativeEvent.actionName === 'decrement') onAdjust(-1);
        },
    };
    if (!pressable) {
        return (
            <View style={style} testID={`cell-${rowIndex}-${colIndex}`} {...a11y}>
                {content}
            </View>
        );
    }
    return (
        <Pressable
            style={style}
            testID={`cell-${rowIndex}-${colIndex}`}
            onPress={() => onPress(rowIndex, colIndex)}
            disabled={disabled}
            {...a11y}
        >
            {content}
        </Pressable>
    );
});

// ─── Crossword ────────────────────────────────────────────────────────

interface CrosswordProps {
    puzzle: CrosswordPuzzle;
    gameState: CrosswordState;
    onCellChange: (row: number, col: number, value: string) => void;
    disabled?: boolean;
    /** Keyboard Check key (TUB-298: lives on row 3 of the in-app keyboard). */
    onCheck?: () => void;
    checkDisabled?: boolean;
    /** Cells marked wrong by the last Check (TUB-299). */
    errorCells?: ReadonlySet<string>;
    bottomInset?: number;
    /** Fixed cell size (finished view, inside a ScrollView): skips layout-based sizing. */
    staticCellSize?: number;
}

function firstClue(puzzle: CrosswordPuzzle): { cell: { row: number; col: number } | null; dir: Direction } {
    const a = puzzle.clues.across[0];
    if (a) return { cell: { row: a.row, col: a.col }, dir: 'across' };
    const d = puzzle.clues.down[0];
    if (d) return { cell: { row: d.row, col: d.col }, dir: 'down' };
    return { cell: null, dir: 'across' };
}

export function Crossword({
    puzzle,
    gameState,
    onCellChange,
    disabled = false,
    onCheck,
    checkDisabled = false,
    errorCells,
    bottomInset = 0,
    staticCellSize,
}: CrosswordProps) {
    const { width: screenW, height: screenH } = useWindowDimensions();
    // TUB-298: select the first clue on load.
    const [selectedCell, setSelectedCell] = useState(() => (disabled ? null : firstClue(puzzle).cell));
    const [direction, setDirection] = useState<Direction>(() => firstClue(puzzle).dir);
    const [area, setArea] = useState<{ w: number; h: number } | null>(null);
    const [compact, setCompact] = useState(false);

    const grid = gameState.grid;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    const n = Math.max(rows, cols, 1);

    // Measured grid area (Dynamic Type grows clue bar/keys → area shrinks → grid shrinks).
    // Before first layout, estimate from the window.
    const availW = (area?.w ?? screenW) - 2 * SIDE_MARGIN;
    const availH = area ? area.h - GRID_PAD_V : Math.max(0, screenH - 420);
    const size = staticCellSize ?? computeCellSize(availW, availH, n);
    const pressableCells = size >= MIN_TARGET_CELL;

    const onGridAreaLayout = useCallback(
        (e: LayoutChangeEvent) => {
            const { width, height } = e.nativeEvent.layout;
            setArea((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
            // If even the default chrome leaves cells under 36pt, shrink keys and clue bar first.
            if (!compact && rawCellSize(width - 2 * SIDE_MARGIN, height - GRID_PAD_V, n) < MIN_CELL) {
                setCompact(true);
            }
        },
        [compact, n],
    );

    const cellToClue = useMemo(() => {
        const map: Record<string, { across?: CrosswordClue; down?: CrosswordClue }> = {};
        for (const clue of puzzle.clues.across) {
            for (let i = 0; i < clue.length; i++) {
                const k = keyOf(clue.row, clue.col + i);
                (map[k] ??= {}).across = clue;
            }
        }
        for (const clue of puzzle.clues.down) {
            for (let i = 0; i < clue.length; i++) {
                const k = keyOf(clue.row + i, clue.col);
                (map[k] ??= {}).down = clue;
            }
        }
        return map;
    }, [puzzle]);

    const allClues = useMemo(
        () => [
            ...puzzle.clues.across.map((c) => ({ clue: c, dir: 'across' as Direction })),
            ...puzzle.clues.down.map((c) => ({ clue: c, dir: 'down' as Direction })),
        ],
        [puzzle],
    );

    const active = useMemo(() => {
        if (!selectedCell) return null;
        const clues = cellToClue[keyOf(selectedCell.row, selectedCell.col)];
        if (!clues) return null;
        if (clues[direction]) return { clue: clues[direction]!, dir: direction };
        const other: Direction = direction === 'across' ? 'down' : 'across';
        return clues[other] ? { clue: clues[other]!, dir: other } : null;
    }, [selectedCell, direction, cellToClue]);

    const activeWordCells = useMemo(() => {
        const set = new Set<string>();
        if (!active) return set;
        for (let i = 0; i < active.clue.length; i++) {
            set.add(active.dir === 'across'
                ? keyOf(active.clue.row, active.clue.col + i)
                : keyOf(active.clue.row + i, active.clue.col));
        }
        return set;
    }, [active]);

    useEffect(() => {
        if (active) {
            AccessibilityInfo.announceForAccessibility(
                `${active.clue.number} ${active.dir === 'across' ? 'Across' : 'Down'}: ${active.clue.clue}`,
            );
        }
    }, [active]);

    const isOpen = useCallback(
        (r: number, c: number) => r >= 0 && c >= 0 && r < rows && c < cols && !grid[r][c].isBlack,
        [grid, rows, cols],
    );

    const getCellLabel = useCallback(
        (r: number, c: number, userAnswer: string) => {
            // TUB-298: "Row 3, column 5, 9 Across, letter T"
            const info = cellToClue[keyOf(r, c)];
            const isSel = selectedCell?.row === r && selectedCell?.col === c;
            const pref: Direction = isSel && active ? active.dir : info?.across ? 'across' : 'down';
            const clue = info?.[pref] ?? info?.across ?? info?.down;
            const dir: Direction = clue && clue === info?.across ? 'across' : 'down';
            const value = userAnswer ? `letter ${userAnswer}` : 'empty';
            const where = `Row ${r + 1}, column ${c + 1}`;
            if (!clue) return `${where}, ${value}`;
            return `${where}, ${clue.number} ${dir === 'across' ? 'Across' : 'Down'}, ${value}`;
        },
        [cellToClue, selectedCell, active],
    );

    const selectCell = useCallback(
        (row: number, col: number) => {
            if (disabled || !isOpen(row, col)) return;
            if (selectedCell?.row === row && selectedCell?.col === col) {
                // Tapping the selected cell toggles direction (when the other direction exists).
                const info = cellToClue[keyOf(row, col)];
                const other: Direction = direction === 'across' ? 'down' : 'across';
                if (info?.[other]) setDirection(other);
                return;
            }
            const info = cellToClue[keyOf(row, col)];
            if (info && !info[direction]) setDirection(direction === 'across' ? 'down' : 'across');
            setSelectedCell({ row, col });
        },
        [disabled, isOpen, selectedCell, cellToClue, direction],
    );

    /** Grid-level tap for < 44pt cells: snap to the nearest open cell. */
    const onGridPress = (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        const step = size + 1;
        const tr = Math.min(rows - 1, Math.max(0, Math.floor((locationY - 1) / step)));
        const tc = Math.min(cols - 1, Math.max(0, Math.floor((locationX - 1) / step)));
        let best: { r: number; c: number; d: number } | null = null;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (!isOpen(r, c)) continue;
                const d = Math.abs(r - tr) + Math.abs(c - tc);
                if (!best || d < best.d) best = { r, c, d };
            }
        }
        if (best) selectCell(best.r, best.c);
    };

    const step = (row: number, col: number, delta: 1 | -1, dir: Direction) =>
        dir === 'across' ? { row, col: col + delta } : { row: row + delta, col };

    const moveWithinWord = useCallback(
        (delta: 1 | -1) => {
            if (!selectedCell || !active) return;
            const next = step(selectedCell.row, selectedCell.col, delta, active.dir);
            if (activeWordCells.has(keyOf(next.row, next.col))) setSelectedCell(next);
        },
        [selectedCell, active, activeWordCells],
    );

    const advance = (row: number, col: number, dir: Direction) => {
        // Next empty cell in the word, else the next cell.
        let cur = step(row, col, 1, dir);
        while (isOpen(cur.row, cur.col)) {
            if (!gameState.userAnswers[keyOf(cur.row, cur.col)]) {
                setSelectedCell(cur);
                return;
            }
            cur = step(cur.row, cur.col, 1, dir);
        }
        const nxt = step(row, col, 1, dir);
        if (isOpen(nxt.row, nxt.col)) setSelectedCell(nxt);
    };

    const handleKey = (letter: string) => {
        if (disabled || !selectedCell) return;
        onCellChange(selectedCell.row, selectedCell.col, letter);
        advance(selectedCell.row, selectedCell.col, active?.dir ?? direction);
    };

    /**
     * TUB-292: Backspace clears the current letter; on an empty cell it moves back one
     * cell in the word and clears that. (The old hidden TextInput had value="" so the OS
     * never reported a change for Backspace, which is why letters couldn't be cleared.)
     */
    const handleBackspace = () => {
        if (disabled || !selectedCell) return;
        const { row, col } = selectedCell;
        if (gameState.userAnswers[keyOf(row, col)]) {
            onCellChange(row, col, '');
            return;
        }
        const prev = step(row, col, -1, active?.dir ?? direction);
        if (isOpen(prev.row, prev.col)) {
            onCellChange(prev.row, prev.col, '');
            setSelectedCell(prev);
        }
    };

    const goToClue = (offset: 1 | -1) => {
        if (allClues.length === 0) return;
        const idx = active ? allClues.findIndex((x) => x.clue === active.clue && x.dir === active.dir) : -1;
        const next = allClues[(idx + offset + allClues.length) % allClues.length];
        let target = { row: next.clue.row, col: next.clue.col };
        for (let i = 0; i < next.clue.length; i++) {
            const cell = next.dir === 'across'
                ? { row: next.clue.row, col: next.clue.col + i }
                : { row: next.clue.row + i, col: next.clue.col };
            if (!gameState.userAnswers[keyOf(cell.row, cell.col)]) {
                target = cell;
                break;
            }
        }
        setDirection(next.dir);
        setSelectedCell(target);
    };

    const toggleDirection = () => {
        if (!selectedCell) return;
        const other: Direction = direction === 'across' ? 'down' : 'across';
        if (cellToClue[keyOf(selectedCell.row, selectedCell.col)]?.[other]) setDirection(other);
    };

    const width = gridExtent(size, cols);
    const gridNode = (
        <View
            style={[styles.gridContainer, { width: width + 4 }]}
            accessibilityLabel={`Crossword grid, ${rows} rows by ${cols} columns`}
            testID="crossword-grid"
        >
            {grid.map((row, r) => (
                <View key={r} style={styles.row}>
                    {row.map((cell, c) => {
                        const k = keyOf(r, c);
                        const ans = gameState.userAnswers[k] || '';
                        return (
                            <GridCell
                                key={c}
                                cell={cell}
                                rowIndex={r}
                                colIndex={c}
                                size={size}
                                isSelected={selectedCell?.row === r && selectedCell?.col === c}
                                isActiveWord={activeWordCells.has(k)}
                                isError={!!errorCells?.has(k)}
                                userAnswer={ans}
                                disabled={disabled}
                                pressable={pressableCells}
                                accessibilityLabel={getCellLabel(r, c, ans)}
                                onPress={selectCell}
                                onAdjust={moveWithinWord}
                            />
                        );
                    })}
                </View>
            ))}
        </View>
    );

    return (
        <View style={styles.container} testID="crossword">
            {/* TUB-298: no ScrollView — the grid is sized to fit this area. */}
            <View
                style={staticCellSize ? styles.gridAreaStatic : styles.gridArea}
                onLayout={staticCellSize ? undefined : onGridAreaLayout}
                testID="crossword-grid-area"
            >
                {pressableCells || disabled ? (
                    gridNode
                ) : (
                    <Pressable onPress={onGridPress} testID="crossword-grid-touch" accessible={false}>
                        {gridNode}
                    </Pressable>
                )}
            </View>

            {!disabled && active && (
                <View style={styles.clueWrap}>
                    <ClueBar
                        label={`${active.clue.number} ${active.dir === 'across' ? 'Across' : 'Down'}`}
                        clue={active.clue.clue}
                        length={active.clue.length}
                        lineColor={GameColors.crossword}
                        onPrev={() => goToClue(-1)}
                        onNext={() => goToClue(1)}
                        onToggleDirection={toggleDirection}
                        minHeight={compact ? CLUE_COMPACT : CLUE_DEFAULT}
                    />
                </View>
            )}

            {!disabled && (
                <GameKeyboard
                    onKey={handleKey}
                    onBackspace={handleBackspace}
                    onCheck={() => onCheck?.()}
                    checkDisabled={checkDisabled || !onCheck}
                    checkLabel="Check"
                    keyHeight={compact ? KEY_COMPACT : KEY_DEFAULT}
                    bottomInset={bottomInset}
                />
            )}
        </View>
    );
}

const NAVY = TFL.blue; // #003688
const ACTIVE_WORD_BG = '#D6DFFB';

const styles = StyleSheet.create({
    container: { flex: 1 },
    gridArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SIDE_MARGIN,
        paddingVertical: GRID_PAD_V / 2,
    },
    gridAreaStatic: { alignItems: 'center', paddingHorizontal: SIDE_MARGIN, paddingTop: 8 },
    gridContainer: {
        borderWidth: 2,
        borderColor: StateColors.gridLine,
        backgroundColor: StateColors.gridLine,
        borderRadius: 12,
        overflow: 'hidden',
        padding: 1,
        gap: 1,
    },
    row: { flexDirection: 'row', gap: 1 },
    cell: {
        backgroundColor: '#FFFFFF',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    blackCell: { backgroundColor: '#1C1C1F' },
    // TUB-295/298: tint alone is 1.33:1, so the active word also gets a 2px navy outline (11:1).
    activeWordCell: { backgroundColor: ACTIVE_WORD_BG, borderWidth: 2, borderColor: NAVY },
    selectedCell: { backgroundColor: NAVY, borderWidth: 3, borderColor: StateColors.cursorRing },
    errorCell: { borderWidth: 3, borderColor: StateColors.error },
    cellNumber: { position: 'absolute', top: 1, left: 3, color: '#374151', fontWeight: '600' },
    cellLetter: { fontWeight: '700', color: StateColors.ink },
    onSelected: { color: '#FFFFFF' },
    errIcon: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: StateColors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clueWrap: { marginHorizontal: SIDE_MARGIN, marginBottom: 8 },
});
