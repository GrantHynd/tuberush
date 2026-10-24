import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, TFL } from '@/constants/theme';
import { mistakeDistribution, timeDistribution, type DistributionBucket } from '@/lib/stats';
import type { GameHistoryEntry } from '@/lib/game-history';
import type { GameType } from '@/types/game';
import { ListToggle } from './ListToggle';
import { StatsSection, sectionStyles } from './StatsSection';

export function DistributionChart({ history, game }: { history: GameHistoryEntry[]; game: GameType }) {
    const [asList, setAsList] = useState(false);
    const isConnections = game === 'connections';
    const { buckets, recorded } = isConnections
        ? mistakeDistribution(history)
        : { buckets: timeDistribution(history), recorded: -1 };
    const total = buckets.reduce((a, b) => a + b.count, 0);
    const max = Math.max(1, ...buckets.map((b) => b.count));
    const title = isConnections ? 'Mistakes per game' : 'Solve times';

    return (
        <StatsSection
            title={title}
            caption={isConnections && recorded >= 0 ? 'Games from before mistakes were saved aren’t included' : undefined}
            testID="stats-distribution"
            right={total > 0 ? <ListToggle asList={asList} onToggle={() => setAsList((v) => !v)} /> : null}
        >
            {total === 0 ? (
                <Text style={sectionStyles.empty}>Finish a game to see your distribution.</Text>
            ) : (
                buckets.map((b: DistributionBucket) =>
                    asList ? (
                        <View key={b.label} style={sectionStyles.listRow}>
                            <Text style={sectionStyles.listText}>{b.accessibilityLabel.split(',')[0]}</Text>
                            <Text style={sectionStyles.listText}>{b.count}</Text>
                        </View>
                    ) : (
                        <View key={b.label} style={styles.row} accessible accessibilityLabel={b.accessibilityLabel}>
                            <Text style={[styles.label, b.isLatest && styles.latest]}>{b.label}</Text>
                            <View style={styles.barTrack}>
                                <View style={[styles.bar, { width: `${(b.count / max) * 100}%` }]} />
                            </View>
                            <Text style={[styles.count, b.isLatest && styles.latest]}>{b.count}</Text>
                        </View>
                    ),
                )
            )}
        </StatsSection>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs, gap: Spacing.sm },
    label: { width: 44, fontSize: 12, color: TFL.grey.dark },
    latest: { fontWeight: '700', color: Colors.light.text },
    barTrack: { flex: 1, height: 16 },
    bar: { height: 16, minWidth: 2, backgroundColor: TFL.blue, borderRadius: Radius.sm },
    count: { width: 28, fontSize: 12, color: TFL.grey.dark, textAlign: 'right' },
});
