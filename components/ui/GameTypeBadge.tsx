import { TFL, Spacing, Typography } from '@/constants/theme';
import { GameType } from '@/types/game';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface GameTypeBadgeProps {
    gameType: GameType;
}

export function GameTypeBadge({ gameType }: GameTypeBadgeProps) {
    const isConnections = gameType === 'connections';
    const label = isConnections ? 'CON' : 'CRO';
    const backgroundColor = isConnections ? TFL.blue : TFL.red;

    return (
        <View style={[styles.badge, { backgroundColor }]}>
            <Text style={styles.label}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: 6,
        minWidth: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        ...Typography.label,
        fontSize: 11,
        fontWeight: '700',
        color: TFL.white,
        letterSpacing: 0.5,
    },
});
