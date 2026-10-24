import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { Colors, GameColors, Spacing, TFL } from '@/constants/theme';
import { formatScore } from '@/lib/display-utils';
import { lastNDays, rollingAverage, TREND_DAYS, trendSeries, trendSummary, type StatsSegment, type TrendPoint } from '@/lib/stats';
import type { GameHistoryEntry } from '@/lib/game-history';
import type { GameType } from '@/types/game';
import { ListToggle } from './ListToggle';
import { StatsSection, sectionStyles } from './StatsSection';

const HEIGHT = 160;
const PAD = { left: 40, right: 8, top: 8, bottom: 20 };
const SERIES: { game: GameType; color: string; label: string; shape: 'circle' | 'square' }[] = [
    { game: 'connections', color: GameColors.connections, label: 'Connections', shape: 'circle' },
    { game: 'crossword', color: GameColors.crossword, label: 'Crossword', shape: 'square' },
];

function formatDay(date: string): string {
    return new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Split into runs of consecutive days so unplayed days leave gaps. */
function runs(points: TrendPoint[], dayIndex: Map<string, number>): TrendPoint[][] {
    const out: TrendPoint[][] = [];
    for (const p of points) {
        const last = out[out.length - 1];
        const prev = last?.[last.length - 1];
        if (prev && dayIndex.get(p.date)! - dayIndex.get(prev.date)! === 1) last.push(p);
        else out.push([p]);
    }
    return out;
}

export function TrendChart({ history, segment, now }: { history: GameHistoryEntry[]; segment: StatsSegment; now?: Date }) {
    const [width, setWidth] = useState(0);
    const [asList, setAsList] = useState(false);
    const [selected, setSelected] = useState<{ game: GameType; point: TrendPoint } | null>(null);

    const shown = SERIES.filter((s) => segment === 'all' || s.game === segment);
    const series = shown.map((s) => ({ ...s, points: trendSeries(history, s.game, now) }));
    const all = series.flatMap((s) => s.points);
    const enough = series.some((s) => s.points.length >= 2);
    const days = lastNDays(TREND_DAYS, now);
    const dayIndex = new Map(days.map((d, i) => [d, i]));
    const avg = segment !== 'all' && series[0] ? rollingAverage(series[0].points) : [];

    const maxS = Math.max(60, ...all.map((p) => p.seconds));
    const plotW = Math.max(1, width - PAD.left - PAD.right);
    const plotH = HEIGHT - PAD.top - PAD.bottom;
    const x = (d: string) => PAD.left + (dayIndex.get(d)! / (TREND_DAYS - 1)) * plotW;
    // 0:00 on the baseline: faster times sit lower ("Lower is faster").
    const y = (s: number) => PAD.top + (1 - s / maxS) * plotH;
    const summary = `Solve time, last ${TREND_DAYS} days: ${trendSummary(segment === 'all' ? all : series[0]?.points ?? [])}`;

    return (
        <StatsSection
            title="Solve-time trend"
            caption="Lower is faster"
            testID="stats-trend"
            right={enough ? <ListToggle asList={asList} onToggle={() => setAsList((v) => !v)} testID="trend-list-toggle" /> : null}
        >
            {!enough ? (
                <Text style={sectionStyles.empty}>Play a couple more games to see your trend.</Text>
            ) : asList ? (
                <View testID="trend-list">
                    {series.flatMap((s) =>
                        [...s.points].reverse().map((p) => (
                            <View key={s.game + p.date} style={sectionStyles.listRow}>
                                <Text style={sectionStyles.listText}>
                                    {formatDay(p.date)}
                                    {segment === 'all' ? ` · ${s.label}` : ''}
                                </Text>
                                <Text style={sectionStyles.listText}>{formatScore(p.seconds)}</Text>
                            </View>
                        )),
                    )}
                </View>
            ) : (
                <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} accessible accessibilityLabel={summary}>
                    {width > 0 ? (
                        <Svg width={width} height={HEIGHT}>
                            {[0, 0.5, 1].map((f) => (
                                <React.Fragment key={f}>
                                    <Line x1={PAD.left} x2={width - PAD.right} y1={PAD.top + f * plotH} y2={PAD.top + f * plotH} stroke={Colors.light.border} strokeWidth={1} />
                                    <SvgText x={PAD.left - 6} y={PAD.top + f * plotH + 4} fontSize={12} fill={TFL.grey.dark} textAnchor="end">
                                        {formatScore(Math.round((1 - f) * maxS))}
                                    </SvgText>
                                </React.Fragment>
                            ))}
                            {avg.length >= 2 && (
                                <Polyline points={avg.map((p) => `${x(p.date)},${y(p.seconds)}`).join(' ')} fill="none" stroke={TFL.grey.dark} strokeWidth={1.5} strokeDasharray="4,4" />
                            )}
                            {series.map((s) =>
                                runs(s.points, dayIndex).map((run, i) =>
                                    run.length > 1 ? (
                                        <Polyline key={`${s.game}-${i}`} points={run.map((p) => `${x(p.date)},${y(p.seconds)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2} />
                                    ) : null,
                                ),
                            )}
                            {series.flatMap((s) =>
                                s.points.map((p) =>
                                    s.shape === 'circle' ? (
                                        <Circle key={s.game + p.date} cx={x(p.date)} cy={y(p.seconds)} r={4} fill={s.color} onPress={() => setSelected({ game: s.game, point: p })} />
                                    ) : (
                                        <Rect key={s.game + p.date} x={x(p.date) - 4} y={y(p.seconds) - 4} width={8} height={8} fill={s.color} onPress={() => setSelected({ game: s.game, point: p })} />
                                    ),
                                ),
                            )}
                        </Svg>
                    ) : (
                        <View style={{ height: HEIGHT }} />
                    )}
                    {selected ? (
                        <Pressable onPress={() => setSelected(null)} accessibilityRole="button">
                            <Text style={styles.tooltip} testID="trend-tooltip">
                                {formatDay(selected.point.date)} · {formatScore(selected.point.seconds)}
                            </Text>
                        </Pressable>
                    ) : null}
                    {segment === 'all' ? (
                        <View style={styles.legend}>
                            {series.map((s) => (
                                <View key={s.game} style={styles.legendItem}>
                                    <View style={[styles.swatch, { backgroundColor: s.color, borderRadius: s.shape === 'circle' ? 5 : 1 }]} />
                                    <Text style={sectionStyles.listText}>{s.label}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}
                </View>
            )}
        </StatsSection>
    );
}

const styles = StyleSheet.create({
    tooltip: { fontSize: 12, fontWeight: '600', color: Colors.light.text, marginTop: Spacing.xs },
    legend: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    swatch: { width: 10, height: 10 },
});
