import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { UpsellCard } from '@/components/ui/UpsellCard';
import { Colors, GameColors, Radius, Spacing, TFL } from '@/constants/theme';
import { formatMaybe, formatScore } from '@/lib/display-utils';
import { averageTime, bestTime, currentStreak, filterHistory, streakDates, TREND_DAYS, withinDays } from '@/lib/stats';
import type { GameHistoryEntry } from '@/lib/game-history';
import type { GameType } from '@/types/game';
import { StatsSection } from './StatsSection';

const ROWS: { game: GameType; name: string }[] = [
    { game: 'connections', name: 'Connections' },
    { game: 'crossword', name: 'Crossword' },
];

export function GameBreakdown({
    history,
    isPremium,
    onSelect,
    onUpgrade,
    now,
}: {
    history: GameHistoryEntry[];
    isPremium: boolean;
    onSelect: (game: GameType) => void;
    onUpgrade: () => void;
    now?: Date;
}) {
    return (
        <StatsSection title="By game" testID="stats-breakdown">
            {ROWS.map(({ game, name }, i) => {
                const rows = filterHistory(history, game);
                if (game === 'crossword' && !isPremium && rows.length === 0) {
                    return (
                        <View key={game} style={i > 0 && styles.spaced}>
                            <UpsellCard
                                title="Crossword Puzzle"
                                valueProp="See your Crossword rank and the full weekly board"
                                onPress={onUpgrade}
                                testID="breakdown-upsell"
                            />
                        </View>
                    );
                }
                const best = bestTime(rows);
                const avg = averageTime(withinDays(rows, TREND_DAYS, now));
                const streak = currentStreak(streakDates(history, game), now);
                const label = `${name}: ${rows.length} played, best ${formatMaybe(best, formatScore)}, average ${formatMaybe(avg, formatScore)}, streak ${streak}`;
                return (
                    <Pressable
                        key={game}
                        onPress={() => onSelect(game)}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        accessibilityHint={`Show ${name} stats`}
                        style={[styles.row, i > 0 && styles.divider]}
                        testID={`breakdown-${game}`}
                    >
                        <View style={[styles.swatch, { backgroundColor: GameColors[game] }]} />
                        <View style={styles.main}>
                            <Text style={styles.name}>{name}</Text>
                            <Text style={styles.meta}>
                                {rows.length} played · Best {formatMaybe(best, formatScore)} · Avg {formatMaybe(avg, formatScore)} · Streak {streak}
                            </Text>
                        </View>
                        <MaterialIcons name="chevron-right" size={20} color={TFL.grey.dark} />
                    </Pressable>
                );
            })}
        </StatsSection>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.s12, gap: Spacing.s12, minHeight: 48 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.light.border },
    spaced: { marginTop: Spacing.s12 },
    swatch: { width: 12, height: 12, borderRadius: Radius.sm },
    main: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: Colors.light.text },
    meta: { fontSize: 12, color: TFL.grey.dark, marginTop: 2 },
});
