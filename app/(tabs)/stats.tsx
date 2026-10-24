import { DistributionChart } from '@/components/stats/DistributionChart';
import { GameBreakdown } from '@/components/stats/GameBreakdown';
import { StreakCalendar } from '@/components/stats/StreakCalendar';
import { TrendChart } from '@/components/stats/TrendChart';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { GameTypeBadge } from '@/components/ui/GameTypeBadge';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { UpsellCard } from '@/components/ui/UpsellCard';
import { Colors, Layout, Spacing, TFL, Typography } from '@/constants/theme';
import { useGameHistory } from '@/hooks/useGameHistory';
import { useTodaysNextGame } from '@/hooks/useTodaysNextGame';
import { formatMaybe, formatScore } from '@/lib/display-utils';
import { bestTime, currentStreak, filterHistory, streakDates, type StatsSegment } from '@/lib/stats';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SEGMENTS: { value: StatsSegment; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'connections', label: 'Connections' },
    { value: 'crossword', label: 'Crossword' },
];
const SEGMENT_NAME: Record<StatsSegment, string> = { all: 'All games', connections: 'Connections', crossword: 'Crossword' };
const HISTORY_PREVIEW = 10;

function formatDate(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Tile {
    label: string;
    value: string;
    a11y: string;
}

/** Per-segment summary tiles (TUB-260). No combined best time in All. */
export function buildTiles(history: ReturnType<typeof filterHistory>, segment: StatsSegment, now?: Date): Tile[] {
    const rows = filterHistory(history, segment);
    const streak = currentStreak(streakDates(history, segment), now);
    const best = bestTime(rows);
    const bestValue = formatMaybe(best, formatScore);
    const bestA11y = best == null ? 'Best time, none yet' : `Best time, ${Math.floor(best / 60)} minutes ${best % 60} seconds`;
    if (segment === 'all') {
        return [
            { label: 'Games played', value: String(rows.length), a11y: `Games played, ${rows.length}` },
            { label: 'Day streak', value: String(streak), a11y: `Day streak, ${streak}` },
        ];
    }
    const playedLabel = segment === 'crossword' ? 'Puzzles solved' : 'Games played';
    const streakLabel = segment === 'crossword' ? 'Solve streak' : 'Win streak';
    const played = segment === 'crossword' ? rows.filter((r) => r.result === 'win').length : rows.length;
    return [
        { label: playedLabel, value: String(played), a11y: `${playedLabel}, ${played}` },
        { label: streakLabel, value: String(streak), a11y: `${streakLabel}, ${streak}` },
        { label: 'Best time', value: bestValue, a11y: bestA11y },
    ];
}

export default function StatsScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { history, loading } = useGameHistory();
    const [segment, setSegment] = useState<StatsSegment>('all');
    const [showAll, setShowAll] = useState(false);
    const playAny = useTodaysNextGame();
    const playConnections = useTodaysNextGame('connections');
    const playCrossword = useTodaysNextGame('crossword');

    const changeSegment = (next: StatsSegment) => {
        setSegment(next);
        setShowAll(false);
        AccessibilityInfo.announceForAccessibility?.(`Showing ${SEGMENT_NAME[next]} stats`);
    };

    const hasNoHistory = !loading && history.length === 0;
    const rows = filterHistory(history, segment);
    const tiles = buildTiles(history, segment);
    const visibleRows = showAll ? rows : rows.slice(0, HISTORY_PREVIEW);
    const isPremium = !!user?.isPremium;

    const renderSegmentEmpty = () => {
        if (segment === 'crossword' && !isPremium) {
            return (
                <UpsellCard
                    testID="stats-crossword-upsell"
                    title="Crossword Puzzle"
                    valueProp="See your Crossword rank and the full weekly board"
                    onPress={() => router.push('/subscribe')}
                />
            );
        }
        const name = SEGMENT_NAME[segment];
        return (
            <EmptyState
                testID="stats-segment-empty"
                icon="bar-chart"
                title={`No ${name} games yet`}
                body={`Play today's ${name} to start tracking your times here.`}
                actionLabel="Play now"
                onAction={segment === 'crossword' ? playCrossword : playConnections}
            />
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <ScreenHeader title="Stats" />

                {hasNoHistory ? (
                    <EmptyState
                        testID="stats-empty"
                        icon="bar-chart"
                        title="No games yet"
                        body="Solve a puzzle on your next journey and your times, streaks and scores will appear here."
                        actionLabel="Play now"
                        onAction={playAny}
                    />
                ) : (
                    <>
                        <View style={styles.control}>
                            <SegmentedControl testID="stats-segment" segments={SEGMENTS} value={segment} onChange={changeSegment} />
                        </View>

                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={TFL.blue} />
                            </View>
                        ) : rows.length === 0 ? (
                            renderSegmentEmpty()
                        ) : (
                            <>
                                <Card variant="tinted" style={styles.summary} testID="stats-summary">
                                    {tiles.map((t, i) => (
                                        <React.Fragment key={t.label}>
                                            {i > 0 && <View style={styles.summaryDivider} />}
                                            <View style={styles.summaryItem} accessible accessibilityLabel={t.a11y}>
                                                <Text style={styles.summaryValue}>{t.value}</Text>
                                                <Text style={styles.summaryLabel}>{t.label}</Text>
                                            </View>
                                        </React.Fragment>
                                    ))}
                                </Card>

                                <TrendChart history={history} segment={segment} />

                                {segment === 'all' && (
                                    <GameBreakdown
                                        history={history}
                                        isPremium={isPremium}
                                        onSelect={changeSegment}
                                        onUpgrade={() => router.push('/subscribe')}
                                    />
                                )}

                                <StreakCalendar history={history} segment={segment} />

                                {segment !== 'all' && <DistributionChart history={history} game={segment} />}

                                <View style={styles.historySection}>
                                    <Text style={styles.sectionHeader} accessibilityRole="header">
                                        GAME HISTORY
                                    </Text>
                                    <Card variant="tinted">
                                        {visibleRows.map((item, index) => (
                                            <React.Fragment key={item.id}>
                                                {index > 0 && <View style={styles.divider} />}
                                                <View style={styles.historyRow}>
                                                    {segment === 'all' && <GameTypeBadge gameType={item.gameType} />}
                                                    <View style={styles.historyMiddle}>
                                                        <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                                                        <Text style={styles.historyTime}>{formatScore(item.score)}</Text>
                                                    </View>
                                                    <View style={styles.historyRight}>
                                                        <Text
                                                            style={[
                                                                styles.historyResult,
                                                                item.result === 'win' ? styles.resultWin : styles.resultLoss,
                                                            ]}
                                                        >
                                                            {item.result === 'win' ? 'Win' : 'Loss'}
                                                        </Text>
                                                        <Text style={styles.historyPoints}>{item.points} pts</Text>
                                                    </View>
                                                </View>
                                            </React.Fragment>
                                        ))}
                                        {rows.length > HISTORY_PREVIEW && !showAll && (
                                            <Pressable
                                                onPress={() => setShowAll(true)}
                                                accessibilityRole="button"
                                                style={styles.showAll}
                                                testID="history-show-all"
                                            >
                                                <Text style={styles.showAllText}>Show all ({rows.length})</Text>
                                            </Pressable>
                                        )}
                                    </Card>
                                </View>
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: Layout.screenPadding, paddingBottom: Spacing.md },
    control: { marginBottom: Spacing.lg },
    loadingContainer: { paddingVertical: Spacing.xxl, alignItems: 'center' },
    summary: { flexDirection: 'row', alignItems: 'center' },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: Colors.light.border },
    summaryValue: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
    summaryLabel: { ...Typography.caption, fontSize: 12, textAlign: 'center', color: TFL.grey.dark },
    historySection: { marginTop: Spacing.lg },
    sectionHeader: { ...Typography.label, marginBottom: Spacing.sm },
    historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
    historyMiddle: { flex: 1 },
    historyDate: { ...Typography.body, fontWeight: '600', marginBottom: 2 },
    historyTime: { ...Typography.caption, fontSize: 13 },
    historyRight: { alignItems: 'flex-end' },
    historyResult: { ...Typography.body, fontWeight: '700', marginBottom: 2 },
    resultWin: { color: TFL.green },
    resultLoss: { color: TFL.red },
    historyPoints: { ...Typography.caption, fontSize: 13 },
    divider: { height: 1, backgroundColor: Colors.light.border, marginVertical: Spacing.xs },
    showAll: { paddingTop: Spacing.md, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
    showAllText: { fontSize: 14, fontWeight: '600', color: TFL.blue },
});
