import { CrosswordListGridPreview } from '@/components/games/CrosswordListGridPreview';
import { GameHistoryListScreen } from '@/components/games/GameHistoryListScreen';
import { crosswordGameHistoryConfig } from '@/config/gameHistoryConfigs';
import { useGameHistoryList } from '@/hooks/useGameHistoryList';
import { useAuthStore } from '@/stores/auth-store';
import { GameColors, TFL } from '@/constants/theme';
import type { GameHistoryListItem } from '@/types/game-history';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';

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
        // Non-premium users land on the in-game Upsell (TUB-301), not a system alert.
        router.push(`/games/play-crossword?puzzleId=${puzzleId}` as never);
    };

    const renderGridPreview = useCallback((item: GameHistoryListItem) => {
        if (!item.isCompleted) return null;
        return <CrosswordListGridPreview puzzleId={item.navigateKey} size={36} />;
    }, []);

    return (
        <GameHistoryListScreen
            title="Crossword"
            icon="grid-on"
            accentColor={GameColors.crossword}
            hasWinLoss={false}
            completedBadgeColor={TFL.blue}
            sections={sections}
            stats={stats}
            hasMore={hasMore}
            loadMore={loadMore}
            loadingMore={loadingMore}
            onPuzzlePress={handlePuzzlePress}
            renderItemAccessory={renderGridPreview}
            isLocked={!!user && !user.isPremium}
        />
    );
}
