import { useTheme } from '@/hooks/useTheme';
import { decorativeIconProps } from '@/lib/a11y';
import { Card } from '@/components/ui/Card';
import { type Palette, FontFamily, Radius, Spacing, Typography } from '@/constants/theme';
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
    connections: { name: 'Interchange', icon: 'hub' as const, fill: 'gameInterchange' as const, ink: 'onGameInterchange' as const },
    crossword: { name: 'Crossword', icon: 'grid-on' as const, fill: 'gameCrossword' as const, ink: 'onGameCrossword' as const },
};

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
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
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
                              style={({ pressed }) => [
                                  styles.row,
                                  i > 0 && styles.divider,
                                  !row.onPress && styles.rowDisabled,
                                  pressed && row.onPress && { opacity: 0.85 },
                              ]}
                          >
                              <View style={[styles.swatch, { backgroundColor: colors[meta.fill] }]}>
                                  <MaterialIcons
                                      name={meta.icon}
                                      size={22}
                                      color={colors[meta.ink]}
                                      {...decorativeIconProps}
                                  />
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
                                  <MaterialIcons name="check-circle" size={28} color={colors.success} testID="today-hero-tick" />
                              ) : null}
                          </Pressable>
                      );
                  })}
        </Card>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    card: { marginTop: Spacing.lg },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    title: { ...Typography.h3, color: colors.text },
    caption: { fontSize: 13, color: colors.textSecondary },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.s12, gap: Spacing.s12, minHeight: 64 },
    rowDisabled: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 8 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
    swatch: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, minWidth: 0 },
    gameName: { ...Typography.body, fontFamily: FontFamily.semibold, fontWeight: '600', color: colors.text },
    cta: {
        minWidth: 88,
        minHeight: 44,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaOutlined: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
    ctaText: { color: colors.onPrimary, fontWeight: '600', fontSize: 16 },
    ctaTextOutlined: { color: colors.primary },
    skeleton: { backgroundColor: colors.border },
    skeletonLine: { height: 12, borderRadius: Radius.sm, backgroundColor: colors.border },
});
}

