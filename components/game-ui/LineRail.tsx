import { difficultyLine, FontScaleCap, FontFamily, Size, StateColors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface LineRailProps {
    level: number;
    category: string;
    items: string[];
    /** found = "✓ FOUND", revealed = dashed rail + "REVEALED" chip, none = plain (in-play solved). */
    marker?: 'found' | 'revealed' | 'none';
    testID?: string;
}

/** A Connections group drawn as a numbered tube line: badge, rail and four station dots. */
export function LineRail({ level, category, items, marker = 'none', testID }: LineRailProps) {
    const line = difficultyLine(level);
    const revealed = marker === 'revealed';
    const stateText = marker === 'found' ? ', found' : revealed ? ', revealed' : '';
    return (
        <View
            testID={testID}
            accessible
            accessibilityLabel={`Group ${line.level}, ${category}${stateText}: ${items.join(', ')}`}
            style={styles.card}
        >
            <View style={styles.head}>
                <View style={[styles.num, { backgroundColor: line.color }]}>
                    <Text style={[styles.numText, { color: line.text }]} maxFontSizeMultiplier={1.4}>
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
                    <View style={styles.rv}>
                        <Text style={styles.rvText} maxFontSizeMultiplier={FontScaleCap.tile}>
                            REVEALED
                        </Text>
                    </View>
                ) : null}
            </View>
            <View style={styles.railWrap}>
                {revealed ? (
                    <View style={styles.dashedRail}>
                        {Array.from({ length: 16 }).map((_, i) => (
                            <View key={i} style={[styles.dash, { backgroundColor: line.color }]} />
                        ))}
                    </View>
                ) : (
                    <View style={[styles.rail, { backgroundColor: line.color }]} />
                )}
            </View>
            <View style={styles.stops}>
                {items.map((it) => (
                    <View key={it} style={styles.stop}>
                        <View style={[styles.dot, { borderColor: line.color }]} />
                        <Text style={styles.stopText} maxFontSizeMultiplier={FontScaleCap.tile}>
                            {it}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderColor: StateColors.hairline,
        borderRadius: Size.radius,
        paddingTop: 10,
        paddingBottom: 8,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    num: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    numText: { fontFamily: FontFamily.bold, fontSize: 12, fontWeight: '700' },
    name: { fontFamily: FontFamily.bold, fontSize: 14, fontWeight: '700', color: StateColors.ink, flexShrink: 1 },
    ok: { marginLeft: 'auto', fontFamily: FontFamily.bold, fontSize: 11, fontWeight: '700', color: StateColors.found },
    rv: {
        marginLeft: 'auto',
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: StateColors.inactiveText,
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 1,
        backgroundColor: '#FFFFFF',
    },
    rvText: { fontFamily: FontFamily.bold, fontSize: 11, fontWeight: '700', color: '#111111' },
    railWrap: { marginTop: 10, marginHorizontal: 6 },
    rail: { height: 6, borderRadius: 3 },
    dashedRail: { height: 6, flexDirection: 'row', justifyContent: 'space-between' },
    dash: { width: '4.5%', height: 6, borderRadius: 1 },
    stops: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -10 },
    stop: { width: '25%', alignItems: 'center' },
    dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 3 },
    stopText: {
        fontFamily: FontFamily.semibold,
        fontSize: 12,
        fontWeight: '600',
        color: StateColors.ink,
        marginTop: 3,
        textAlign: 'center',
    },
});
