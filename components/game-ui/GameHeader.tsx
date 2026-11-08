import { BrandMark } from '@/components/ui/BrandMark';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface GameHeaderProps {
    title: string;
    subtitle?: string;
    /** Tonal accent for the 4px strip under the header. */
    lineColor: string;
    onBack: () => void;
    /** Right slot: help / timer / share. */
    right?: React.ReactNode;
    testID?: string;
}

/**
 * Shared game header (Platform): 44pt back, Crossbar Train symbol,
 * title + subtitle, right slot, and a 4px tonal strip underneath.
 */
export function GameHeader({ title, subtitle, lineColor, onBack, right, testID }: GameHeaderProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => makeStyles(colors.text, colors.textSecondary), [colors.text, colors.textSecondary]);
    return (
        <View testID={testID}>
            <View style={styles.row}>
                <Pressable
                    onPress={onBack}
                    style={({ pressed }) => [styles.back, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Go back"
                    testID={testID ? `${testID}-back` : 'game-header-back'}
                >
                    <MaterialIcons name="arrow-back" size={24} color={colors.text} />
                </Pressable>
                <BrandMark size={32} testID={testID ? `${testID}-mark` : 'game-header-mark'} />
                <View style={styles.titles}>
                    <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={2}>
                        {title}
                    </Text>
                    {subtitle ? (
                        <Text style={styles.subtitle} maxFontSizeMultiplier={2}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                {right ? <View style={styles.right}>{right}</View> : null}
            </View>
            <View style={[styles.strip, { backgroundColor: lineColor }]} />
        </View>
    );
}

function makeStyles(text: string, secondary: string) {
    return StyleSheet.create({
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            paddingLeft: Spacing.sm,
            paddingRight: Spacing.md,
            paddingVertical: Spacing.xs,
        },
        back: {
            width: 44,
            height: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
        },
        pressed: { opacity: 0.6 },
        titles: { flex: 1 },
        title: { fontSize: 20, fontWeight: '700', color: text, letterSpacing: -0.2 },
        subtitle: { fontSize: 13, color: secondary },
        right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
        strip: { height: 4 },
    });
}
