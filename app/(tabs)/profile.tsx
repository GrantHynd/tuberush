import { PremiumBadge } from '@/components/ui/PremiumBadge';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    FlatList,
} from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, TFL, Typography, Spacing, Layout } from '@/constants/theme';
import { BOROUGHS, Borough } from '@/constants/Boroughs';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, signOut, updateProfile } = useAuthStore();
    const { syncNow, syncStatus } = useGameStore();
    const [boroughModalVisible, setBoroughModalVisible] = useState(false);

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

    const handleBoroughSelect = async (borough: Borough) => {
        try {
            await updateProfile({ borough });
            setBoroughModalVisible(false);
        } catch (error) {
            Alert.alert('Error', 'Failed to update borough');
        }
    };

    if (!user) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyState}>
                    <View style={styles.iconCircle}>
                        <IconSymbol name="person.fill" size={40} color={Colors.light.tint} />
                    </View>
                    <Text style={styles.emptyTitle}>Not Signed In</Text>
                    <Text style={styles.emptyText}>
                        Sign in to save your game progress and compete on the leaderboard.
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
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{user.email[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.headerTitle}>{user.email}</Text>
                {user.isPremium && <PremiumBadge size="small" />}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Preferences</Text>

                <TouchableOpacity
                    style={styles.settingRow}
                    onPress={() => setBoroughModalVisible(true)}
                >
                    <View>
                        <Text style={styles.settingLabel}>London Borough</Text>
                        <Text style={styles.settingValue}>
                            {user.borough || 'Select your borough'}
                        </Text>
                    </View>
                    <IconSymbol name="chevron.right" size={20} color={Colors.light.icon} />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>

                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Membership</Text>
                        <Text style={styles.settingValue}>
                            {user.isPremium ? 'TubeRush Pro' : 'Free'}
                        </Text>
                    </View>
                    {!user.isPremium ? (
                        <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={() => router.push('/subscribe')}
                        >
                            <Text style={styles.upgradeButtonText}>Upgrade</Text>
                        </TouchableOpacity>
                    ) : (Platform.OS === 'ios' || Platform.OS === 'android') ? (
                        <TouchableOpacity
                            style={styles.upgradeButton}
                            onPress={async () => {
                                try {
                                    await RevenueCatUI.presentCustomerCenter();
                                } catch {
                                    Alert.alert('Error', 'Could not open subscription management');
                                }
                            }}
                        >
                            <Text style={styles.upgradeButtonText}>Manage</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Sync Status</Text>
                        <Text style={[styles.settingValue, { fontSize: 12 }]}>{syncStatus.message}</Text>
                    </View>
                    <TouchableOpacity onPress={handleSync}>
                        <IconSymbol name="paperplane.fill" size={20} color={Colors.light.tint} />
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity
                testID="profile-sign-out-button"
                style={styles.signOutButton}
                onPress={handleSignOut}
            >
                <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>

            <Text style={styles.version}>TubeRush v2.0.0</Text>

            <Modal
                visible={boroughModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Borough</Text>
                        <TouchableOpacity onPress={() => setBoroughModalVisible(false)}>
                            <Text style={styles.closeButton}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={BOROUGHS}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.boroughItem}
                                onPress={() => handleBoroughSelect(item)}
                            >
                                <Text style={[
                                    styles.boroughText,
                                    user.borough === item && styles.selectedBoroughText
                                ]}>{item}</Text>
                                {user.borough === item && (
                                    <IconSymbol name="chevron.right" size={20} color={Colors.light.tint} /> // Use checkmark if available
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </SafeAreaView>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    header: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        backgroundColor: Colors.light.card,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: TFL.blue,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
    },
    headerTitle: {
        ...Typography.h3,
        marginBottom: Spacing.xs,
    },
    section: {
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.md,
    },
    sectionTitle: {
        ...Typography.label,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.light.card,
        padding: Spacing.md,
        borderRadius: Layout.borderRadius.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.light.border,
    },
    settingLabel: {
        fontSize: 14,
        color: Colors.light.icon,
        marginBottom: 2,
    },
    settingValue: {
        fontSize: 16,
        color: Colors.light.text,
        fontWeight: '500',
    },
    upgradeButton: {
        backgroundColor: TFL.yellow,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: Layout.borderRadius.sm,
    },
    upgradeButtonText: {
        color: TFL.black,
        fontWeight: 'bold',
        fontSize: 12,
    },
    signOutButton: {
        marginTop: Spacing.xl,
        marginHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: Layout.borderRadius.md,
        borderWidth: 1,
        borderColor: TFL.red,
        alignItems: 'center',
    },
    signOutButtonText: {
        color: TFL.red,
        fontWeight: '600',
        fontSize: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.light.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    emptyTitle: {
        ...Typography.h2,
        marginBottom: Spacing.sm,
    },
    emptyText: {
        ...Typography.body,
        textAlign: 'center',
        color: Colors.light.icon,
        marginBottom: Spacing.xl,
    },
    primaryButton: {
        backgroundColor: Colors.light.tint,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: Layout.borderRadius.md,
    },
    primaryButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        color: Colors.light.icon,
        paddingVertical: Spacing.xl,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
    },
    modalTitle: {
        ...Typography.h3,
    },
    closeButton: {
        color: Colors.light.tint,
        fontSize: 16,
        fontWeight: '600',
    },
    boroughItem: {
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.light.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    boroughText: {
        fontSize: 16,
        color: Colors.light.text,
    },
    selectedBoroughText: {
        color: Colors.light.tint,
        fontWeight: '600',
    },
});
