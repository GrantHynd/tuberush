import { GameHistoryListScreen } from '@/components/games/GameHistoryListScreen';
import { connectionsGameHistoryConfig } from '@/config/gameHistoryConfigs';
import { useGameHistoryList } from '@/hooks/useGameHistoryList';
import { useAuthStore } from '@/stores/auth-store';
import { TFL } from '@/constants/theme';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';

export default function ConnectionsListScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { sections, stats, refresh, hasMore, loadMore, loadingMore } = useGameHistoryList(
        connectionsGameHistoryConfig
    );

    useFocusEffect(
        useCallback(() => {
            refresh();
        }, [refresh])
    );

    const handlePuzzlePress = (date: string) => {
        if (!user) {
            router.push('/auth');
            return;
        }
        router.push(`/games/play-connections?date=${date}` as never);
    };

    return (
        <GameHistoryListScreen
            title="Connections"
            icon="hub"
            accentColor={TFL.blue}
            hasWinLoss={true}
            sections={sections}
            stats={stats}
            hasMore={hasMore}
            loadMore={loadMore}
            loadingMore={loadingMore}
            onPuzzlePress={handlePuzzlePress}
        />
    );
}
