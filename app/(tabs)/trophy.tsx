import { GameSummaryCard } from "@/components/leaderboard/GameSummaryCard";
import { LiveBadge } from "@/components/leaderboard/LiveBadge";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { UpsellCard } from "@/components/ui/UpsellCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import {
  areaSegmentLabel,
  defaultBoardFilter,
  getUserArea,
  loadBoardFilter,
  saveBoardFilter,
  type BoardFilter,
} from "@/lib/leaderboard-filter";
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
import React, { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
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
  const area = getUserArea(user);

  // TUB-265: Everyone / My area. Defaults to My area when set; remembered per user.
  const [chosen, setChosen] = useState<{ uid: string; filter: BoardFilter } | null>(null);
  const [stored, setStored] = useState<{ uid: string; filter: BoardFilter } | null>(null);
  const uid = user?.id ?? null;
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    loadBoardFilter(uid).then((f) => {
      if (alive && f) setStored({ uid, filter: f });
    });
    return () => {
      alive = false;
    };
  }, [uid]);
  const filter: BoardFilter = !user
    ? "everyone"
    : (chosen?.uid === user.id ? chosen.filter : null) ??
      (stored?.uid === user.id ? stored.filter : null) ??
      defaultBoardFilter(user);
  const areaActive = filter === "area" && !!area;

  const changeFilter = (next: BoardFilter) => {
    if (!user) return;
    setChosen({ uid: user.id, filter: next });
    saveBoardFilter(user.id, next);
    capture("leaderboard_filter_changed", { filter: next });
    AccessibilityInfo.announceForAccessibility?.(
      next === "area" ? `Showing My area${area ? `, ${area.name}` : ""}` : "Showing Everyone",
    );
  };

  const areaCity = areaActive && area ? area.city : null;
  const areaBorough = areaActive && area ? area.borough : null;
  // The overview hook keys on city/borough values, so a fresh object each render is fine.
  const areaScope = areaCity ? { city: areaCity, borough: areaBorough } : null;
  const { games, stats, loading, error } = useLeaderboardOverview(
    week.start,
    week.end,
    areaScope,
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

        {user && (
          <View style={styles.filter}>
            <SegmentedControl<BoardFilter>
              testID="board-filter"
              value={filter}
              onChange={changeFilter}
              segments={[
                { value: "everyone", label: "Everyone" },
                {
                  value: "area",
                  label: area ? areaSegmentLabel(area.name) : "My area",
                  accessibilityLabel: area ? `My area, ${area.name}` : "My area",
                },
              ]}
            />
            {areaActive && area && (
              <Text style={styles.filterCaption}>Commuters in {area.name}</Text>
            )}
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
          </View>
        ) : error ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : filter === "area" && !area ? (
          <EmptyState
            testID="board-set-area"
            icon="place"
            title="Set your area"
            body="Choose your city or borough to compare with commuters near you."
            actionLabel="Set area"
            onAction={() => router.push("/profile" as never)}
          />
        ) : (
          <>
            {areaActive && area && stats.totalPlayers < 3 && (
              <Text style={styles.fewPlayers} testID="board-few-players">
                Only {stats.totalPlayers} commuter{stats.totalPlayers === 1 ? "" : "s"} in {area.name} so far this week.
              </Text>
            )}
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
                areaName={areaActive ? area?.name : null}
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
                        `/leaderboard/game?gameType=${gameId}${areaActive ? "&filter=area" : ""}` as never,
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
  filter: {
    marginBottom: Spacing.md,
  },
  filterCaption: {
    ...Typography.caption,
    color: "#4B5563",
    marginTop: Spacing.xs,
  },
  fewPlayers: {
    ...Typography.caption,
    color: "#4B5563",
    marginBottom: Spacing.sm,
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.s12,
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
