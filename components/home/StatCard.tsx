import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { type Palette, Spacing, Typography } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

export interface StatCardProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    label: string;
    value: string;
    /** Optional sublabel shown below the value (e.g. game type) */
    sublabel?: string;
}

export function StatCard({ icon, label, value, sublabel }: StatCardProps) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    return (
        <Card variant="tinted" style={styles.card} accessible>
            <MaterialIcons
                name={icon}
                size={24}
                color={colors.textSecondary}
                style={styles.icon}
            />
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
            {sublabel ? (
                <Text style={styles.sublabel}>{sublabel}</Text>
            ) : null}
        </Card>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    card: {
        flex: 1,
        minHeight: 80,
    },
    icon: {
        marginBottom: Spacing.xs,
    },
    label: {
        ...Typography.caption,
        marginBottom: 2, color: colors.text },
    value: {
        ...Typography.h2,
        fontSize: 22, color: colors.text },
    sublabel: {
        ...Typography.caption,
        marginTop: 2,
        color: colors.textSecondary,
        textTransform: 'capitalize',
    },
});
}

