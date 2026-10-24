import { Card } from '@/components/ui/Card';
import { LegalSection } from '@/components/LegalSection';
import { SyncStatusRow } from '@/components/ui/SyncStatusRow';
import { UpsellCard } from '@/components/ui/UpsellCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { useAuthStore } from '@/stores/auth-store';
import { useGameStore } from '@/stores/game-store';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AlertButton,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Layout, Radius, Spacing, TFL, Typography } from '@/constants/theme';
import { BOROUGHS, Borough } from '@/constants/Boroughs';
import { UK_CITIES, isLondon } from '@/constants/UKCities';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { DisplayNameSheet } from '@/components/profile/DisplayNameSheet';
import { getAvatarInitial, getChosenDisplayName, getOwnDisplayName } from '@/lib/display-utils';
import { formatSettingsLocation } from '@/lib/profile';
import Constants from 'expo-constants';

const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';
const PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

const APPLE_SUBSCRIPTION_NOTICE =
    'Deleting your account does not cancel an Apple subscription. It keeps renewing until you cancel it in the App Store: Settings → [your name] → Subscriptions.';

const PLAY_SUBSCRIPTION_NOTICE =
    'Deleting your account does not cancel a Google Play subscription. It keeps renewing until you cancel it in the Play Store under Payments & subscriptions.';

function subscriptionNotice(): string {
    return Platform.OS === 'android' ? PLAY_SUBSCRIPTION_NOTICE : APPLE_SUBSCRIPTION_NOTICE;
}

function subscriptionManagementUrl(): string {
    return Platform.OS === 'android' ? PLAY_SUBSCRIPTIONS_URL : APPLE_SUBSCRIPTIONS_URL;
}

export default function ProfileScreen() {
    const router = useRouter();
    const { user, signOut, updateProfile, deleteAccount } = useAuthStore();
    const { syncNow, syncStatus } = useGameStore();
    const [locationModalVisible, setLocationModalVisible] = useState(false);
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [nameSheetVisible, setNameSheetVisible] = useState(false);
    const [locationStep, setLocationStep] = useState<'city' | 'borough'>('city');

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

    const handleManageSubscription = () => {
        Linking.openURL(subscriptionManagementUrl()).catch(() => {
            Alert.alert('Subscriptions', subscriptionNotice());
        });
    };

    const handleDeleteAccount = () => {
        if (!user || deletingAccount) return;

        const notice = subscriptionNotice();
        const message =
            `This permanently deletes your account, profile, scores, and custom puzzles. This cannot be undone.\n\n${notice}`;

        const buttons: AlertButton[] = [{ text: 'Cancel', style: 'cancel' }];
        if (user.isPremium) {
            buttons.push({
                text: 'Manage Subscription',
                onPress: () => {
                    Linking.openURL(subscriptionManagementUrl()).catch(() => {
                        Alert.alert('Subscriptions', notice);
                    });
                },
            });
        }
        buttons.push({
            text: 'Delete Account',
            style: 'destructive',
            onPress: async () => {
                setDeletingAccount(true);
                try {
                    await deleteAccount();
                    router.replace('/');
                } catch (error: unknown) {
                    const detail = error instanceof Error ? error.message : 'Please try again.';
                    Alert.alert('Could not delete account', detail);
                } finally {
                    setDeletingAccount(false);
                }
            },
        });

        Alert.alert('Delete account?', message, buttons);
    };

    const handleSync = async () => {
        // Result is reflected passively in the Sync Status row.
        await syncNow();
    };

    const handleCitySelect = (city: string) => {
        if (isLondon(city)) {
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
    };

    const openLocationModal = () => {
        setLocationStep('city');
        setLocationModalVisible(true);
    };

    if (!user) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.headerGutter}>
                    <ScreenHeader title="Profile" />
                </View>
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
                <LegalSection />
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
            <View style={styles.headerGutter}>
                <ScreenHeader title="Profile" />
            </View>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{getAvatarInitial(getOwnDisplayName(user))}</Text>
                </View>
                <Text style={styles.headerTitle} accessibilityRole="header">{getOwnDisplayName(user)}</Text>
                {!getChosenDisplayName(user) && (
                    <TouchableOpacity
                        testID="profile-add-display-name"
                        onPress={() => setNameSheetVisible(true)}
                        accessibilityRole="button"
                        style={styles.addNameLink}
                    >
                        <Text style={styles.addNameLinkText}>Add a display name</Text>
                    </TouchableOpacity>
                )}
                <View style={styles.membershipBadge}>
                    <IconSymbol name="ticket.fill" size={14} color={TFL.black} />
                    <Text style={styles.membershipBadgeText}>{getMembershipTier()}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>SETTINGS</Text>

                <Card variant="grouped">
                    <TouchableOpacity
                        style={styles.cardRow}
                        onPress={openLocationModal}
                        accessibilityRole="button"
                        accessibilityLabel={`City or town: ${formatSettingsLocation(user)}`}
                    >
                        <Text style={styles.rowLabel}>City/Town</Text>
                        <View style={styles.rowRight}>
                            <Text
                                style={styles.rowValueTruncatable}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                accessibilityLabel={formatSettingsLocation(user)}
                            >
                                {formatSettingsLocation(user)}
                            </Text>
                            <IconSymbol name="chevron.right" size={20} color={Colors.light.icon} />
                        </View>
                    </TouchableOpacity>
                </Card>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ACCOUNT</Text>

                <Card variant="grouped">
                    <TouchableOpacity
                        testID="profile-display-name-row"
                        style={styles.cardRow}
                        onPress={() => setNameSheetVisible(true)}
                        accessibilityRole="button"
                        accessibilityLabel={`Display name, ${getOwnDisplayName(user)}`}
                        accessibilityHint="Opens the display name editor"
                    >
                        <Text style={styles.rowLabel}>Display name</Text>
                        <View style={styles.rowRight}>
                            <Text style={styles.rowValueTruncatable} numberOfLines={1}>
                                {getChosenDisplayName(user) ?? 'Add'}
                            </Text>
                            <IconSymbol name="chevron.right" size={20} color={Colors.light.icon} />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.cardDivider} />

                    <View
                        style={styles.cardRow}
                        accessible
                        accessibilityLabel={`Email, ${user.email}, not editable`}
                    >
                        <Text style={styles.rowLabel}>Email</Text>
                        <Text style={styles.rowValueTruncatable} numberOfLines={1} ellipsizeMode="middle">
                            {user.email}
                        </Text>
                    </View>

                    <View style={styles.cardDivider} />

                    {user.isPremium ? (
                        <>
                            <TouchableOpacity
                                testID="profile-manage-subscription"
                                style={styles.cardRow}
                                onPress={handleManageSubscription}
                                accessibilityRole="button"
                                accessibilityLabel="Manage subscription"
                            >
                                <Text style={styles.rowLabel}>Manage subscription</Text>
                                <IconSymbol name="chevron.right" size={20} color={Colors.light.icon} />
                            </TouchableOpacity>
                            <View style={styles.cardDivider} />
                        </>
                    ) : null}

                    <SyncStatusRow syncStatus={syncStatus} onRetry={handleSync} />
                </Card>

                {!user.isPremium ? (
                    <View style={styles.upsell}>
                        <UpsellCard
                            testID="profile-upsell"
                            icon={<IconSymbol name="ticket.fill" size={24} color={Colors.light.text} />}
                            title="Upgrade to 1st Class"
                            badge={null}
                            valueProp="Crossword leaderboards and more"
                            ctaLabel="See 1st Class"
                            onPress={() => router.push('/subscribe')}
                        />
                    </View>
                ) : null}
            </View>

            <LegalSection />

            <TouchableOpacity
                testID="profile-sign-out-button"
                style={styles.signOutButton}
                onPress={handleSignOut}
            >
                <IconSymbol name="arrow.right.square" size={20} color={TFL.red} />
                <Text style={styles.signOutButtonText}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
                testID="profile-delete-account-button"
                style={styles.deleteAccountButton}
                onPress={handleDeleteAccount}
                disabled={deletingAccount}
                accessibilityRole="button"
                accessibilityLabel="Delete account"
            >
                {deletingAccount ? (
                    <ActivityIndicator color={TFL.red} />
                ) : (
                    <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
                )}
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
            <DisplayNameSheet
                visible={nameSheetVisible}
                initialValue={getChosenDisplayName(user)}
                onSave={async (name) => {
                    await updateProfile({ username: name });
                    setNameSheetVisible(false);
                }}
                onDismiss={() => setNameSheetVisible(false)}
            />
        </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    upsell: {
        marginTop: Spacing.md,
    },
    headerGutter: {
        paddingHorizontal: Layout.screenPadding,
    },
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
    addNameLink: {
        minHeight: 44,
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    addNameLinkText: {
        color: Colors.light.tint,
        fontWeight: '600',
        fontSize: 15,
    },
    membershipBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: TFL.yellow,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.pill,
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
    deleteAccountButton: {
        marginTop: Spacing.md,
        marginHorizontal: Spacing.md,
        minHeight: 44,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteAccountButtonText: {
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
