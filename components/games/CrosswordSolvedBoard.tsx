import { Crossword } from '@/components/games/Crossword';
import { FontScaleCap } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CrosswordClue, CrosswordPuzzle, CrosswordState } from '@/types/game';
import React from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const noop = () => {};

/** Finished-crossword board (TUB-300): the filled grid plus every clue ticked with its answer. */
export function CrosswordSolvedBoard({ puzzle, state }: { puzzle: CrosswordPuzzle; state: CrosswordState }) {
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const n = Math.max(state.grid.length, state.grid[0]?.length ?? 0, 1);
    // Mockup uses 52pt for a 5x5; shrink for larger grids so the clues stay in view.
    const cell = Math.max(28, Math.min(52, Math.floor((Math.min(width - 32, 300) - (n + 1)) / n)));
    const section = (title: string, dir: 'Across' | 'Down', clues: CrosswordClue[]) =>
        clues.length === 0 ? null : (
            <View style={styles.section}>
                <Text style={[styles.heading, { color: colors.text }]} accessibilityRole="header" maxFontSizeMultiplier={FontScaleCap.chrome}>
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
                        <Text style={[styles.num, { color: colors.text }]}>{c.number}</Text>
                        <Text style={[styles.clue, { color: colors.text }]} maxFontSizeMultiplier={FontScaleCap.chrome}>{c.clue}</Text>
                        <Text style={[styles.answer, { color: colors.primary }]} maxFontSizeMultiplier={FontScaleCap.chrome}>
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
    heading: { fontSize: 13, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
    clueRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4, minHeight: 32 },
    num: { width: 26, fontSize: 14, lineHeight: 22, fontWeight: '700' },
    clue: { flex: 1, fontSize: 14, lineHeight: 22 },
    answer: { fontSize: 14, lineHeight: 22, fontWeight: '700', marginLeft: 8 },
});
