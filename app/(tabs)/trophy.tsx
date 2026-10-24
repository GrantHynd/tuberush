import { GameSummaryCard } from "@/components/leaderboard/GameSummaryCard";
import { LiveBadge } from "@/components/leaderboard/LiveBadge";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { UpsellCard } from "@/components/ui/UpsellCard";
import { MaterialIcons } from "@expo/vector-icons";
import { PersonalSummaryCard } from "@/components/leaderboard/PersonalSummaryCard";
import { GAMES, GameId } from "@/constants/Games";
import { Colors, Layout, Spacing, Typography } from "@/constants/theme";
import { useLeaderboardOverview } from "@/hooks/useLeaderboardOverview";
import { useTodaysNextGame } from "@/hooks/useTodaysNextGame";
import { getRankingPrompt } from "@/lib/today-puzzles";
import { capture } from "@/lib/posthog";
import { getCurrentWeek, getWeekLabel, isCurrentWeek } from "@/lib/week-utils";
import { useAuthStore } from "@/stores/auth-store";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TrophyScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const week = useMemo(() => getCurrentWeek(), []);
  const { games, stats, loading, error } = useLeaderboardOverview(
    week.start,
    week.end,
  );

  useEffect(() => {
    capture("leaderboard_overview_viewed");
  }, []);

  const playNext = useTodaysNextGame();
  const gameIds = Object.keys(GAMES) as GameId[];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Leaderboard"
          subtitle="See where you stand across all games."
        />

        <View style={styles.weekRow}>
          <Text style={styles.weekLabel}>
            {getWeekLabel(week.start, week.end)}
          </Text>
          {isCurrentWeek(week.start) && <LiveBadge />}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            {user && stats.topPercent == null ? (
              <EmptyState
                testID="trophy-unranked"
                icon="emoji-events"
                title="You're not on the board yet"
                body={getRankingPrompt(user)}
                actionLabel="Play today's puzzle"
                onAction={playNext}
              />
            ) : user && stats.topPercent != null ? (
              <PersonalSummaryCard
                overallRank={stats.overallRank}
                totalScore={stats.totalScore}
                topPercent={stats.topPercent}
              />
            ) : null}

            <View style={styles.gamesSection}>
              {gameIds.map((gameId) => {
                const gameData = games.find((g) => g.gameType === gameId);
                if (!gameData) return null;

                const game = GAMES[gameId];
                const isLocked = game.isPremium && !user?.isPremium;

                if (isLocked) {
                  return (
                    <UpsellCard
                      key={gameId}
                      testID={`upsell-${gameId}`}
                      icon={
                        <MaterialIcons
                          name={game.icon}
                          size={24}
                          color={Colors.light.text}
                        />
                      }
                      title={game.name}
                      titleIsHeader
                      valueProp={`See your ${game.name.split(" ")[0]} rank and the full weekly board`}
                      onPress={() => router.push("/subscribe" as never)}
                    />
                  );
                }

                return (
                  <GameSummaryCard
                    key={gameId}
                    data={gameData}
                    currentUserId={user?.id}
                    onFullBoard={() =>
                      router.push(
                        `/leaderboard/game?gameType=${gameId}` as never,
                      )
                    }
                  />
                );
              })}
            </View>
          </>
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
  scroll: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.xxl,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.md,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },
  errorText: {
    ...Typography.caption,
    color: Colors.light.error,
  },
  gamesSection: {
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
});
