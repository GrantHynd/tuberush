import { Card } from '@/components/ui/Card';
import { GameTypeBadge } from '@/components/ui/GameTypeBadge';
import { Colors, Layout, Spacing, TFL, Typography } from '@/constants/theme';
import { useGameHistory } from '@/hooks/useGameHistory';
import { useUserStats } from '@/hooks/useUserStats';
import { formatMaybe, formatScore } from '@/lib/display-utils';
import React from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StatsScreen() {
    const { stats, loading: statsLoading } = useUserStats();
    const { history, gamesPlayed, loading: historyLoading } = useGameHistory();

    const loading = statsLoading || historyLoading;

    function formatDate(dateString: string): string {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.title}>Stats</Text>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={TFL.blue} />
                    </View>
                ) : (
                    <>
                        <View style={styles.statsRow}>
                            <Card variant="tinted" style={styles.statCard} accessible>
                                <Text style={styles.statValue}>{gamesPlayed}</Text>
                                <Text style={styles.statLabel}>Games Played</Text>
                            </Card>
                            <Card variant="tinted" style={styles.statCard} accessible>
                                <Text style={styles.statValue}>{stats.streak}</Text>
                                <Text style={styles.statLabel}>Win Streak</Text>
                            </Card>
                            <Card variant="tinted" style={styles.statCard} accessible>
                                <Text style={styles.statValue}>{formatMaybe(stats.bestTime)}</Text>
                                <Text style={styles.statLabel}>Best Time</Text>
                            </Card>
                        </View>

                        <View style={styles.historySection}>
                            <Text style={styles.sectionHeader}>GAME HISTORY</Text>
                            <Card variant="tinted">
                                {history.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No games played yet</Text>
                                        <Text style={styles.emptySubtext}>
                                            Start playing to track your stats!
                                        </Text>
                                    </View>
                                ) : (
                                    <>
                                        <FlatList
                                            data={history}
                                            keyExtractor={item => item.id}
                                            renderItem={({ item, index }) => (
                                                <>
                                                    {index > 0 && <View style={styles.divider} />}
                                                    <View style={styles.historyRow}>
                                                        <GameTypeBadge gameType={item.gameType} />
                                                        <View style={styles.historyMiddle}>
                                                            <Text style={styles.historyDate}>
                                                                {formatDate(item.date)}
                                                            </Text>
                                                            <Text style={styles.historyTime}>
                                                                {formatScore(item.score)}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.historyRight}>
                                                            <Text
                                                                style={[
                                                                    styles.historyResult,
                                                                    item.result === 'win'
                                                                        ? styles.resultWin
                                                                        : styles.resultLoss,
                                                                ]}
                                                            >
                                                                {item.result === 'win' ? 'Win' : 'Loss'}
                                                            </Text>
                                                            <Text style={styles.historyPoints}>
                                                                {item.points} pts
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </>
                                            )}
                                            scrollEnabled={false}
                                        />
                                        <View style={styles.footer}>
                                            <Text style={styles.footerText}>More stats coming soon</Text>
                                        </View>
                                    </>
                                )}
                            </Card>
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.md,
    },
    title: {
        ...Typography.h1,
        marginBottom: Spacing.lg,
    },
    loadingContainer: {
        paddingVertical: Spacing.xxl,
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: Layout.cardGap,
        marginBottom: Spacing.lg,
    },
    statCard: {
        flex: 1,
        minHeight: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        ...Typography.h1,
        fontSize: 36,
        marginBottom: Spacing.xs,
    },
    statLabel: {
        ...Typography.caption,
        fontSize: 12,
        textAlign: 'center',
    },
    historySection: {
        flex: 1,
    },
    sectionHeader: {
        ...Typography.label,
        marginBottom: Spacing.sm,
    },
    emptyState: {
        paddingVertical: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.body,
        fontWeight: '600',
        marginBottom: Spacing.xs,
    },
    emptySubtext: {
        ...Typography.caption,
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    historyMiddle: {
        flex: 1,
    },
    historyDate: {
        ...Typography.body,
        fontWeight: '600',
        marginBottom: 2,
    },
    historyTime: {
        ...Typography.caption,
        fontSize: 13,
    },
    historyRight: {
        alignItems: 'flex-end',
    },
    historyResult: {
        ...Typography.body,
        fontWeight: '700',
        marginBottom: 2,
    },
    resultWin: {
        color: TFL.green,
    },
    resultLoss: {
        color: TFL.red,
    },
    historyPoints: {
        ...Typography.caption,
        fontSize: 13,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.light.border,
        marginVertical: Spacing.xs,
    },
    footer: {
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xs,
        alignItems: 'center',
    },
    footerText: {
        ...Typography.caption,
        fontSize: 12,
    },
});
