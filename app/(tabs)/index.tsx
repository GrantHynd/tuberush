import { GameCard } from '@/components/ui/GameCard';
import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import { GAMES } from '@/constants/Games';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);

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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🎮</Text>
        <Text style={styles.title}>TubeRush</Text>
        <Text style={styles.subtitle}>Play awesome games!</Text>
      </View>

      {/* User Status */}
      <View style={styles.statusBar}>
        {user ? (
          <View style={styles.userInfo}>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.isPremium && <PremiumBadge size="small" />}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        )}

        <SyncIndicator />
      </View>

      {/* Premium Promotion */}
      {user && !user.isPremium && (
        <TouchableOpacity
          style={styles.premiumPromo}
          onPress={() => router.push('/subscribe')}
        >
          <Text style={styles.promoIcon}>⭐</Text>
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>Unlock Premium Games</Text>
            <Text style={styles.promoText}>Get access to exclusive crossword puzzles and more!</Text>
          </View>
          <Text style={styles.promoArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Games List */}
      <View style={styles.gamesSection}>
        <Text style={styles.sectionTitle}>Available Games</Text>

        {Object.values(GAMES).map(game => (
          <GameCard
            key={game.id}
            id={game.id}
            title={game.name}
            description={game.description}
            icon={game.icon}
            isPremium={game.isPremium}
            isLocked={game.isPremium && !user?.isPremium}
            onPress={() => handleGamePress(game.id, game.isPremium)}
          />
        ))}
      </View>

      {/* Account Actions */}
      {user && (
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => useAuthStore.getState().signOut()}
          >
            <Text style={styles.actionButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: '#3498db',
  },
  logo: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#ecf0f1',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userEmail: {
    fontSize: 14,
    color: '#2c3e50',
  },
  signInButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  signInText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  premiumPromo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f39c12',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  promoIcon: {
    fontSize: 40,
    marginRight: 15,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  promoText: {
    fontSize: 14,
    color: '#fff',
  },
  promoArrow: {
    fontSize: 24,
    color: '#fff',
  },
  gamesSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  actionsSection: {
    padding: 15,
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
