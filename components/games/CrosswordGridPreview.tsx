import type { CrosswordCell } from '@/types/game';
import { TFL } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface CrosswordGridPreviewProps {
    grid: CrosswordCell[][];
    size?: number;
}

/**
 * Renders a tiny greyed-out crossword grid thumbnail for the history list.
 * Each cell is a 2-3px square; black cells are dark, filled cells are medium grey.
 */
export const CrosswordGridPreview = React.memo(function CrosswordGridPreview({
    grid,
    size = 36,
}: CrosswordGridPreviewProps) {
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    if (rows === 0 || cols === 0) return null;

    const cellSize = Math.max(2, Math.floor(size / Math.max(rows, cols)));
    const totalWidth = cellSize * cols;
    const totalHeight = cellSize * rows;

    return (
        <View style={[styles.container, { width: totalWidth, height: totalHeight }]}>
            {grid.map((row, r) => (
                <View key={r} style={styles.row}>
                    {row.map((cell, c) => (
                        <View
                            key={c}
                            style={[
                                styles.cell,
                                { width: cellSize, height: cellSize },
                                cell.isBlack ? styles.blackCell : styles.whiteCell,
                            ]}
                        />
                    ))}
                </View>
            ))}
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        borderRadius: 2,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        borderWidth: 0.25,
        borderColor: TFL.grey.medium,
    },
    blackCell: {
        backgroundColor: '#333',
    },
    whiteCell: {
        backgroundColor: TFL.grey.light,
    },
});
