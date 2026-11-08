import { FontFamily, FontScaleCap, interchangeGroup, Size } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface LineRailProps {
    level: number;
    category: string;
    items: string[];
    /** found = "✓ FOUND", revealed = dashed border + "REVEALED" chip, none = plain (in-play solved). */
    marker?: 'found' | 'revealed' | 'none';
    testID?: string;
}

/**
 * A solved Interchange group: numbered square badge, category label, the four
 * words, and a pip count equal to the group number. Fill tone is not the identifier.
 */
export function LineRail({ level, category, items, marker = 'none', testID }: LineRailProps) {
    const { colors } = useTheme();
    const line = interchangeGroup(level);
    const revealed = marker === 'revealed';
    const stateText = marker === 'found' ? ', found' : revealed ? ', revealed' : '';
    const styles = useMemo(() => makeStyles(colors.border, line.text), [colors.border, line.text]);
    return (
        <View
            testID={testID}
            accessible
            accessibilityLabel={`Group ${line.level}, ${category}${stateText}: ${items.join(', ')}`}
            style={[
                styles.card,
                { backgroundColor: line.fill, borderColor: colors.border },
                revealed && styles.revealed,
            ]}
        >
            <View style={styles.head}>
                <View style={[styles.num, { borderColor: line.text }]}>
                    <Text style={styles.numText} maxFontSizeMultiplier={1.4}>
                        {line.level}
                    </Text>
                </View>
                <Text style={styles.name} maxFontSizeMultiplier={FontScaleCap.tile}>
                    {category}
                </Text>
                {marker === 'found' ? (
                    <Text style={styles.ok} maxFontSizeMultiplier={FontScaleCap.tile}>
                        ✓ FOUND
                    </Text>
                ) : null}
                {revealed ? (
                    <View style={[styles.rv, { borderColor: line.text }]}>
                        <Text style={styles.rvText} maxFontSizeMultiplier={FontScaleCap.tile}>
                            REVEALED
                        </Text>
                    </View>
                ) : null}
            </View>
            <Text style={styles.words} maxFontSizeMultiplier={FontScaleCap.tile}>
                {items.map((item, index) => (
                    <Text key={item}>
                        {index > 0 ? ' · ' : ''}
                        {item}
                    </Text>
                ))}
            </Text>
            <View style={styles.pips} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {Array.from({ length: line.level }).map((_, i) => (
                    <View key={i} style={[styles.pip, { backgroundColor: line.text }]} />
                ))}
            </View>
        </View>
    );
}

function makeStyles(border: string, ink: string) {
    return StyleSheet.create({
        card: {
            borderWidth: 1,
            borderColor: border,
            borderRadius: Size.radius,
            paddingTop: 10,
            paddingBottom: 10,
            paddingHorizontal: 16,
        },
        revealed: { borderStyle: 'dashed', borderWidth: 1.5 },
        head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        num: {
            width: 22,
            height: 22,
            borderRadius: 4,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
        },
        numText: { fontFamily: FontFamily.bold, fontSize: 12, fontWeight: '700', color: ink },
        name: { fontFamily: FontFamily.bold, fontSize: 14, fontWeight: '700', color: ink, flexShrink: 1 },
        ok: { marginLeft: 'auto', fontFamily: FontFamily.bold, fontSize: 11, fontWeight: '700', color: ink },
        rv: {
            marginLeft: 'auto',
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderRadius: 999,
            paddingHorizontal: 8,
            paddingVertical: 1,
        },
        rvText: { fontFamily: FontFamily.bold, fontSize: 11, fontWeight: '700', color: ink },
        words: {
            fontFamily: FontFamily.semibold,
            fontSize: 13,
            fontWeight: '600',
            color: ink,
            marginTop: 8,
        },
        pips: { flexDirection: 'row', gap: 4, marginTop: 8 },
        pip: { width: 8, height: 8, borderRadius: 2 },
    });
}
