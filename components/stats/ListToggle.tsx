import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { TFL } from '@/constants/theme';

export function ListToggle({ asList, onToggle, testID }: { asList: boolean; onToggle: () => void; testID?: string }) {
    return (
        <Pressable onPress={onToggle} accessibilityRole="button" hitSlop={12} testID={testID}>
            <Text style={styles.text}>{asList ? 'View as chart' : 'View as list'}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({ text: { fontSize: 14, fontWeight: '600', color: TFL.blue } });
