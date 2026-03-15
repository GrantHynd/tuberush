import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, TFL, Typography, Spacing, Layout } from '@/constants/theme';
import { BOROUGHS, Borough } from '@/constants/Boroughs';
import { UK_CITIES, isLondon } from '@/constants/UKCities';
import { IconSymbol } from '@/components/ui/icon-symbol';
import Constants from 'expo-constants';

function getLocationDisplayValue(user: { city?: string | null; borough?: string | null }): string {
    if (!user.city) return 'Not set';
    if (isLondon(user.city) && user.borough) {
        return `London, ${user.borough}`;
    }
    return user.city;
}

export default function ProfileScreen() {
    const router = useRouter();
    const { user, signOut, updateProfile } = useAuthStore();
    const { syncNow } = useGameStore();
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [locationStep, setLocationStep] = useState<'city' | 'borough'>('city');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selectedCity, setSelectedCity] = useState<string | null>(null);

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

    const handleCitySelect = (city: string) => {
        if (isLondon(city)) {
            setSelectedCity(city);
            setLocationStep('borough');
        } else {
            handleLocationComplete(city, null);
        }
    };

    const handleBoroughSelect = async (borough: Borough) => {
        handleLocationComplete('London', borough);
    };

    const handleLocationComplete = async (city: string, borough: Borough | null) => {
        try {
            await updateProfile({ city, borough });
            setLocationModalVisible(false);
            setLocationStep('city');
            setSelectedCity(null);
        } catch (err) {
            console.error('Failed to update location:', err);
            Alert.alert(
                'Error',
                'Failed to update location. The database may need the city column added. Run the migration in your Supabase project (see supabase/README.md).'
            );
        }
    };

    const handleLocationModalClose = () => {
        setLocationModalVisible(false);
        setLocationStep('city');
        setSelectedCity(null);
    };

    const openLocationModal = () => {
        setLocationStep('city');
        setSelectedCity(null);
        setLocationModalVisible(true);
    };

    if (!user) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <HeaderBackButton title="Settings" />
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
            </SafeAreaView>
        );
    }

    const getMembershipTier = () => {
        return user?.isPremium ? '1st Class' : 'Free';
    };

    const showBoroughStep = locationModalVisible && locationStep === 'borough';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView style={styles.scrollContainer}>
            <HeaderBackButton title="Settings" />
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{user.email[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.headerTitle}>{user.email}</Text>
                <View style={styles.membershipBadge}>
                    <IconSymbol name="ticket.fill" size={14} color={TFL.black} />
                    <Text style={styles.membershipBadgeText}>{getMembershipTier()}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>PREFERENCES</Text>

                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.cardRow}
                        onPress={openLocationModal}
                        accessibilityRole="button"
                        accessibilityLabel={`City or town: ${getLocationDisplayValue(user)}`}
                    >
                        <Text style={styles.rowLabel}>City/Town</Text>
                        <View style={styles.rowRight}>
                            <Text
                                style={styles.rowValueTruncatable}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                accessibilityLabel={getLocationDisplayValue(user)}
                            >
                                {getLocationDisplayValue(user)}
                            </Text>
                            <IconSymbol name="chevron.right" size={20} color={Colors.light.icon} />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACCOUNT</Text>

                <View style={styles.card}>
                    <View style={styles.cardRow}>
                        <Text style={styles.rowLabel}>Membership</Text>
                        <Text style={styles.rowValueTruncatable} numberOfLines={1} ellipsizeMode="tail">
                            {getMembershipTier()}
                        </Text>
                    </View>
                    
                    <View style={styles.cardDivider} />
                    
                    <View style={styles.cardRow}>
                        <Text style={styles.rowLabel}>Sync Status</Text>
                        <View style={styles.rowRight}>
                            <Text style={styles.rowValueTruncatable} numberOfLines={1} ellipsizeMode="tail">
                                Synced
                            </Text>
                            <TouchableOpacity onPress={handleSync} style={styles.syncButton} accessibilityLabel="Sync now">
                                <IconSymbol name="arrow.clockwise" size={20} color={Colors.light.tint} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                testID="profile-sign-out-button"
                style={styles.signOutButton}
                onPress={handleSignOut}
            >
                <IconSymbol name="arrow.right.square" size={20} color={TFL.red} />
                <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>

            <Text style={styles.version}>TubeRush v{Constants.expoConfig?.version || '1.0.0'}</Text>

            {!showBoroughStep && (
                <SearchSelect
                    options={[...UK_CITIES]}
                    value={user.city ?? null}
                    onSelect={handleCitySelect}
                    placeholder="Search cities..."
                    accessibilityLabel="Search and select your city or town"
                    modalTitle="Select City/Town"
                    visible={locationModalVisible}
                    onClose={handleLocationModalClose}
                    closeOnSelect={(city) => !isLondon(city)}
                />
            )}

            <Modal
                visible={showBoroughStep}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleLocationModalClose}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Borough</Text>
                        <TouchableOpacity
                            onPress={handleLocationModalClose}
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                        >
                            <Text style={styles.closeButton}>Close</Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={BOROUGHS}
                        keyExtractor={(item) => item}
                        accessibilityRole="list"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.boroughItem}
                                onPress={() => handleBoroughSelect(item)}
                                accessibilityRole="button"
                                accessibilityLabel={item}
                                accessibilityState={{
                                    selected: user.borough === item,
                                }}
                            >
                                <Text style={[
                                    styles.boroughText,
                                    user.borough === item && styles.selectedBoroughText
                                ]}>{item}</Text>
                                {user.borough === item && (
                                    <IconSymbol name="checkmark.circle.fill" size={22} color={Colors.light.tint} />
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </SafeAreaView>
            </Modal>
        </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },
    scrollContainer: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        backgroundColor: Colors.light.background,
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
        fontSize: 18,
        fontWeight: '700',
        color: Colors.light.text,
        marginBottom: Spacing.sm,
    },
    membershipBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: TFL.yellow,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: 16,
        gap: 6,
    },
    membershipBadgeText: {
        fontSize: 13,
        fontWeight: '600',
        color: TFL.black,
    },
    section: {
        marginTop: Spacing.lg,
        paddingHorizontal: Spacing.md,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: TFL.grey.dark,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    card: {
        backgroundColor: Colors.light.card,
        borderRadius: Layout.borderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.light.border,
        overflow: 'hidden',
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        minHeight: 56,
    },
    cardDivider: {
        height: 1,
        backgroundColor: Colors.light.border,
        marginHorizontal: Spacing.md,
    },
    rowLabel: {
        fontSize: 16,
        color: Colors.light.text,
        fontWeight: '500',
        flexShrink: 0,
    },
    rowValue: {
        fontSize: 16,
        color: Colors.light.icon,
        fontWeight: '400',
    },
    rowValueTruncatable: {
        fontSize: 16,
        color: Colors.light.icon,
        fontWeight: '400',
        flex: 1,
        minWidth: 0,
        textAlign: 'right',
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flex: 1,
        minWidth: 0,
    },
    syncButton: {
        marginLeft: 4,
        flexShrink: 0,
    },
    signOutButton: {
        marginTop: Spacing.xl,
        marginHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: Layout.borderRadius.md,
        borderWidth: 2,
        borderColor: TFL.red,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
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
        minHeight: 56,
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
