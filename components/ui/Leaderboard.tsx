import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Colors, TFL, Typography, Spacing, Layout } from '@/constants/theme';
import { leaderboard } from '@/lib/leaderboard';
import { useAuthStore } from '@/stores/auth-store';
import { Borough } from '@/constants/Boroughs';

interface LeaderboardProps {
    gameType: 'connections';
    date?: string;
    onClose?: () => void;
}

export function Leaderboard({ gameType, date, onClose }: LeaderboardProps) {
    const { user } = useAuthStore();
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'borough'>('all');

    useEffect(() => {
        loadLeaderboard();
    }, [gameType, date, filter]);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            const data = await leaderboard.getLeaderboard(
                gameType,
                date,
                filter === 'borough' ? user?.borough : undefined
            );
            setEntries(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Leaderboard</Text>
                {onClose && (
                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.closeButton}>Close</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'all' && styles.filterActive]}
                    onPress={() => setFilter('all')}
                >
                    <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All London</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterButton, filter === 'borough' && styles.filterActive]}
                    onPress={() => setFilter('borough')}
                    disabled={!user?.borough}
                >
                    <Text style={[styles.filterText, filter === 'borough' && styles.filterTextActive]}>
                        {user?.borough ? user.borough : 'My Borough'}
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={Colors.light.tint} />
                </View>
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => (
                        <View style={[
                            styles.entry,
                            item.user_id === user?.id && styles.entryHighlight
                        ]}>
                            <View style={styles.rank}>
                                <Text style={styles.rankText}>{index + 1}</Text>
                            </View>
                            <View style={styles.info}>
                                <Text style={styles.email}>
                                    {item.profiles?.email?.split('@')[0] || 'Anonymous'}
                                </Text>
                                <Text style={styles.borough}>{item.borough}</Text>
                            </View>
                            <Text style={styles.score}>{formatTime(item.score)}</Text>
                        </View>
                    )}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No scores yet today!</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.light.background,
        borderRadius: Layout.borderRadius.lg,
        padding: Spacing.md,
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        ...Typography.h3,
    },
    closeButton: {
        color: Colors.light.tint,
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
        backgroundColor: Colors.light.card,
        borderRadius: Layout.borderRadius.md,
        padding: 4,
    },
    filterButton: {
        flex: 1,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        borderRadius: Layout.borderRadius.sm,
    },
    filterActive: {
        backgroundColor: Colors.light.background,
        ...Layout.shadow.sm,
    },
    filterText: {
        ...Typography.label,
        color: Colors.light.icon,
    },
    filterTextActive: {
        color: Colors.light.text,
    },
    loadingContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    entry: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    entryHighlight: {
        backgroundColor: Colors.light.warning + '20', // transparent yellow
    },
    rank: {
        width: 30,
        alignItems: 'center',
    },
    rankText: {
        fontWeight: 'bold',
        color: Colors.light.text,
    },
    info: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    email: {
        fontWeight: '600',
        color: Colors.light.text,
    },
    borough: {
        fontSize: 12,
        color: Colors.light.icon,
    },
    score: {
        fontWeight: 'bold',
        color: Colors.light.tint,
    },
    emptyText: {
        textAlign: 'center',
        color: Colors.light.icon,
        padding: Spacing.lg,
    },
});
