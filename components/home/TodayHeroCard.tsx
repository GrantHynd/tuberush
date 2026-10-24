import { Card } from '@/components/ui/Card';
import { Colors, GameColors, Radius, Spacing, TFL, Typography } from '@/constants/theme';
import { formatCountdown, type TodayGameRow, type TodayRowState } from '@/lib/today-puzzles';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface TodayHeroCardProps {
    rows: TodayGameRow[];
    /** Shown when every row is completed. */
    nextPuzzleAt?: Date;
    loading?: boolean;
}

const GAME_META = {
    connections: { name: 'Connections', icon: 'hub', color: GameColors.connections },
    crossword: { name: 'Crossword', icon: 'grid-on', color: GameColors.crossword },
} as const;

const CTA: Partial<Record<TodayRowState, { label: string; outlined?: boolean }>> = {
    unplayed: { label: 'Play' },
    inProgress: { label: 'Resume' },
    signedOut: { label: 'Sign in' },
    locked: { label: 'Unlock', outlined: true },
};

function useMinuteTick(enabled: boolean): Date {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        if (!enabled) return;
        const id = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(id);
    }, [enabled]);
    return now;
}

function todayCaption(now: Date): string {
    return now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function TodayHeroCard({ rows, nextPuzzleAt, loading }: TodayHeroCardProps) {
    const allDone = !loading && rows.length > 0 && rows.every((r) => r.state === 'completed');
    const anyDone = rows.some((r) => r.state === 'completed');
    const now = useMinuteTick(!!nextPuzzleAt && anyDone);
    const countdown = nextPuzzleAt ? formatCountdown(nextPuzzleAt, now) : null;

    return (
        <Card variant="outlined" style={styles.card} testID="today-hero">
            <View style={styles.titleRow}>
                <Text style={styles.title} accessibilityRole="header">
                    {"Today's puzzles"}
                </Text>
                <Text style={styles.caption}>{todayCaption(now)}</Text>
            </View>
            {allDone && countdown && (
                <Text
                    style={styles.caption}
                    testID="today-hero-next"
                    accessibilityLabel={`Next puzzles in ${countdown.label}`}
                >
                    Next puzzles in {countdown.text}
                </Text>
            )}
            {loading
                ? [0, 1].map((i) => (
                      <View key={i} style={[styles.row, i > 0 && styles.divider]} testID="today-hero-skeleton">
                          <View style={[styles.swatch, styles.skeleton]} />
                          <View style={styles.rowText}>
                              <View style={[styles.skeletonLine, { width: '50%' }]} />
                              <View style={[styles.skeletonLine, { width: '70%', marginTop: 6 }]} />
                          </View>
                      </View>
                  ))
                : rows.map((row, i) => {
                      const meta = GAME_META[row.gameType];
                      const cta = CTA[row.state];
                      const showNext = row.state === 'completed' && !allDone && countdown;
                      const parts = [meta.name, 'today', row.statusText];
                      if (showNext) parts.push(`next puzzle in ${countdown!.label}`);
                      if (cta) parts.push(cta.label);
                      return (
                          <Pressable
                              key={row.gameType}
                              testID={`today-hero-${row.gameType}`}
                              onPress={row.onPress}
                              disabled={!row.onPress}
                              accessibilityRole="button"
                              accessibilityLabel={parts.join(', ')}
                              accessibilityState={{ disabled: !row.onPress }}
                              style={({ pressed }) => [styles.row, i > 0 && styles.divider, pressed && { opacity: 0.85 }]}
                          >
                              <View style={[styles.swatch, { backgroundColor: meta.color }]}>
                                  <MaterialIcons name={meta.icon} size={22} color="white" />
                              </View>
                              <View style={styles.rowText}>
                                  <Text style={styles.gameName}>{meta.name}</Text>
                                  <Text style={styles.caption} numberOfLines={1}>
                                      {row.statusText}
                                  </Text>
                                  {showNext && (
                                      <Text style={styles.caption}>Next puzzle in {countdown!.text}</Text>
                                  )}
                              </View>
                              {cta ? (
                                  <View style={[styles.cta, cta.outlined && styles.ctaOutlined]}>
                                      <Text style={[styles.ctaText, cta.outlined && styles.ctaTextOutlined]}>
                                          {cta.label}
                                      </Text>
                                  </View>
                              ) : row.state === 'completed' ? (
                                  <MaterialIcons name="check-circle" size={28} color={TFL.green} testID="today-hero-tick" />
                              ) : null}
                          </Pressable>
                      );
                  })}
        </Card>
    );
}

const styles = StyleSheet.create({
    card: { marginTop: Spacing.lg },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    title: { ...Typography.h3 },
    caption: { fontSize: 13, color: TFL.grey.dark },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.s12, gap: Spacing.s12, minHeight: 64 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.light.border },
    swatch: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, minWidth: 0 },
    gameName: { ...Typography.body, fontWeight: '600' },
    cta: {
        minWidth: 88,
        minHeight: 44,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.md,
        backgroundColor: TFL.blue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaOutlined: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: TFL.blue },
    ctaText: { color: 'white', fontWeight: '600', fontSize: 16 },
    ctaTextOutlined: { color: TFL.blue },
    skeleton: { backgroundColor: '#E5E7EB' },
    skeletonLine: { height: 12, borderRadius: Radius.sm, backgroundColor: '#E5E7EB' },
});
