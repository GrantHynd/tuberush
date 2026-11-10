import { useTheme } from '@/hooks/useTheme';
import { type Palette, FontFamily, Spacing, Typography } from '@/constants/theme';
import { GameType } from '@/types/game';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface GameTypeBadgeProps {
    gameType: GameType;
}

export function GameTypeBadge({ gameType }: GameTypeBadgeProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    const isConnections = gameType === 'connections';
    const label = isConnections ? 'INT' : 'CRO';
    const backgroundColor = isConnections ? colors.gameInterchange : colors.gameCrossword;

    return (
        <View style={[styles.badge, { backgroundColor }]}>
            <Text style={styles.label}>{label}</Text>
        </View>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
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
        fontFamily: FontFamily.bold,
        fontSize: 11,
        fontWeight: '700',
        color: colors.onPrimary,
        letterSpacing: 0.5,
    },
});
}

