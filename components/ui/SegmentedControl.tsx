import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, TFL } from '@/constants/theme';

export interface Segment<T extends string> {
    value: T;
    label: string;
    accessibilityLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
    segments: Segment<T>[];
    value: T;
    onChange: (value: T) => void;
    testID?: string;
}

/** Shared tab-style control (TUB-260, TUB-265). Selection = fill + weight + colour, never colour alone. */
export function SegmentedControl<T extends string>({ segments, value, onChange, testID }: SegmentedControlProps<T>) {
    return (
        <View style={styles.track} accessibilityRole="tablist" testID={testID}>
            {segments.map((s) => {
                const selected = s.value === value;
                return (
                    <Pressable
                        key={s.value}
                        testID={testID ? `${testID}-${s.value}` : undefined}
                        onPress={() => onChange(s.value)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        accessibilityLabel={s.accessibilityLabel ?? s.label}
                        hitSlop={{ top: 4, bottom: 4 }}
                        style={[styles.segment, selected && styles.selected]}
                    >
                        <Text numberOfLines={1} style={[styles.label, selected && styles.labelSelected]}>
                            {s.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    track: {
        flexDirection: 'row',
        height: 36,
        padding: 2,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: Colors.light.border,
        backgroundColor: Colors.light.card,
    },
    segment: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Radius.md - 2,
        paddingHorizontal: 6,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selected: { backgroundColor: '#FFFFFF', borderColor: Colors.light.border },
    label: { fontSize: 14, fontWeight: '500', color: TFL.grey.dark },
    labelSelected: { fontWeight: '600', color: TFL.blue },
});
