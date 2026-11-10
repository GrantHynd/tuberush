import { Connections } from '@/components/games/Connections';
import { Crossword } from '@/components/games/Crossword';
import { CrosswordSolvedBoard } from '@/components/games/CrosswordSolvedBoard';
import { FinishedGameView } from '@/components/game-ui/FinishedGameView';
import { GameHeader } from '@/components/game-ui/GameHeader';
import { TodayHeroCard } from '@/components/home/TodayHeroCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CROSSWORD_9X9_A } from '@/constants/fixtures/crossword-9x9-a';
import { FontScaleCap, interchangeGroups } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ConnectionsPuzzle, ConnectionsState, CrosswordPuzzle, CrosswordState } from '@/types/game';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Dev-only screenshot harness. Renders production components with fixture
 * puzzles. It is not linked from navigation and it does not publish a puzzle.
 * Loaded only from the dev route, and only while __DEV__ is true.
 */
const VIEWS = [
    'home',
    'interchange',
    'interchange-finished',
    'crossword',
    'crossword-selected',
    'crossword-error',
    'crossword-check-disabled',
    'crossword-9',
    'crossword-finished',
] as const;

type ViewName = (typeof VIEWS)[number];

const GROUPS = [
    { category: 'Travel words', items: ['BANK', 'TUBE', 'STOP', 'LINE'] },
    { category: 'Ways to cook', items: ['BAKE', 'BOIL', 'FRY', 'ROAST'] },
    { category: 'Shapes', items: ['OVAL', 'SQUARE', 'CIRCLE', 'TRIANGLE'] },
    { category: 'Instruments', items: ['PIANO', 'DRUM', 'FLUTE', 'HARP'] },
];

const interchangePuzzle = {
    id: 'fixture-interchange',
    date: '2026-10-25',
    groups: GROUPS.map((group, index) => ({
        category: group.category,
        items: group.items,
        difficulty: (index + 1) as 1 | 2 | 3 | 4,
        color: interchangeGroups[index].fill,
    })),
} as ConnectionsPuzzle;

function crosswordState(puzzle: CrosswordPuzzle, filled: boolean): CrosswordState {
    const userAnswers: Record<string, string> = {};
    if (filled) {
        puzzle.grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell.letter) userAnswers[`${r}-${c}`] = cell.letter;
            });
        });
    }
    return {
        puzzleId: puzzle.id,
        grid: puzzle.grid,
        clues: { across: {}, down: {} },
        userAnswers,
        completed: filled,
        startTime: 0,
        endTime: filled ? 222000 : undefined,
        wrongChecks: filled ? 1 : 0,
    };
}

/** First across entry filled with a wrong letter, as after a failed Check. */
function checkedWrong(puzzle: CrosswordPuzzle): { state: CrosswordState; errors: Set<string> } {
    const userAnswers: Record<string, string> = {};
    const errors = new Set<string>();
    const clue = puzzle.clues.across[0];
    if (clue) {
        for (let i = 0; i < clue.length; i++) {
            const key = `${clue.row}-${clue.col + i}`;
            const correct = puzzle.grid[clue.row]?.[clue.col + i]?.letter ?? 'A';
            userAnswers[key] = correct === 'Z' ? 'Y' : 'Z';
            errors.add(key);
        }
    }
    return {
        errors,
        state: {
            puzzleId: puzzle.id,
            grid: puzzle.grid,
            clues: { across: {}, down: {} },
            userAnswers,
            completed: false,
            startTime: 0,
            wrongChecks: 1,
        },
    };
}

function playingConnections(found: string[]): ConnectionsState {
    return {
        completedGroups: found,
        mistakesRemaining: found.length === 4 ? 3 : 4,
        history: [],
        startTime: 0,
        endTime: found.length === 4 ? 1 : null,
        status: found.length === 4 ? 'won' : 'playing',
    };
}

export default function RebrandPreviewScreen() {
    const { colors } = useTheme();
    const router = useRouter();
    const params = useLocalSearchParams<{ view?: string; chrome?: string }>();
    const view = (VIEWS.includes(params.view as ViewName) ? params.view : 'home') as ViewName;
    const gameChrome = params.chrome === 'game';

    const body = (() => {
        if (view === 'home') {
            return (
                <ScrollView contentContainerStyle={styles.pad}>
                    <ScreenHeader variant="brand" title="TubeRush" subtitle="Beat the commute" testID="preview-home-header" />
                    <TodayHeroCard
                        rows={[
                            { gameType: 'connections', state: 'unplayed', statusText: 'Daily puzzle · No. 184', onPress: () => {} },
                            { gameType: 'crossword', state: 'inProgress', statusText: '1st Class · in progress', onPress: () => {} },
                        ]}
                    />
                </ScrollView>
            );
        }
        if (view === 'interchange' || view === 'interchange-finished') {
            const finished = view === 'interchange-finished';
            const board = (
                <Connections
                    puzzle={interchangePuzzle}
                    gameState={playingConnections(finished ? GROUPS.map((g) => g.category) : ['Travel words'])}
                    onSubmitGuess={() => {}}
                />
            );
            return (
                <View style={styles.fill}>
                    <GameHeader title="Interchange" subtitle="Daily puzzle · No. 184" lineColor={colors.gameInterchange} onBack={() => {}} />
                    {finished ? (
                        <ScrollView contentContainerStyle={styles.pad}>
                            <FinishedGameView
                                outcome="win"
                                lineColor={colors.gameInterchange}
                                title="Journey complete"
                                time="4:12"
                                board={board}
                                stats={[{ label: 'Groups', value: '4' }]}
                                onShare={() => {}}
                            />
                        </ScrollView>
                    ) : (
                        board
                    )}
                </View>
            );
        }
        const puzzle = CROSSWORD_9X9_A;
        const finished = view === 'crossword-finished';
        const wrong = view === 'crossword-error' ? checkedWrong(puzzle) : null;
        const state = wrong?.state ?? crosswordState(puzzle, finished);
        return (
            <View style={styles.fill}>
                <GameHeader
                    title="Crossword"
                    subtitle="1st Class · 25 Oct 2026"
                    lineColor={colors.gameCrossword}
                    onBack={() => {}}
                    right={
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} maxFontSizeMultiplier={FontScaleCap.chrome}>
                            1:24
                        </Text>
                    }
                />
                {finished ? (
                    <ScrollView contentContainerStyle={styles.pad}>
                        <FinishedGameView
                            outcome="win"
                            lineColor={colors.gameCrossword}
                            title="Journey complete"
                            detail="9×9 geometry fixture"
                            time="3:42"
                            board={<CrosswordSolvedBoard puzzle={puzzle} state={state} />}
                            stats={[{ label: 'Time', value: '3:42' }, { label: 'Mistakes', value: '1' }]}
                            onShare={() => {}}
                        />
                    </ScrollView>
                ) : (
                    <Crossword
                        puzzle={puzzle}
                        gameState={state}
                        onCellChange={() => {}}
                        disabled={view === 'crossword'}
                        errorCells={wrong?.errors}
                        onCheck={() => {}}
                        checkDisabled={view === 'crossword-check-disabled'}
                    />
                )}
            </View>
        );
    })();

    return (
        <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} testID="rebrand-preview">
            {gameChrome ? null : (
                <Text style={[styles.banner, { color: colors.textSecondary }]}>
                    Fixture preview, not a published puzzle. view={view}
                </Text>
            )}
            {gameChrome ? null : (
                <View style={styles.switcher}>
                    {VIEWS.map((name) => (
                        <Pressable key={name} onPress={() => router.setParams({ view: name })} accessibilityRole="button">
                            <Text style={{ color: name === view ? colors.primary : colors.textSecondary, fontSize: 12 }}>{name}</Text>
                        </Pressable>
                    ))}
                </View>
            )}
            <View style={styles.fill}>{body}</View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    fill: { flex: 1 },
    pad: { paddingBottom: 32 },
    banner: { fontSize: 12, paddingHorizontal: 16, paddingTop: 8 },
    switcher: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
});
