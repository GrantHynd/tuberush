import { Crossword } from '@/components/games/Crossword';
import { FontScaleCap, StateColors } from '@/constants/theme';
import type { CrosswordClue, CrosswordPuzzle, CrosswordState } from '@/types/game';
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const noop = () => {};

/** Finished-crossword board (TUB-300): the filled grid plus every clue ticked with its answer. */
export function CrosswordSolvedBoard({ puzzle, state }: { puzzle: CrosswordPuzzle; state: CrosswordState }) {
    const { width } = useWindowDimensions();
    const n = Math.max(state.grid.length, state.grid[0]?.length ?? 0, 1);
    // Mockup uses 52pt for a 5x5; shrink for larger grids so the clues stay in view.
    const cell = Math.max(28, Math.min(52, Math.floor((Math.min(width - 32, 300) - (n + 1)) / n)));
    const section = (title: string, dir: 'Across' | 'Down', clues: CrosswordClue[]) =>
        clues.length === 0 ? null : (
            <View style={styles.section}>
                <Text style={styles.heading} accessibilityRole="header" maxFontSizeMultiplier={FontScaleCap.chrome}>
                    {title}
                </Text>
                {clues.map((c) => (
                    <View
                        key={`${dir}-${c.number}`}
                        style={styles.clueRow}
                        accessible
                        accessibilityLabel={`${c.number} ${dir}: ${c.clue}. Answer ${c.answer.toUpperCase()}, solved`}
                        testID={`solved-clue-${dir.toLowerCase()}-${c.number}`}
                    >
                        <Text style={styles.num}>{c.number}</Text>
                        <Text style={styles.clue} maxFontSizeMultiplier={FontScaleCap.chrome}>{c.clue}</Text>
                        <Text style={styles.answer} maxFontSizeMultiplier={FontScaleCap.chrome}>
                            ✓ {c.answer.toUpperCase()}
                        </Text>
                    </View>
                ))}
            </View>
        );
    return (
        <View testID="crossword-solved-board">
            <Crossword puzzle={puzzle} gameState={state} onCellChange={noop} disabled staticCellSize={cell} />
            {section('Across', 'Across', puzzle.clues.across)}
            {section('Down', 'Down', puzzle.clues.down)}
        </View>
    );
}

const styles = StyleSheet.create({
    section: { marginHorizontal: 16, marginTop: 12 },
    heading: { fontSize: 13, fontWeight: '700', color: StateColors.ink, marginBottom: 4, textTransform: 'uppercase' },
    clueRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4, minHeight: 32 },
    num: { width: 26, fontSize: 14, lineHeight: 22, fontWeight: '700', color: StateColors.ink },
    clue: { flex: 1, fontSize: 14, lineHeight: 22, color: StateColors.ink },
    answer: { fontSize: 14, lineHeight: 22, fontWeight: '700', color: StateColors.found, marginLeft: 8 },
});
