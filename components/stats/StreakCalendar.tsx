import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, TFL } from '@/constants/theme';
import { bestStreak, calendarWeeks, currentStreak, streakDates, type StatsSegment } from '@/lib/stats';
import type { GameHistoryEntry } from '@/lib/game-history';
import { StatsSection } from './StatsSection';

const CELL = 14;
const GAP = 3;

export function StreakCalendar({ history, segment, now }: { history: GameHistoryEntry[]; segment: StatsSegment; now?: Date }) {
    const weeks = calendarWeeks(history, segment, now);
    const dates = streakDates(history, segment);
    const current = currentStreak(dates, now);
    const best = bestStreak(dates);
    const playedCount = weeks.flat().filter((c) => c.played).length;
    const months = weeks.map((w, i) => {
        const m = new Date(w[0].date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short' });
        const prev = i > 0 ? new Date(weeks[i - 1][0].date + 'T12:00:00').toLocaleDateString('en-GB', { month: 'short' }) : null;
        return m !== prev ? m : '';
    });
    const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

    return (
        <StatsSection title="Streak calendar" testID="stats-calendar">
            <Text style={styles.summary}>
                Current streak {plural(current)} · Best {plural(best)}
            </Text>
            <View accessible accessibilityLabel={`Last 12 weeks: played on ${plural(playedCount)}. Current streak ${plural(current)}, best ${plural(best)}.`}>
                <View style={styles.months}>
                    {months.map((m, i) => (
                        <Text key={i} style={styles.month} numberOfLines={1}>
                            {m}
                        </Text>
                    ))}
                </View>
                <View style={styles.grid}>
                    {weeks.map((week, wi) => (
                        <View key={wi} style={styles.column}>
                            {week.map((c) => (
                                <View
                                    key={c.date}
                                    testID={c.played ? 'calendar-played' : undefined}
                                    style={[
                                        styles.cell,
                                        c.played ? styles.played : styles.unplayed,
                                        c.isToday && !c.played && styles.today,
                                        c.isFuture && styles.future,
                                    ]}
                                >
                                    {c.both ? <View style={styles.dot} testID="calendar-both" /> : null}
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </View>
        </StatsSection>
    );
}

const styles = StyleSheet.create({
    summary: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: Spacing.sm },
    months: { flexDirection: 'row', gap: GAP, marginBottom: 2 },
    month: { width: CELL, fontSize: 12, color: TFL.grey.dark, overflow: 'visible' },
    grid: { flexDirection: 'row', gap: GAP },
    column: { gap: GAP },
    cell: { width: CELL, height: CELL, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
    unplayed: { backgroundColor: Colors.light.card, borderWidth: 1, borderColor: Colors.light.border },
    played: { backgroundColor: TFL.blue },
    today: { borderWidth: 2, borderColor: TFL.blue },
    future: { opacity: 0 },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
});
