import { GamePuzzleListItem } from '@/components/games/GamePuzzleListItem';
import { GameHistoryStatsBar } from '@/components/games/GameHistoryStatsBar';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { Colors, Spacing, TFL, Typography } from '@/constants/theme';
import type { GameHistoryListItem } from '@/types/game-history';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import {
    ActivityIndicator,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface GameHistoryListScreenProps {
    title: string;
    icon: keyof typeof MaterialIcons.glyphMap;
    accentColor: string;
    hasWinLoss: boolean;
    /** Badge color when completed (e.g. TFL.blue for crossword) */
    completedBadgeColor?: string;
    sections: { title: string; data: GameHistoryListItem[] }[];
    stats: { completed: number; total: number; currentStreak: number };
    hasMore: boolean;
    loadMore: () => Promise<void>;
    loadingMore: boolean;
    onPuzzlePress: (navigateKey: string) => void;
    /** Optional per-item accessory renderer (e.g. mini grid preview) */
    renderItemAccessory?: (item: GameHistoryListItem) => React.ReactNode;
}

export function GameHistoryListScreen({
    title,
    icon,
    accentColor,
    hasWinLoss,
    completedBadgeColor,
    sections,
    stats,
    hasMore,
    loadMore,
    loadingMore,
    onPuzzlePress,
    renderItemAccessory,
}: GameHistoryListScreenProps) {

    const headerIcon = (
        <View style={styles.iconContainer}>
            <MaterialIcons name={icon} size={24} color={accentColor} />
        </View>
    );

    const renderSectionHeader = ({ section }: { section: { title: string } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
        </View>
    );

    const renderItem = ({ item }: { item: GameHistoryListItem }) => (
        <GamePuzzleListItem
            dayNumber={item.dayNumber}
            label={item.label}
            isToday={item.isToday}
            isLive={item.isLive}
            sublabel={item.sublabel || undefined}
            isCompleted={item.isCompleted}
            completionTime={item.completionTime}
            score={item.score}
            isWon={item.isWon}
            accentColor={accentColor}
            hasWinLoss={hasWinLoss}
            completedBadgeColor={completedBadgeColor}
            renderAccessory={renderItemAccessory?.(item)}
            onPress={() => onPuzzlePress(item.navigateKey)}
        />
    );

    const renderSeparator = () => <View style={styles.separator} />;

    const renderListFooter = () => {
        if (!hasMore) return null;
        return (
            <TouchableOpacity
                style={styles.showMoreButton}
                onPress={loadMore}
                disabled={loadingMore}
                accessibilityRole="button"
                accessibilityLabel="Show more games"
            >
                {loadingMore ? (
                    <ActivityIndicator size="small" color={accentColor} />
                ) : (
                    <Text style={[styles.showMoreText, { color: accentColor }]}>Show more</Text>
                )}
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialIcons name={icon} size={48} color={TFL.grey.medium} />
            <Text style={styles.emptyTitle}>No games played yet</Text>
            <Text style={styles.emptySubtitle}>Completed puzzles will appear here</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <HeaderBackButton title={title} icon={headerIcon} />
            <GameHistoryStatsBar
                completed={stats.completed}
                total={stats.total}
                currentStreak={stats.currentStreak}
            />
            <SectionList
                sections={sections}
                keyExtractor={item => item.id}
                renderSectionHeader={renderSectionHeader}
                renderItem={renderItem}
                ItemSeparatorComponent={renderSeparator}
                ListFooterComponent={renderListFooter}
                ListEmptyComponent={renderEmpty}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={sections.length === 0 ? styles.listContentEmpty : styles.listContent}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: TFL.grey.light,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingBottom: Spacing.xl,
    },
    sectionHeader: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
        backgroundColor: Colors.light.background,
    },
    sectionHeaderText: {
        ...Typography.label,
        fontSize: 13,
        fontWeight: '600',
    },
    separator: {
        height: 1,
        backgroundColor: Colors.light.border,
        marginLeft: Spacing.md + 48 + Spacing.md,
    },
    showMoreButton: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    showMoreText: {
        fontSize: 16,
        fontWeight: '600',
    },
    listContentEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: Spacing.xl,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.xl,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.light.text,
        marginTop: Spacing.md,
        marginBottom: Spacing.xs,
    },
    emptySubtitle: {
        fontSize: 15,
        color: TFL.grey.dark,
        textAlign: 'center',
    },
});
