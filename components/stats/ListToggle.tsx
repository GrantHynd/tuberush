import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { type Palette } from '@/constants/theme';

export function ListToggle({ asList, onToggle, testID }: { asList: boolean; onToggle: () => void; testID?: string }) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    return (
        <Pressable onPress={onToggle} accessibilityRole="button" hitSlop={12} testID={testID}>
            <Text style={styles.text}>{asList ? 'View as chart' : 'View as list'}</Text>
        </Pressable>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({ text: { fontSize: 14, fontWeight: '600', color: colors.primary } });
}

