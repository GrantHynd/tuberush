import { useTheme } from '@/hooks/useTheme';
import { useGameStore } from '@/stores/game-store';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function SyncIndicator() {
    const { colors } = useTheme();
    const syncStatus = useGameStore(state => state.syncStatus);

    const tone = (() => {
        switch (syncStatus.status) {
            case 'synced':
                return { bg: colors.success, ink: colors.onSuccess, mark: '✓' };
            case 'syncing':
                return { bg: colors.info, ink: colors.onInfo, mark: '' };
            case 'pending':
                return { bg: colors.warning, ink: colors.onWarning, mark: '…' };
            case 'error':
                return { bg: colors.error, ink: colors.onError, mark: '!' };
            default:
                return { bg: colors.elevated, ink: colors.text, mark: '–' };
        }
    })();

    return (
        <View style={[styles.container, { backgroundColor: tone.bg, borderColor: colors.border, borderWidth: syncStatus.status === 'offline' ? 1 : 0 }]}>
            {syncStatus.status === 'syncing' ? (
                <ActivityIndicator size="small" color={tone.ink} />
            ) : (
                <Text style={[styles.icon, { color: tone.ink }]}>{tone.mark}</Text>
            )}
            <Text style={[styles.text, { color: tone.ink }]}>{syncStatus.message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    icon: {
        fontSize: 12,
        marginRight: 6,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});
