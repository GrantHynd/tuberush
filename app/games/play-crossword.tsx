import { Crossword } from '@/components/games/Crossword';
import { CrosswordErrorBoundary } from '@/components/games/CrosswordErrorBoundary';
import { Leaderboard } from '@/components/ui/Leaderboard';
import { Colors, Layout, Spacing, TFL, Typography } from '@/constants/theme';
import { leaderboard } from '@/lib/leaderboard';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { useCrosswordTimer } from '@/hooks/useCrosswordTimer';
import { usePuzzle } from '@/hooks/usePuzzle';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import type { CrosswordState, GameState } from '@/types/game';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Share,
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

function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function PlayCrossword() {
    const router = useRouter();
    const { puzzleId: puzzleIdParam } = useLocalSearchParams<{ puzzleId?: string }>();
    const user = useAuthStore(state => state.user);
    const { loadGame, saveGame, createNewGame } = useGameStore();
    const puzzle = usePuzzle(puzzleIdParam);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [loading, setLoading] = useState(true);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

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
    }, [user, puzzle.id, loadGame, createNewGame, router]);

    const timerRef = React.useRef<{ accumulatedPause: number }>({ accumulatedPause: 0 });

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
            startTime: state.startTime ?? Date.now(),
            accumulatedPause: timerRef.current.accumulatedPause,
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

    const checkAnswers = useCallback(async () => {
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
            const endTime = Date.now();
            const newState: CrosswordState = {
                ...state,
                completed: true,
                startTime: state.startTime ?? endTime,
                endTime,
                accumulatedPause: timerRef.current.accumulatedPause,
            };
            const updatedGame: GameState = {
                ...gameState,
                state: newState,
                lastUpdated: new Date().toISOString(),
            };
            setGameState(updatedGame);
            await saveGame(updatedGame);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (user?.city && newState.startTime) {
                const pauseMs = newState.accumulatedPause ?? 0;
                const timeTaken = Math.floor((endTime - newState.startTime - pauseMs) / 1000);
                leaderboard
                    .submitScore(
                        user.id,
                        user.city,
                        user.city === 'London' ? user.borough ?? null : null,
                        timeTaken,
                        'crossword',
                    )
                    .catch((err) => console.error('Failed to submit crossword score', err));
            }
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
                'Not quite!',
                "There's a wrong answer somewhere. Keep going!",
                [{ text: 'OK' }]
            );
        }
    }, [gameState, saveGame, user]);

    const crosswordState = (gameState?.state ?? null) as CrosswordState | null;
    const timer = useCrosswordTimer(crosswordState ?? {
        puzzleId: '', grid: [], clues: { across: {}, down: {} },
        userAnswers: {}, completed: false,
    });
    timerRef.current.accumulatedPause = timer.accumulatedPause;

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

    const completionTimeSecs = (isCompleted && state.startTime && state.endTime)
        ? Math.floor((state.endTime - state.startTime - (state.accumulatedPause ?? 0)) / 1000)
        : null;

    const handleShare = async () => {
        if (completionTimeSecs == null) return;
        const dateStr = formatPuzzleDate(puzzle.date);
        const timeStr = formatTime(completionTimeSecs);
        try {
            await Share.share({
                message: `TubeRush Crossword - ${dateStr} - Solved in ${timeStr}`,
            });
        } catch { /* user cancelled */ }
    };

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

                <View style={styles.headerRight}>
                    {state.startTime && !isCompleted && (
                        <Text style={styles.headerTimer}>{timer.formatted}</Text>
                    )}
                    <Text style={styles.headerDate}>{formatPuzzleDate(puzzle.date)}</Text>
                </View>
            </View>

            <CrosswordErrorBoundary onReset={() => router.back()}>
            <KeyboardAvoidingView
                style={styles.scroll}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
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
                            {completionTimeSecs != null && (
                                <Text style={styles.gameOverTime}>
                                    Solved in {formatTime(completionTimeSecs)}
                                </Text>
                            )}
                            <View style={styles.gameOverActions}>
                                <TouchableOpacity
                                    style={styles.gameOverButton}
                                    onPress={() => setShowLeaderboard(true)}
                                    accessibilityRole="button"
                                    accessibilityLabel="View leaderboard"
                                >
                                    <Text style={styles.gameOverButtonText}>Leaderboard</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.gameOverButton}
                                    onPress={handleShare}
                                    accessibilityRole="button"
                                    accessibilityLabel="Share result"
                                >
                                    <Text style={styles.gameOverButtonText}>Share</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.gameOverButton, styles.gameOverButtonPrimary]}
                                    onPress={() => router.back()}
                                    accessibilityRole="button"
                                    accessibilityLabel="Return home"
                                >
                                    <Text style={[styles.gameOverButtonText, styles.gameOverButtonTextPrimary]}>
                                        Home
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
            </CrosswordErrorBoundary>

            <Modal
                visible={showLeaderboard}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <Leaderboard
                    gameType="crossword"
                    onClose={() => setShowLeaderboard(false)}
                />
            </Modal>
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
        alignItems: 'flex-end' as const,
        marginRight: Spacing.sm,
    },
    headerTimer: {
        fontSize: 14,
        fontWeight: '600' as const,
        fontVariant: ['tabular-nums'] as const,
        color: Colors.light.text,
    },
    headerDate: {
        ...Typography.caption,
        color: TFL.grey.dark,
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
        paddingVertical: Spacing.lg,
        alignItems: 'center',
    },
    gameOverTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: 4,
    },
    gameOverTime: {
        fontSize: 15,
        color: TFL.grey.dark,
        marginBottom: Spacing.md,
    },
    gameOverActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    gameOverButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.light.text,
    },
    gameOverButtonPrimary: {
        backgroundColor: Colors.light.text,
    },
    gameOverButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
    gameOverButtonTextPrimary: {
        color: Colors.light.background,
    },
});
