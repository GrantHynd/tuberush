import { Connections } from "@/components/games/Connections";
import { Leaderboard } from "@/components/ui/Leaderboard";
import type { ConnectionsPuzzle } from "@/constants/ConnectionsData";
import { getCustomPuzzle, saveCustomPuzzleScore } from "@/lib/custom-puzzles";
import { getDailyGame, getGameByDate } from "@/lib/daily-games";
import { Colors, Spacing, TFL, Typography } from "@/constants/theme";
import { leaderboard } from "@/lib/leaderboard";
import { capture } from "@/lib/posthog";
import { useAuthStore } from "@/stores/auth-store";
import { useGameStore } from "@/stores/game-store";
import { ConnectionsState } from "@/types/game";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
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
              leaderboard
                .submitScore(
                  user.id,
                  user.city,
                  user.city === "London" ? user.borough ?? null : null,
                  timeTaken,
                  "connections"
                )
                .catch((err) =>
                  console.error("Failed to submit score", err),
                );
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
          capture("game_completed", {
            game_type: "connections",
            result: "lost",
            groups_found: newState.completedGroups.length,
          });
        }
      }

      newState.history = [...state.history, items];

      await saveGame({
        ...currentGame,
        state: newState,
        lastUpdated: new Date().toISOString(),
      });
    },
    [currentGame, puzzle, user, saveGame, isCustomPuzzle, customPuzzleId],
  );

  const puzzleDate =
    dateParam || puzzle?.date || new Date().toISOString().split("T")[0];

  if (loadError) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={Colors.light.text}
            />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Connections</Text>
          </View>
        </View>
        <View style={styles.centered}>
          <Text style={{ color: Colors.light.text, textAlign: "center", paddingHorizontal: 24 }}>
            Puzzle not available. Go back and try again when you&apos;re online or after new puzzles are published.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || !puzzle || !currentGame) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={Colors.light.text}
            />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Connections</Text>
          </View>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      </SafeAreaView>
    );
  }

  const gameState = currentGame.state as ConnectionsState;
  const isGameOver =
    gameState.status === "won" || gameState.status === "lost";
  const timeTaken = gameState.endTime
    ? Math.floor((gameState.endTime - gameState.startTime) / 1000)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={Colors.light.text}
          />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Connections</Text>
          <Text style={styles.headerSubtitle}>{isCustomPuzzle ? 'Custom Puzzle' : formatDate(puzzleDate)}</Text>
        </View>
      </View>

      {/* Instruction */}
      <Text style={styles.instruction}>Create four groups of four!</Text>

      <Connections
        gameState={gameState}
        puzzle={puzzle}
        onSubmitGuess={handleSubmitGuess}
      />

      {/* Game Over Banner */}
      {isGameOver && (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverTitle}>
            {gameState.status === "won"
              ? "Well done!"
              : "Better luck next time"}
          </Text>
          {timeTaken !== null && gameState.status === "won" && (
            <Text style={styles.gameOverTime}>Solved in {timeTaken}s</Text>
          )}
          <View style={styles.gameOverActions}>
            {!isCustomPuzzle && (
              <TouchableOpacity
                style={styles.gameOverButton}
                onPress={() => setShowLeaderboard(true)}
                accessibilityRole="button"
                accessibilityLabel="View leaderboard"
              >
                <Text style={styles.gameOverButtonText}>Leaderboard</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.gameOverButton, styles.gameOverButtonPrimary]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={isCustomPuzzle ? "Return to puzzles" : "Return home"}
            >
              <Text
                style={[
                  styles.gameOverButtonText,
                  styles.gameOverButtonTextPrimary,
                ]}
              >
                {isCustomPuzzle ? 'Back to Puzzles' : 'Home'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerText: {
    flexShrink: 1,
  },
  headerTitle: {
    ...Typography.h1,
    fontSize: 28,
  },
  headerSubtitle: {
    fontSize: 15,
    color: TFL.grey.dark,
    marginTop: 2,
  },
  instruction: {
    fontSize: 16,
    color: TFL.grey.dark,
    textAlign: "center",
    paddingVertical: Spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gameOverContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  gameOverTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 4,
  },
  gameOverTime: {
    fontSize: 15,
    color: TFL.grey.dark,
    marginBottom: Spacing.md,
  },
  gameOverActions: {
    flexDirection: "row",
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
    fontWeight: "600",
    color: Colors.light.text,
  },
  gameOverButtonTextPrimary: {
    color: Colors.light.background,
  },
});
