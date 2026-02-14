import { GameCard } from '@/components/ui/GameCard';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import { GAMES } from '@/constants/Games';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, TFL, Typography, Spacing, Layout } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleGamePress = (gameId: string, isPremium: boolean) => {
    if (!user) {
      router.push('/auth');
      return;
    }

    if (isPremium && !user.isPremium) {
       router.push('/subscribe');
       return;
    }

    router.push(`/games/play-${gameId}` as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
            <View style={styles.logoContainer}>
                <View style={styles.roundel}>
                    <View style={styles.roundelInner} />
                    <View style={styles.roundelBar} />
                </View>
                <Text style={styles.title}>TubeRush</Text>
            </View>
            <SyncIndicator />
        </View>

        {/* Welcome / Promo */}
        <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
                {user ? `Welcome back, ${user.email?.split('@')[0]}!` : 'Mind the Gap. Play the Game.'}
            </Text>
            {!user && (
                <TouchableOpacity style={styles.signInButton} onPress={() => router.push('/auth')}>
                    <Text style={styles.signInText}>Sign In / Register</Text>
                </TouchableOpacity>
            )}
        </View>

        {/* Games Grid */}
        <View style={styles.gamesSection}>
            <Text style={styles.sectionTitle}>Daily Challenges</Text>

            {Object.values(GAMES).map((game) => (
                <GameCard
                    key={game.id}
                    id={game.id}
                    title={game.name}
                    description={game.description}
                    icon={game.icon}
                    isPremium={game.isPremium}
                    isLocked={game.isPremium && !user?.isPremium}
                    color={game.color}
                    onPress={() => handleGamePress(game.id, game.isPremium)}
                />
            ))}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
             <Text style={styles.footerText}>Transport for London inspired games</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundel: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TFL.red,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    position: 'relative',
  },
  roundelInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
  },
  roundelBar: {
    position: 'absolute',
    width: 36,
    height: 6,
    backgroundColor: TFL.blue,
  },
  title: {
    ...Typography.h2,
    color: TFL.blue,
    letterSpacing: -0.5,
  },
  welcomeSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.light.card,
    margin: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
  },
  welcomeText: {
    ...Typography.h3,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: TFL.black,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
  },
  signInText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  gamesSection: {
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  footer: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
  },
  footerText: {
    ...Typography.caption,
    opacity: 0.6,
  },
});
