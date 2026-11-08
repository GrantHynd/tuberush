import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { type Palette, Spacing } from '@/constants/theme';

export function LiveBadge() {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    return (
        <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.text}>LIVE</Text>
        </View>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.success + '18',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.success,
    },
    text: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.success,
        letterSpacing: 0.5,
    },
});
}

