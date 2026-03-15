import { Crossword } from '@/components/games/Crossword';
import { Colors, Layout, Spacing, TFL, Typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { usePuzzle } from '@/hooks/usePuzzle';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { CrosswordState, GameState } from '@/types/game';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Format a YYYY-MM-DD date string as "15 Mar 2026" */
function formatPuzzleDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const month = date.toLocaleString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

export default function PlayCrossword() {
    const router = useRouter();
    const { puzzleId: puzzleIdParam } = useLocalSearchParams<{ puzzleId?: string }>();
    const user = useAuthStore(state => state.user);
    const { currentGame, saveGame, createNewGame } = useGameStore();
    const puzzle = usePuzzle(puzzleIdParam);
    const [gameState, setGameState] = useState<GameState | null>(null);

    useEffect(() => {
        if (!user) {
            return;
        }

        // Check premium status
        if (!user.isPremium) {
             Alert.alert(
                'Premium Required',
                'Crossword puzzles are only available for premium members.',
                [
                    { text: 'Subscribe', onPress: () => router.push('/subscribe') },
                    { text: 'Cancel', onPress: () => router.back() },
                ]
            );
            return;
        }

        // Create new game or load existing for the selected puzzle
        const puzzleGameId = `crossword_${user.id}_${puzzle.id}`;
        if (!currentGame || currentGame.id !== puzzleGameId) {
            const newGame = createNewGame(
                user.id,
                'crossword',
                puzzleGameId,
                puzzle.id,
            );
            setGameState(newGame);
        } else {
            setGameState(currentGame);
        }
    }, [user, puzzle, puzzleIdParam]);

    const handleCellChange = async (row: number, col: number, value: string) => {
        if (!gameState) return;

        const state = gameState.state as CrosswordState;
        const newAnswers = {
            ...state.userAnswers,
            [`${row}-${col}`]: value,
        };

        const newState: CrosswordState = {
            ...state,
            userAnswers: newAnswers,
        };

        const updatedGame: GameState = {
            ...gameState,
            state: newState,
            lastUpdated: new Date().toISOString(),
        };

        setGameState(updatedGame);
        await saveGame(updatedGame);
    };

    if (!user?.isPremium) {
        return null;
    }

    if (!gameState) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Crossword</Text>
                    <View style={styles.headerRight} />
                </View>
                <View style={styles.centered}>
                    <Text>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    const state = gameState.state as CrosswordState;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                >
                    <MaterialIcons name="arrow-back" size={24} color={Colors.light.text} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Crossword</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>1st Class</Text>
                    </View>
                </View>

                <Text style={styles.headerDate}>{formatPuzzleDate(puzzle.date)}</Text>
            </View>

            <Crossword
                puzzle={puzzle}
                gameState={state}
                onCellChange={handleCellChange}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
    },
    backButton: {
        padding: Spacing.xs,
        marginLeft: Spacing.xs,
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: Spacing.sm,
        flex: 1,
    },
    headerTitle: {
        ...Typography.h2,
    },
    badge: {
        backgroundColor: TFL.yellow,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Layout.borderRadius.xl,
        marginLeft: Spacing.sm,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.light.text,
    },
    headerRight: {
        width: 80,
    },
    headerDate: {
        ...Typography.caption,
        color: TFL.grey.dark,
        marginRight: Spacing.sm,
    },
});
