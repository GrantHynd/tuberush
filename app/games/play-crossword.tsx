import { openPaywall } from '@/lib/paywall';
import { Crossword } from '@/components/games/Crossword';
import { CrosswordErrorBoundary } from '@/components/games/CrosswordErrorBoundary';
import { CrosswordUpsell } from '@/components/games/CrosswordUpsell';
import { CrosswordSolvedBoard } from '@/components/games/CrosswordSolvedBoard';
import { FinishedGameView, type FinishedStat } from '@/components/game-ui/FinishedGameView';
import { useUserStats } from '@/hooks/useUserStats';
import { GameHeader } from '@/components/game-ui/GameHeader';
import { FeedbackToast } from '@/components/game-ui/FeedbackToast';
import { announce } from '@/lib/a11y';
import { wrongLettersMessage } from '@/lib/crossword-feedback';
import { Leaderboard } from '@/components/ui/Leaderboard';
import { Colors, GameColors, Spacing, Typography } from '@/constants/theme';
import { getCustomPuzzle, saveCustomPuzzleScore } from '@/lib/custom-puzzles';
import { formatScore } from '@/lib/display-utils';
import { capture } from '@/lib/posthog';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { useCrosswordTimer } from '@/hooks/useCrosswordTimer';
import { usePuzzle } from '@/hooks/usePuzzle';
import { scoreOutbox } from '@/lib/score-outbox';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import type { CrosswordPuzzle, CrosswordState, GameState } from '@/types/game';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const { puzzleId: puzzleIdParam, customPuzzleId } = useLocalSearchParams<{ puzzleId?: string; customPuzzleId?: string }>();
    const isCustomPuzzle = !!customPuzzleId;
    const user = useAuthStore(state => state.user);
    const { loadGame, saveGame, createNewGame } = useGameStore();
    const { puzzle: dailyPuzzle, gameDate: dailyGameDate, loading: dailyPuzzleLoading } = usePuzzle(isCustomPuzzle ? undefined : puzzleIdParam);
    const [customPuzzle, setCustomPuzzle] = useState<CrosswordPuzzle | null>(null);
    const [customPuzzleLoading, setCustomPuzzleLoading] = useState(!!customPuzzleId);
    const puzzle = isCustomPuzzle ? customPuzzle : dailyPuzzle;
    const gameDate = isCustomPuzzle ? null : dailyGameDate;
    const puzzleLoading = isCustomPuzzle ? customPuzzleLoading : dailyPuzzleLoading;
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    // TUB-299: cells marked wrong by the last Check; a cell's mark clears when it is edited.
    const [errorCells, setErrorCells] = useState<ReadonlySet<string>>(() => new Set());
    const insets = useSafeAreaInsets();
    // TUB-300: reopening a solved puzzle renders the finished view with no animation/announcement.
    const [finishedOnLoad, setFinishedOnLoad] = useState(false);
    const { stats: userStats } = useUserStats();

    // Load custom puzzle from Supabase
    useEffect(() => {
        if (!customPuzzleId) return;
        let cancelled = false;
        async function load() {
            setCustomPuzzleLoading(true);
            try {
                const row = await getCustomPuzzle(customPuzzleId!);
                if (!cancelled && row) {
                    setCustomPuzzle(row.puzzle_data as CrosswordPuzzle);
                }
            } catch {
                // handled by null puzzle state
            } finally {
                if (!cancelled) setCustomPuzzleLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [customPuzzleId]);

    useEffect(() => {
        if (!user) {
            return;
        }

        if (!user.isPremium) {
            // TUB-301: the paywall is rendered inline (shared Upsell in the game shell), never an Alert.
            capture('premium_gate_shown', { source: 'crossword_play' });
            return;
        }

        if (puzzleLoading || !puzzle) {
            return;
        }

        const initGame = async () => {
            const puzzleGameId = isCustomPuzzle
                ? `crossword_${user.id}_custom_${customPuzzleId}`
                : `crossword_${user.id}_${puzzle.id}`;
            try {
                let game = await loadGame(puzzleGameId, user.id);

                if (!game) {
                    game = createNewGame(
                        user.id,
                        'crossword',
                        puzzleGameId,
                        puzzle,
                    );
                }

                setFinishedOnLoad(!!(game.state as CrosswordState).completed);
                setGameState(game);
                capture('game_started', {
                    game_type: 'crossword',
                    puzzle_id: puzzle.id,
                    is_custom: isCustomPuzzle,
                });
            } catch (error) {
                console.error('Failed to init crossword game:', error);
                Alert.alert('Error', 'Failed to load game');
                router.back();
            } finally {
                setLoading(false);
            }
        };

        initGame();
    }, [user, puzzle, puzzleLoading, loadGame, createNewGame, router, isCustomPuzzle, customPuzzleId]);

    const timerRef = React.useRef<{ accumulatedPause: number }>({ accumulatedPause: 0 });

    const handleCellChange = async (row: number, col: number, value: string) => {
        if (!gameState) return;

        const state = gameState.state as CrosswordState;
        const editedKey = `${row}-${col}`;
        setErrorCells((prev) => {
            if (!prev.has(editedKey)) return prev;
            const next = new Set(prev);
            next.delete(editedKey);
            return next;
        });
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
        if (!gameState || !puzzle) return;
        const state = gameState.state as CrosswordState;
        const grid = state.grid;
        let allCorrect = true;
        let incorrectCells = 0;
        const wrongKeys = new Set<string>();
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                const cell = grid[r][c];
                if (!cell.isBlack && cell.letter !== null) {
                    const key = `${r}-${c}`;
                    const correct = (cell.letter ?? '').toUpperCase();
                    const userAns = (state.userAnswers[key] ?? '').toUpperCase().trim();
                    if (userAns !== correct) {
                        allCorrect = false;
                        incorrectCells += 1;
                        wrongKeys.add(key);
                    }
                }
            }
        }

        const elapsedSeconds =
            state.startTime != null
                ? Math.floor(
                      (Date.now() - state.startTime - (timerRef.current.accumulatedPause ?? 0)) / 1000,
                  )
                : undefined;

        capture('crossword_answers_checked', {
            puzzle_id: puzzle.id,
            check_result: allCorrect ? 'all_correct' : 'has_errors',
            incorrect_cell_count: allCorrect ? 0 : incorrectCells,
            elapsed_seconds: elapsedSeconds,
        });

        if (allCorrect) {
            const endTime = Date.now();
            const newState: CrosswordState = {
                ...state,
                completed: true,
                wrongChecks: state.wrongChecks ?? 0,
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
            announce('Crossword solved. Journey complete.');

            const completionSecs = newState.startTime
                ? Math.floor((endTime - newState.startTime - (newState.accumulatedPause ?? 0)) / 1000)
                : null;
            capture('game_completed', {
                game_type: 'crossword',
                result: 'won',
                time_taken_seconds: completionSecs,
                is_custom: isCustomPuzzle,
            });
            capture('game_marked_complete', {
                game_type: 'crossword',
                puzzle_id: puzzle.id,
                time_taken_seconds: completionSecs,
                is_custom: isCustomPuzzle,
            });

            const pauseMs = newState.accumulatedPause ?? 0;
            const timeTaken = newState.startTime
                ? Math.floor((endTime - newState.startTime - pauseMs) / 1000)
                : null;

            if (isCustomPuzzle && customPuzzleId && timeTaken != null) {
                saveCustomPuzzleScore(customPuzzleId, timeTaken)
                    .catch((err) => console.error('Failed to save custom puzzle score', err));
            } else if (!isCustomPuzzle && user?.city && timeTaken != null && gameDate) {
                scoreOutbox.submit({
                    userId: user.id,
                    city: user.city,
                    borough: user.city === 'London' ? user.borough ?? null : null,
                    score: timeTaken,
                    gameType: 'crossword',
                    gameDate,
                    result: 'won',
                });
            }
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            // TUB-295: non-blocking toast (announced to VoiceOver) instead of a blocking Alert.
            // TUB-299: mark the wrong cells and say how many; play continues.
            setErrorCells(wrongKeys);
            const counted: GameState = {
                ...gameState,
                state: { ...state, wrongChecks: (state.wrongChecks ?? 0) + 1 },
                lastUpdated: new Date().toISOString(),
            };
            setGameState(counted);
            saveGame(counted);
            setToast((prev) => ({
                id: (prev?.id ?? 0) + 1,
                message: wrongLettersMessage(incorrectCells),
            }));
        }
    }, [gameState, saveGame, user, puzzle, isCustomPuzzle, customPuzzleId, gameDate]);

    const crosswordState = (gameState?.state ?? null) as CrosswordState | null;
    const timer = useCrosswordTimer(crosswordState ?? {
        puzzleId: '', grid: [], clues: { across: {}, down: {} },
        userAnswers: {}, completed: false,
    });
    const latestGameRef = React.useRef<GameState | null>(null);
    useEffect(() => {
        latestGameRef.current = gameState;
    }, [gameState]);
    useEffect(() => {
        timerRef.current.accumulatedPause = timer.accumulatedPause;
        // Persist pause time as soon as it changes, not on the next keystroke, so a kill
        // right after backgrounding doesn't lose it (TUB-290).
        const game = latestGameRef.current;
        const state = game?.state as CrosswordState | undefined;
        if (!game || !state || state.completed || !state.startTime) return;
        if ((state.accumulatedPause ?? 0) === timer.accumulatedPause) return;
        const updatedGame: GameState = {
            ...game,
            state: { ...state, accumulatedPause: timer.accumulatedPause },
            lastUpdated: new Date().toISOString(),
        };
        setGameState(updatedGame);
        saveGame(updatedGame);
    }, [timer.accumulatedPause, saveGame]);

    if (!user?.isPremium) {
        return (
            <SafeAreaView style={styles.container} edges={['top']} testID="crossword-paywall">
                <GameHeader
                    title="Crossword"
                    subtitle="1st Class"
                    lineColor={GameColors.crossword}
                    onBack={() => (router.canGoBack?.() ? router.back() : router.replace('/' as never))}
                />
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <CrosswordUpsell
                        onSeePremium={() => {
                            capture('premium_upsell_tapped', { source: 'crossword_play' });
                            openPaywall('crossword_play');
                        }}
                        onPlayFree={() => router.replace('/games/play-connections' as never)}
                    />
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (puzzleLoading) {
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

    if (!puzzle) {
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
                    <Text style={{ color: Colors.light.text, textAlign: 'center', paddingHorizontal: 24 }}>
                        This puzzle isn&apos;t available. It may not be published yet, or you may be offline without a cached copy.
                    </Text>
                </View>
            </SafeAreaView>
        );
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

    const finalTime = completionTimeSecs != null ? formatScore(completionTimeSecs) : null;
    const finishedStats: FinishedStat[] = [
        { label: 'Time', value: finalTime ?? '—' },
        // Checks that found wrong letters; older saves have no count.
        { label: 'Mistakes', value: state.wrongChecks != null ? String(state.wrongChecks) : '—' },
        { label: 'Day streak', value: String(userStats.streak) },
    ];

    const handleShare = async () => {
        if (completionTimeSecs == null) return;
        const timeStr = formatScore(completionTimeSecs);
        capture('game_shared', { game_type: 'crossword', is_custom: isCustomPuzzle });
        try {
            const message = isCustomPuzzle
                ? `TubeRush Custom Crossword - Solved in ${timeStr}`
                : `TubeRush Crossword - ${formatPuzzleDate(gameDate ?? puzzle.date)} - Solved in ${timeStr}`;
            await Share.share({ message });
        } catch { /* user cancelled */ }
    };

    const goBack = () => (router.canGoBack?.() ? router.back() : router.replace('/' as never));

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <GameHeader
                title="Crossword"
                subtitle={`${isCustomPuzzle ? 'Custom' : '1st Class'} · ${isCustomPuzzle ? 'Custom Puzzle' : formatPuzzleDate(gameDate ?? puzzle.date)}`}
                lineColor={GameColors.crossword}
                onBack={goBack}
                right={
                    isCompleted ? (
                        <TouchableOpacity
                            onPress={handleShare}
                            style={styles.backButton}
                            accessibilityRole="button"
                            accessibilityLabel="Share result"
                            testID="header-share"
                        >
                            <MaterialIcons name="ios-share" size={22} color={Colors.light.text} />
                        </TouchableOpacity>
                    ) : state.startTime ? (
                        <Text style={styles.headerTimer} accessibilityLabel={`Time ${timer.formatted}`}>
                            {timer.formatted}
                        </Text>
                    ) : undefined
                }
            />

            <CrosswordErrorBoundary onReset={() => router.back()}>
            {!isCompleted ? (
                // TUB-298: no ScrollView / system keyboard — grid, clue bar and in-app keyboard fill the screen.
                <Crossword
                    puzzle={puzzle}
                    gameState={state}
                    onCellChange={handleCellChange}
                    onCheck={checkAnswers}
                    checkDisabled={!isFullyFilled}
                    errorCells={errorCells}
                    bottomInset={insets.bottom}
                />
            ) : (
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
                    <FinishedGameView
                        outcome="win"
                        lineColor={GameColors.crossword}
                        title="Journey complete"
                        detail={`${puzzle.title || 'Crossword'} solved`}
                        time={finalTime ?? undefined}
                        board={<CrosswordSolvedBoard puzzle={puzzle} state={state} />}
                        stats={finishedStats}
                        onLeaderboard={isCustomPuzzle ? undefined : () => setShowLeaderboard(true)}
                        onShare={handleShare}
                        justFinished={!finishedOnLoad}
                        announcement={`Journey complete.${finalTime ? ` Solved in ${finalTime}.` : ''}`}
                    />
                    {isCustomPuzzle && (
                        <TouchableOpacity
                            style={[styles.gameOverButton, styles.backToPuzzles]}
                            onPress={() => router.back()}
                            accessibilityRole="button"
                            accessibilityLabel="Return to puzzles"
                        >
                            <Text style={styles.gameOverButtonText}>Back to Puzzles</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            )}
            </CrosswordErrorBoundary>

            {!isCustomPuzzle && (
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
            )}
            <FeedbackToast
                message={toast?.message ?? null}
                id={toast?.id}
                onHide={() => setToast(null)}
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
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xs,
        marginLeft: Spacing.xs,
    },
    headerTitle: {
        ...Typography.h2,
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
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: Spacing.xl,
    },
    backToPuzzles: { alignSelf: 'center', marginTop: Spacing.md },
    gameOverButton: {
        minHeight: 48,
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.light.text,
    },
    gameOverButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.light.text,
    },
});
