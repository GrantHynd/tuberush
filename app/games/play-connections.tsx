import { Connections } from "@/components/games/Connections";
import { Leaderboard } from "@/components/ui/Leaderboard";
import { getCustomPuzzle, saveCustomPuzzleScore } from "@/lib/custom-puzzles";
import { getDailyGame, getGameByDate } from "@/lib/daily-games";
import { scoreOutbox } from "@/lib/score-outbox";
import { FinishedGameView, type FinishedStat } from "@/components/game-ui/FinishedGameView";
import { GameHeader } from "@/components/game-ui/GameHeader";
import { Colors, LineColors, Spacing, Typography } from "@/constants/theme";
import { GAMES } from "@/constants/Games";
import { useUserStats } from "@/hooks/useUserStats";
import { formatScore } from "@/lib/display-utils";
import { capture } from "@/lib/posthog";
import { useAuthStore } from "@/stores/auth-store";
import { useGameStore } from "@/stores/game-store";
import { ConnectionsPuzzle, ConnectionsState } from "@/types/game";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const GAME_NAME = GAMES.connections.name;

export default function PlayConnectionsScreen() {
  const router = useRouter();
  const { date: dateParam, customPuzzleId } = useLocalSearchParams<{ date?: string; customPuzzleId?: string }>();
  const isCustomPuzzle = !!customPuzzleId;
  const { user } = useAuthStore();
  const { currentGame, loadGame, createNewGame, saveGame } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [puzzle, setPuzzle] = useState<ConnectionsPuzzle | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [revealComplete, setRevealComplete] = useState(false);
  const [syncedGameId, setSyncedGameId] = useState<string | undefined>(undefined);
  const [finishedOnLoad, setFinishedOnLoad] = useState(false);
  const { stats: userStats } = useUserStats();
  const streak = userStats.streak;

  useEffect(() => {
    if (!user) {
      router.replace("/auth");
      return;
    }

    const initGame = async () => {
      let targetPuzzle: ConnectionsPuzzle | undefined;

      if (customPuzzleId) {
        // Load from custom_puzzles table
        const row = await getCustomPuzzle(customPuzzleId);
        targetPuzzle = row?.puzzle_data as ConnectionsPuzzle | undefined;
      } else if (dateParam) {
        targetPuzzle = (await getGameByDate("connections", dateParam)) as
          | ConnectionsPuzzle
          | undefined;
      } else {
        targetPuzzle = (await getDailyGame("connections")) as ConnectionsPuzzle | undefined;
      }

      if (!targetPuzzle) {
        setLoadError(true);
        setLoading(false);
        Alert.alert(
          "Puzzle unavailable",
          "This puzzle isn’t available offline or hasn’t been published yet. Check your connection or try again later.",
          [{ text: "OK", onPress: () => router.back() }],
        );
        return;
      }

      setPuzzle(targetPuzzle);

      const gameId = customPuzzleId
        ? `connections_${user.id}_custom_${customPuzzleId}`
        : `connections_${user.id}_${dateParam || targetPuzzle.date}`;

      try {
        let game = await loadGame(gameId, user.id);

        if (!game) {
          game = createNewGame(user.id, "connections", gameId);
        }

        capture("game_started", {
          game_type: "connections",
          puzzle_date: targetPuzzle.date,
          is_custom: isCustomPuzzle,
        });
        setLoading(false);
      } catch (error) {
        console.error("Failed to init game:", error);
        Alert.alert("Error", "Failed to load game");
        router.back();
      }
    };

    initGame();
  }, [user, dateParam, customPuzzleId, isCustomPuzzle, loadGame, createNewGame, router]);

  const handleSubmitGuess = useCallback(
    async (items: string[]) => {
      if (!currentGame || !puzzle || !user) return;

      const state = currentGame.state as ConnectionsState;

      if (state.status !== "playing") return;

      // Check against groups
      const matchedGroup = puzzle.groups.find((group) => {
        const groupItems = group.items;
        if (groupItems.length !== items.length) return false;
        return items.every((item) => groupItems.includes(item));
      });

      const newState = { ...state };

      if (matchedGroup) {
        if (!state.completedGroups.includes(matchedGroup.category)) {
          newState.completedGroups = [
            ...state.completedGroups,
            matchedGroup.category,
          ];

          // Check win condition
          if (newState.completedGroups.length === 4) {
            newState.status = "won";
            const endTime = Date.now();
            newState.endTime = endTime;

            const timeTaken = Math.floor(
              (endTime - newState.startTime) / 1000,
            );

            capture("game_completed", {
              game_type: "connections",
              result: "won",
              time_taken_seconds: timeTaken,
              mistakes: 4 - newState.mistakesRemaining,
              is_custom: isCustomPuzzle,
            });
            capture("game_marked_complete", {
              game_type: "connections",
              puzzle_date: puzzle.date,
              time_taken_seconds: timeTaken,
              mistakes_used: 4 - newState.mistakesRemaining,
              is_custom: isCustomPuzzle,
            });

            if (isCustomPuzzle && customPuzzleId) {
              saveCustomPuzzleScore(customPuzzleId, timeTaken)
                .catch((err) =>
                  console.error("Failed to save custom puzzle score", err),
                );
            } else if (!isCustomPuzzle && user.city) {
              scoreOutbox.submit({
                userId: user.id,
                city: user.city,
                borough: user.city === "London" ? user.borough ?? null : null,
                score: timeTaken,
                gameType: "connections",
                gameDate: dateParam || puzzle.date,
                result: "won",
                mistakes: 4 - newState.mistakesRemaining,
              });
            }
          }
        }
      } else {
        newState.mistakesRemaining = Math.max(
          0,
          state.mistakesRemaining - 1,
        );

        if (newState.mistakesRemaining === 0) {
          newState.status = "lost";
          newState.endTime = Date.now();
          setRevealComplete(false); // Reset for reveal animation
          capture("game_completed", {
            game_type: "connections",
            result: "lost",
            groups_found: newState.completedGroups.length,
          });
          // TUB-257: record the real loss server-side (ignored by ranks).
          if (user && !isCustomPuzzle && user.city && newState.startTime != null) {
            const lostSeconds = Math.floor(
              (newState.endTime - newState.startTime) / 1000,
            );
            scoreOutbox.submit({
              userId: user.id,
              city: user.city,
              borough: user.city === "London" ? user.borough ?? null : null,
              score: lostSeconds,
              gameType: "connections",
              gameDate: dateParam || puzzle.date,
              result: "lost",
              mistakes: 4,
            });
          }
        }
      }

      newState.history = [...state.history, items];

      await saveGame({
        ...currentGame,
        state: newState,
        lastUpdated: new Date().toISOString(),
      });
    },
    [currentGame, puzzle, user, saveGame, isCustomPuzzle, customPuzzleId, dateParam],
  );

  const handleRevealComplete = useCallback(() => {
    setRevealComplete(true);
  }, []);

  const puzzleDate =
    dateParam || puzzle?.date || new Date().toISOString().split("T")[0];
  const subtitle = isCustomPuzzle ? "Custom Puzzle" : formatDate(puzzleDate);

  // A game that was already finished when loaded renders its finished page with no
  // animation or announcement. A game that finishes in this session animates/announces.
  const loadedGameId = currentGame?.id;
  const loadedStatus = currentGame
    ? (currentGame.state as ConnectionsState).status
    : undefined;
  if (loadedGameId !== syncedGameId) {
    setSyncedGameId(loadedGameId);
    setRevealComplete(loadedStatus === "lost");
    setFinishedOnLoad(loadedStatus === "won" || loadedStatus === "lost");
  }

  const goBack = useCallback(() => {
    if (router.canGoBack?.()) router.back();
    else router.replace("/");
  }, [router]);

  if (loadError || loading || !puzzle || !currentGame) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <GameHeader
          title={GAME_NAME}
          lineColor={LineColors.connections}
          onBack={() => router.back()}
        />
        <View style={styles.centered}>
          {loadError ? (
            <Text style={styles.message}>
              Puzzle not available. Go back and try again when you&apos;re online or after new puzzles are published.
            </Text>
          ) : (
            <ActivityIndicator size="large" color={LineColors.connections} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const gameState = currentGame.state as ConnectionsState;
  const finished = gameState.status === "won" || gameState.status === "lost";
  const won = gameState.status === "won";
  const timeTaken =
    gameState.endTime && gameState.startTime
      ? Math.floor((gameState.endTime - gameState.startTime) / 1000)
      : null;
  const mistakes = 4 - gameState.mistakesRemaining;
  const linesFound = gameState.completedGroups.length;

  const handleShare = async () => {
    capture("game_shared", { game_type: "connections", is_custom: isCustomPuzzle });
    const rail = puzzle.groups
      .slice()
      .sort((a, b) => a.difficulty - b.difficulty)
      .map((g) => (gameState.completedGroups.includes(g.category) ? `Line ${g.difficulty} ✓` : `Line ${g.difficulty} –`))
      .join(" · ");
    const head = isCustomPuzzle ? `TubeRush ${GAME_NAME} (custom)` : `TubeRush ${GAME_NAME} · ${subtitle}`;
    const result = won
      ? `Journey complete${timeTaken != null ? ` in ${formatScore(timeTaken)}` : ""} · ${mistakes} ${mistakes === 1 ? "mistake" : "mistakes"}`
      : `Part suspended · ${linesFound} of 4 lines found`;
    try {
      await Share.share({ message: `${head}\n${result}\n${rail}` });
    } catch {
      /* user cancelled */
    }
  };

  const stats: FinishedStat[] = won
    ? [
        {
          label: "Time",
          value: timeTaken != null ? formatScore(timeTaken) : "–",
        },
        { label: mistakes === 1 ? "Mistake" : "Mistakes", value: String(mistakes) },
        { label: "Day streak", value: String(streak) },
      ]
    : [
        { label: "Lines", value: `${linesFound}/4`, accessibilityLabel: `Lines, ${linesFound} of 4` },
        { label: mistakes === 1 ? "Mistake" : "Mistakes", value: String(mistakes) },
        { label: "Day streak", value: String(streak) },
      ];

  const board = (
    <Connections
      gameState={gameState}
      puzzle={puzzle}
      onSubmitGuess={handleSubmitGuess}
      onRevealComplete={handleRevealComplete}
      revealImmediately={finishedOnLoad}
    />
  );

  const lossDetail = `${linesFound} of 4 lines found · answers below`;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <GameHeader
        title={GAME_NAME}
        subtitle={subtitle}
        lineColor={LineColors.connections}
        onBack={goBack}
        right={
          finished ? (
            <Pressable
              onPress={handleShare}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Share result"
            >
              <MaterialIcons name="ios-share" size={22} color={Colors.light.text} />
            </Pressable>
          ) : undefined
        }
      />

      {finished ? (
        <ScrollView contentContainerStyle={styles.finishedContent} testID="connections-finished">
          <FinishedGameView
            outcome={won ? "win" : "loss"}
            lineColor={LineColors.connections}
            title={won ? "Journey complete" : "Part suspended"}
            detail={won ? "All four lines found" : lossDetail}
            time={won && timeTaken != null ? formatScore(timeTaken) : undefined}
            board={board}
            stats={stats}
            onLeaderboard={isCustomPuzzle ? undefined : () => setShowLeaderboard(true)}
            onShare={handleShare}
            justFinished={!finishedOnLoad}
            announcement={
              won
                ? `Journey complete.${timeTaken != null ? ` ${formatScore(timeTaken)}.` : ""}`
                : `Part suspended. ${lossDetail.replace(" · ", ". ")}.`
            }
          />
          {isCustomPuzzle && (
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Return to puzzles"
            >
              <Text style={styles.secondaryBtnText}>Back to Puzzles</Text>
            </Pressable>
          )}
          {!won && !revealComplete ? <View testID="reveal-in-progress" /> : null}
        </ScrollView>
      ) : (
        board
      )}

      {!isCustomPuzzle && (
        <Modal
          visible={showLeaderboard}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <Leaderboard
            gameType="connections"
            onClose={() => setShowLeaderboard(false)}
          />
        </Modal>
      )}
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
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    color: Colors.light.text,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  finishedContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  secondaryBtn: {
    marginTop: Spacing.sm,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    ...Typography.body,
    fontWeight: "600",
    color: Colors.light.text,
  },
});
