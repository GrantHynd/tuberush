import { Crossword } from '@/components/games/Crossword';
import { Colors, Layout, Spacing, TFL, Typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { usePuzzle } from '@/hooks/usePuzzle';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { CrosswordState, GameState } from '@/types/game';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
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
    const { currentGame, loadGame, saveGame, createNewGame } = useGameStore();
    const puzzle = usePuzzle(puzzleIdParam);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            return;
        }

        if (!user.isPremium) {
            Alert.alert(
                'Premium Required',
                'Crossword puzzles are only available for premium members.',
                [
                    { text: 'Subscribe', onPress: () => router.push('/subscribe') },
                    { text: 'Cancel', onPress: () => router.back() },
                ]
            );
            setLoading(false);
            return;
        }

        const initGame = async () => {
            const puzzleGameId = `crossword_${user.id}_${puzzle.id}`;
            try {
                let game = await loadGame(puzzleGameId, user.id);

                if (!game) {
                    game = createNewGame(
                        user.id,
                        'crossword',
                        puzzleGameId,
                        puzzle.id,
                    );
                }

                setGameState(game);
            } catch (error) {
                console.error('Failed to init crossword game:', error);
                Alert.alert('Error', 'Failed to load game');
                router.back();
            } finally {
                setLoading(false);
            }
        };

        initGame();
    }, [user, puzzle.id]);

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

    const isFullyFilled = useMemo(() => {
        if (!gameState) return false;
        const state = gameState.state as CrosswordState;
        const grid = state.grid;
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                const cell = grid[r][c];
                if (!cell.isBlack && cell.letter !== null) {
                    const key = `${r}-${c}`;
                    const ans = state.userAnswers[key]?.toUpperCase().trim();
                    if (!ans) return false;
                }
            }
        }
        return true;
    }, [gameState]);

    const checkAnswers = useCallback(() => {
        if (!gameState) return;
        const state = gameState.state as CrosswordState;
        const grid = state.grid;
        let allCorrect = true;
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                const cell = grid[r][c];
                if (!cell.isBlack && cell.letter !== null) {
                    const key = `${r}-${c}`;
                    const correct = (cell.letter ?? '').toUpperCase();
                    const userAns = (state.userAnswers[key] ?? '').toUpperCase().trim();
                    if (userAns !== correct) {
                        allCorrect = false;
                        break;
                    }
                }
            }
            if (!allCorrect) break;
        }

        if (allCorrect) {
            const newState: CrosswordState = { ...state, completed: true };
            const updatedGame: GameState = {
                ...gameState,
                state: newState,
                lastUpdated: new Date().toISOString(),
            };
            setGameState(updatedGame);
            saveGame(updatedGame);
        } else {
            Alert.alert(
                'Not quite!',
                "There's a wrong answer somewhere. Keep going!",
                [{ text: 'OK' }]
            );
        }
    }, [gameState, saveGame]);

    if (!user?.isPremium) {
        return null;
    }

    if (loading || !gameState) {
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
                    <ActivityIndicator size="large" color={Colors.light.tint} />
                </View>
            </SafeAreaView>
        );
    }

    const state = gameState.state as CrosswordState;
    const isCompleted = state.completed;

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

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                <Crossword
                    puzzle={puzzle}
                    gameState={state}
                    onCellChange={handleCellChange}
                    disabled={isCompleted}
                />

                {!isCompleted && (
                    <View style={styles.checkSection}>
                        <TouchableOpacity
                            style={[
                                styles.checkButton,
                                !isFullyFilled && styles.checkButtonDisabled,
                            ]}
                            onPress={checkAnswers}
                            disabled={!isFullyFilled}
                            accessibilityRole="button"
                            accessibilityLabel="Check answers"
                        >
                            <Text
                                style={[
                                    styles.checkButtonText,
                                    !isFullyFilled && styles.checkButtonTextDisabled,
                                ]}
                            >
                                Check
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isCompleted && (
                    <View style={styles.gameOverContainer}>
                        <Text style={styles.gameOverTitle}>Well done!</Text>
                        <Text style={styles.gameOverSubtitle}>You completed the puzzle!</Text>
                        <TouchableOpacity
                            style={[styles.checkButton, styles.checkButtonPrimary]}
                            onPress={() => router.back()}
                            accessibilityRole="button"
                            accessibilityLabel="Return home"
                        >
                            <Text style={[styles.checkButtonText, styles.checkButtonTextPrimary]}>
                                Home
                            </Text>
                        </TouchableOpacity>
                    </View>
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
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: Spacing.xl,
    },
    checkSection: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        alignItems: 'center',
    },
    checkButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.light.text,
    },
    checkButtonDisabled: {
        borderColor: TFL.grey.dark,
        opacity: 0.6,
    },
    checkButtonPrimary: {
        backgroundColor: Colors.light.text,
    },
    checkButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.light.text,
    },
    checkButtonTextDisabled: {
        color: TFL.grey.dark,
    },
    checkButtonTextPrimary: {
        color: Colors.light.background,
    },
    gameOverContainer: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        alignItems: 'center',
    },
    gameOverTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: 4,
    },
    gameOverSubtitle: {
        fontSize: 15,
        color: TFL.grey.dark,
        marginBottom: Spacing.md,
    },
});
