import { GAMES } from '@/constants/Games';
import { Colors, Layout, Spacing, TFL, Typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/auth-store';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const HORIZONTAL_PADDING = 20;
const CARD_WIDTH = (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

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

        router.push(`/games/play-${gameId}` as never);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.brandRow}>
                        <View style={styles.roundel}>
                            <View style={styles.roundelInner} />
                            <View style={styles.roundelBar} />
                        </View>
                        <View>
                            <Text style={styles.title}>TubeRush</Text>
                            <Text style={styles.tagline}>Beat the commute</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => router.push(user ? '/profile' : '/auth')}
                        style={styles.avatarButton}
                        accessibilityRole="button"
                        accessibilityLabel={user ? 'Profile' : 'Sign in'}
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.email?.[0]?.toUpperCase() ?? '?'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Game Cards - side by side */}
                <View style={styles.cardsRow}>
                    {/* Connections */}
                    <TouchableOpacity
                        testID="game-card-connections"
                        style={[styles.gameCard, styles.connectionsCard]}
                        onPress={() => handleGamePress('connections', false)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Connections, 12.4k live"
                    >
                        <MaterialIcons
                            name="hub"
                            size={36}
                            color="white"
                            style={styles.cardIcon}
                        />
                        <Text style={styles.cardTitle}>Connections</Text>
                        <View style={styles.liveRow}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>12.4k live</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Crossword */}
                    <TouchableOpacity
                        testID="game-card-crossword"
                        style={[styles.gameCard, styles.crosswordCard]}
                        onPress={() => handleGamePress('crossword', true)}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Crossword Puzzle, Premium"
                    >
                        <View style={styles.crownBadge}>
                            <MaterialIcons name="star" size={18} color="#FFD700" />
                        </View>
                        <MaterialIcons
                            name="grid-on"
                            size={36}
                            color="white"
                            style={styles.cardIcon}
                        />
                        <Text style={styles.cardTitle}>Crossword</Text>
                        <Text style={styles.premiumLabel}>Premium</Text>
                    </TouchableOpacity>
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
        paddingHorizontal: HORIZONTAL_PADDING,
        paddingBottom: Spacing.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roundel: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: TFL.red,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
        position: 'relative',
    },
    roundelInner: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: 'white',
    },
    roundelBar: {
        position: 'absolute',
        width: 40,
        height: 6,
        backgroundColor: TFL.blue,
    },
    title: {
        ...Typography.h2,
        fontSize: 24,
        color: Colors.light.text,
        letterSpacing: -0.5,
    },
    tagline: {
        fontSize: 14,
        color: TFL.grey.dark,
        marginTop: 2,
    },
    avatarButton: {
        padding: 4,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: TFL.blue,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
    },
    cardsRow: {
        flexDirection: 'row',
        gap: CARD_GAP,
        marginTop: Spacing.sm,
    },
    gameCard: {
        width: CARD_WIDTH,
        borderRadius: Layout.borderRadius.lg,
        padding: Spacing.md,
        minHeight: 140,
        ...Layout.shadow.md,
    },
    connectionsCard: {
        backgroundColor: TFL.blue,
    },
    crosswordCard: {
        backgroundColor: TFL.red,
    },
    crownBadge: {
        position: 'absolute',
        top: Spacing.sm,
        right: Spacing.sm,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardIcon: {
        marginTop: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
    },
    liveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 6,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22C55E',
    },
    liveText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
    },
    premiumLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
    },
});
