import { ConnectionsPuzzleListItem } from '@/components/connections/ConnectionsPuzzleListItem';
import { ConnectionsStatsBar } from '@/components/connections/ConnectionsStatsBar';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { useConnectionsList } from '@/hooks/useConnectionsList';
import { useAuthStore } from '@/stores/auth-store';
import { Colors, Spacing, TFL, Typography } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SectionList,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConnectionsListScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { sections, stats, loading } = useConnectionsList();

    const handlePuzzlePress = (date: string) => {
        if (!user) {
            router.push('/auth');
            return;
        }
        router.push(`/games/play-connections?date=${date}` as never);
    };

    const renderSectionHeader = ({ section }: { section: { title: string } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
        </View>
    );

    const renderItem = ({ item }: { item: any }) => (
        <ConnectionsPuzzleListItem
            dayNumber={item.dayNumber}
            label={item.label}
            isToday={item.isToday}
            isLive={item.isLive}
            puzzleNumber={item.puzzleNumber}
            commuteCount={item.commuteCount}
            isCompleted={item.isCompleted}
            completionTime={item.completionTime}
            score={item.score}
            isWon={item.isWon}
            onPress={() => handlePuzzlePress(item.date)}
        />
    );

    const renderSeparator = () => (
        <View style={styles.separator} />
    );

    const connectionsIcon = (
        <View style={styles.iconContainer}>
            <MaterialIcons name="grid-view" size={24} color={TFL.blue} />
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <HeaderBackButton title="Connections" icon={connectionsIcon} />
            <ConnectionsStatsBar
                completed={stats.completed}
                total={stats.total}
                currentStreak={stats.currentStreak}
            />
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderSectionHeader={renderSectionHeader}
                renderItem={renderItem}
                ItemSeparatorComponent={renderSeparator}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={styles.listContent}
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
});
