import { GameHistoryListScreen } from '@/components/games/GameHistoryListScreen';
import { crosswordGameHistoryConfig } from '@/config/gameHistoryConfigs';
import { useGameHistoryList } from '@/hooks/useGameHistoryList';
import { useAuthStore } from '@/stores/auth-store';
import { TFL } from '@/constants/theme';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert } from 'react-native';

export default function CrosswordListScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { sections, stats, refresh, hasMore, loadMore, loadingMore } = useGameHistoryList(
        crosswordGameHistoryConfig
    );

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    const handlePuzzlePress = (puzzleId: string) => {
        if (!user) {
            router.push('/auth');
            return;
        }
        if (!user.isPremium) {
            Alert.alert(
                'Premium Required',
                'Crossword puzzles are only available for premium members.',
                [
                    { text: 'Subscribe', onPress: () => router.push('/subscribe') },
                    { text: 'Cancel', onPress: () => {} },
                ]
            );
            return;
        }
        router.push(`/games/play-crossword?puzzleId=${puzzleId}` as never);
    };

    return (
        <GameHistoryListScreen
            title="Crossword"
            icon="grid-on"
            accentColor={TFL.red}
            hasWinLoss={false}
            completedBadgeColor={TFL.blue}
            sections={sections}
            stats={stats}
            hasMore={hasMore}
            loadMore={loadMore}
            loadingMore={loadingMore}
            onPuzzlePress={handlePuzzlePress}
        />
    );
}
