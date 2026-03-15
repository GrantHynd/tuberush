import { Connections } from "@/components/games/Connections";
import { HeaderBackButton } from "@/components/ui/HeaderBackButton";
import { Leaderboard } from "@/components/ui/Leaderboard";
import {
  ConnectionsPuzzle,
  getDailyPuzzle,
  getPuzzleByDate,
} from "@/constants/ConnectionsData";
import { Colors, Spacing, TFL } from "@/constants/theme";
import { leaderboard } from "@/lib/leaderboard";
import { useAuthStore } from "@/stores/auth-store";
import { useGameStore } from "@/stores/game-store";
import { ConnectionsState } from "@/types/game";
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

export default function PlayConnectionsScreen() {
  const router = useRouter();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();
  const { user } = useAuthStore();
  const { currentGame, loadGame, createNewGame, saveGame } = useGameStore();
  const [loading, setLoading] = useState(true);
  const [puzzle, setPuzzle] = useState<ConnectionsPuzzle | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/auth");
      return;
    }

    const initGame = async () => {
      const puzzleDate = dateParam || new Date().toISOString().split("T")[0];
      const targetPuzzle =
        getPuzzleByDate(puzzleDate) ?? getDailyPuzzle();
      setPuzzle(targetPuzzle);

      const gameId = `connections_${user.id}_${targetPuzzle.date}`;

      try {
        let game = await loadGame(gameId, user.id);

        if (!game) {
          game = createNewGame(user.id, "connections", gameId);
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to init game:", error);
        Alert.alert("Error", "Failed to load game");
        router.back();
      }
    };

    initGame();
  }, [user, dateParam]);

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

            const timeTaken = Math.floor((endTime - newState.startTime) / 1000);

            if (user.borough) {
              leaderboard
                .submitScore(user.id, user.borough, timeTaken, "connections")
                .catch((err) => console.error("Failed to submit score", err));
            }
          }
        }
      } else {
        newState.mistakesRemaining = Math.max(0, state.mistakesRemaining - 1);

        if (newState.mistakesRemaining === 0) {
          newState.status = "lost";
          newState.endTime = Date.now();
        }
      }

      newState.history = [...state.history, items];

      await saveGame({
        ...currentGame,
        state: newState,
        lastUpdated: new Date().toISOString(),
      });
    },
    [currentGame, puzzle, user, saveGame],
  );

  if (loading || !puzzle || !currentGame) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <HeaderBackButton title="Connections" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      </SafeAreaView>
    );
  }

  const gameState = currentGame.state as ConnectionsState;
  const isGameOver = gameState.status === "won" || gameState.status === "lost";
  const timeTaken = gameState.endTime
    ? Math.floor((gameState.endTime - gameState.startTime) / 1000)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBackButton title="Connections" />

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
            <TouchableOpacity
              style={styles.gameOverButton}
              onPress={() => setShowLeaderboard(true)}
              accessibilityRole="button"
              accessibilityLabel="View leaderboard"
            >
              <Text style={styles.gameOverButtonText}>Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gameOverButton, styles.gameOverButtonPrimary]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Return home"
            >
              <Text
                style={[
                  styles.gameOverButtonText,
                  styles.gameOverButtonTextPrimary,
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
