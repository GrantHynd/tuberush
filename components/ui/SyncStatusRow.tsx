import { useTheme } from '@/hooks/useTheme';
import { type Palette, Spacing } from '@/constants/theme';
import type { SyncStatus } from '@/lib/offline-sync-manager';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface SyncPresentation {
    icon: IconName | null;
    color: string;
    label: string;
    /** Short explanation shown under the row when something needs attention. */
    detail?: string;
    canRetry: boolean;
}

/** Map a sync status to what the Profile row shows. Retry is only offered when sync failed or is stale. */
export function getSyncPresentation(syncStatus: SyncStatus | undefined, colors: Palette): SyncPresentation {
    switch (syncStatus?.status) {
        case 'syncing':
            return { icon: null, color: colors.textSecondary, label: 'Syncing…', canRetry: false };
        case 'pending':
            return {
                icon: 'schedule',
                color: colors.textSecondary,
                label: 'Not synced yet',
                detail: `${syncStatus.message}. They'll sync automatically, or retry now.`,
                canRetry: true,
            };
        case 'offline':
            return {
                icon: 'cloud-off',
                color: colors.textSecondary,
                label: 'Offline',
                detail: "Your progress is saved on this device and will sync when you're back online.",
                canRetry: false,
            };
        case 'error':
            return {
                icon: 'error-outline',
                color: colors.error,
                label: 'Sync failed',
                detail: `${syncStatus.message}. Check your connection and try again.`,
                canRetry: true,
            };
        case 'synced':
        case 'online':
        default:
            return { icon: 'check-circle', color: colors.success, label: 'Synced', canRetry: false };
    }
}

interface SyncStatusRowProps {
    syncStatus: SyncStatus | undefined;
    onRetry: () => void;
}

export function SyncStatusRow({ syncStatus, onRetry }: SyncStatusRowProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    const p = getSyncPresentation(syncStatus, colors);

    return (
        <View>
            <View style={styles.row}>
                <Text style={styles.label}>Sync Status</Text>
                <View style={styles.right} accessible testID="sync-status" accessibilityLabel={`Sync status: ${p.label}`}>
                    {p.icon ? (
                        <MaterialIcons name={p.icon} size={18} color={p.color} />
                    ) : (
                        <ActivityIndicator size="small" color={colors.textSecondary} />
                    )}
                    <Text style={styles.value} numberOfLines={1}>
                        {p.label}
                    </Text>
                </View>
                {p.canRetry && (
                    <TouchableOpacity
                        onPress={onRetry}
                        style={styles.retry}
                        accessibilityRole="button"
                        accessibilityLabel="Retry sync"
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                )}
            </View>
            {p.detail && <Text style={styles.detail}>{p.detail}</Text>}
        </View>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.md,
        minHeight: 56,
        gap: Spacing.sm,
    },
    label: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
        flexShrink: 0,
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: Spacing.xs,
        flex: 1,
        minWidth: 0,
    },
    value: {
        fontSize: 16,
        color: colors.textSecondary,
        flexShrink: 1,
    },
    retry: {
        flexShrink: 0,
    },
    retryText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.primary,
    },
    detail: {
        fontSize: 13,
        color: colors.textSecondary,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        marginTop: -Spacing.sm,
    },
});
}

