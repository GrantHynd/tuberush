import { useGameStore } from '@/stores/game-store';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function SyncIndicator() {
    const syncStatus = useGameStore(state => state.syncStatus);

    const getStatusColor = () => {
        switch (syncStatus.status) {
            case 'synced':
                return '#27ae60';
            case 'syncing':
                return '#3498db';
            case 'pending':
                return '#f39c12';
            case 'offline':
                return '#95a5a6';
            case 'error':
                return '#e74c3c';
            default:
                return '#95a5a6';
        }
    };

    const getStatusIcon = () => {
        switch (syncStatus.status) {
            case 'synced':
                return '✓';
            case 'pending':
                return '⏳';
            case 'offline':
                return '📡';
            case 'error':
                return '⚠️';
            default:
                return '○';
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: getStatusColor() }]}>
            {syncStatus.status === 'syncing' ? (
                <ActivityIndicator size="small" color="#fff" />
            ) : (
                <Text style={styles.icon}>{getStatusIcon()}</Text>
            )}
            <Text style={styles.text}>{syncStatus.message}</Text>
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
        color: '#fff',
        fontSize: 12,
        marginRight: 6,
    },
    text: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});
