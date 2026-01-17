import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, signOut } = useAuthStore();
    const { syncNow, syncStatus } = useGameStore();

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                        router.replace('/');
                    },
                },
            ]
        );
    };

    const handleSync = async () => {
        await syncNow();
        Alert.alert('Sync', 'Sync completed!');
    };

    if (!user) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyIcon}>👤</Text>
                    <Text style={styles.emptyTitle}>Not Signed In</Text>
                    <Text style={styles.emptyText}>
                        Sign in to save your game progress and access premium features
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.push('/auth')}
                    >
                        <Text style={styles.primaryButtonText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerIcon}>👤</Text>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            {/* Account Info */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>

                <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user.email}</Text>
                </View>

                <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Membership</Text>
                    {user.isPremium ? (
                        <PremiumBadge size="medium" />
                    ) : (
                        <View>
                            <Text style={styles.infoValue}>Free</Text>
                            <TouchableOpacity
                                style={styles.upgradeButton}
                                onPress={() => router.push('/subscribe')}
                            >
                                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            {/* Sync Status */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sync</Text>

                <View style={styles.infoCard}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <View style={styles.syncRow}>
                        <Text style={styles.syncStatus}>{syncStatus.message}</Text>
                        <TouchableOpacity
                            style={styles.syncButton}
                            onPress={handleSync}
                        >
                            <Text style={styles.syncButtonText}>Sync Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Actions */}
            <View style={styles.section}>
                <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={handleSignOut}
                >
                    <Text style={styles.signOutButtonText}>Sign Out</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.version}>TubeRush v1.0.0</Text>
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
        paddingBottom: 30,
        backgroundColor: '#3498db',
    },
    headerIcon: {
        fontSize: 60,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 15,
    },
    infoCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    infoLabel: {
        fontSize: 12,
        color: '#7f8c8d',
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    infoValue: {
        fontSize: 16,
        color: '#2c3e50',
        fontWeight: '600',
    },
    upgradeButton: {
        marginTop: 10,
        backgroundColor: '#f39c12',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    upgradeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    syncRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    syncStatus: {
        fontSize: 14,
        color: '#2c3e50',
    },
    syncButton: {
        backgroundColor: '#3498db',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    syncButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    signOutButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    signOutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    emptyIcon: {
        fontSize: 80,
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
    },
    emptyText: {
        fontSize: 16,
        color: '#7f8c8d',
        textAlign: 'center',
        marginBottom: 30,
    },
    primaryButton: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 10,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        color: '#95a5a6',
        paddingVertical: 20,
    },
});
