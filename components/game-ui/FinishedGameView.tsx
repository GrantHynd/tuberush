import { FontFamily, FontScaleCap, GameType, Size } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { announce, decorativeIconProps } from '@/lib/a11y';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, findNodeHandle, Pressable, StyleSheet, Text, View } from 'react-native';

export interface FinishedStat {
    label: string;
    value: string;
    /** Spoken form, e.g. "Time, 1 minute 42". */
    accessibilityLabel?: string;
}

export interface FinishedGameViewProps {
    outcome: 'win' | 'loss';
    lineColor: string;
    title: string;
    detail?: string;
    /** Shown on the right of the sign (win). */
    time?: string;
    /** Solved board (line rails, filled grid...). */
    board: React.ReactNode;
    stats: FinishedStat[];
    onLeaderboard?: () => void;
    onShare?: () => void;
    /** Next-puzzle countdown slot (TUB-302 fills this; empty by default). */
    nextPuzzle?: React.ReactNode;
    /**
     * True only for the live transition (game just ended): animates in, announces and focuses the
     * sign. False when reopening from saved state: renders immediately, no motion, no announcement.
     */
    justFinished?: boolean;
    announcement?: string;
    testID?: string;
}

/**
 * Permanent, inline finished-game page state (not a modal or sheet). Reopening a finished
 * puzzle renders exactly the same page from saved state.
 */
export function FinishedGameView({
    outcome,
    lineColor,
    title,
    detail,
    time,
    board,
    stats,
    onLeaderboard,
    onShare,
    nextPuzzle,
    justFinished = false,
    announcement,
    testID = 'finished-game-view',
}: FinishedGameViewProps) {
    const { colors } = useTheme();
    const reduceMotion = useReduceMotion();
    const signRef = useRef<React.ComponentRef<typeof View>>(null);
    const [fade] = useState(() => new Animated.Value(justFinished ? 0 : 1));
    const [slide] = useState(() => new Animated.Value(justFinished ? -8 : 0));
    const styles = useMemo(
        () => makeStyles(colors.text, colors.textSecondary, colors.border, colors.surface, colors.onPrimary, colors.toastText),
        [colors],
    );

    useEffect(() => {
        if (!justFinished) return;
        Animated.parallel([
            Animated.timing(fade, { toValue: 1, duration: reduceMotion ? 200 : 300, useNativeDriver: true }),
            Animated.timing(slide, { toValue: 0, duration: reduceMotion ? 0 : 300, useNativeDriver: true }),
        ]).start();
        if (announcement) announce(announcement);
        const t = setTimeout(() => {
            try {
                const node = signRef.current ? findNodeHandle(signRef.current) : null;
                if (node) AccessibilityInfo.setAccessibilityFocus?.(node);
            } catch {
                // view already unmounted / torn down; focus is best-effort
            }
        }, 400);
        return () => clearTimeout(t);
        // Run once per mount of a just-finished view.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const signColor = outcome === 'win' ? lineColor : colors.toast;
    const signInk = outcome === 'win' ? colors.onPrimary : colors.toastText;

    return (
        <Animated.View testID={testID} style={{ opacity: fade }}>
            <Animated.View style={{ transform: [{ translateY: slide }] }}>
                <View
                    ref={signRef}
                    testID={`${testID}-sign`}
                    accessible
                    accessibilityRole="header"
                    accessibilityLabel={[title, detail, time ? `Time ${time}` : null].filter(Boolean).join('. ')}
                    style={[styles.sign, { backgroundColor: signColor }]}
                >
                    <View style={styles.signText}>
                        <Text style={[styles.signTitle, { color: signInk }]} maxFontSizeMultiplier={FontScaleCap.chrome}>
                            {title}
                        </Text>
                        {detail ? (
                            <Text style={[styles.signDetail, { color: signInk }]} maxFontSizeMultiplier={FontScaleCap.chrome}>
                                {detail}
                            </Text>
                        ) : null}
                    </View>
                    {time ? (
                        <Text style={[styles.signTime, { color: signInk }]} maxFontSizeMultiplier={FontScaleCap.chrome}>
                            {time}
                        </Text>
                    ) : null}
                </View>
            </Animated.View>

            <View style={styles.board}>{board}</View>

            <View style={styles.stats}>
                {stats.map((s) => (
                    <View
                        key={s.label}
                        style={styles.stat}
                        accessible
                        accessibilityLabel={s.accessibilityLabel ?? `${s.label}, ${s.value}`}
                    >
                        <Text style={styles.statValue} maxFontSizeMultiplier={FontScaleCap.chrome}>
                            {s.value}
                        </Text>
                        <Text style={styles.statLabel} maxFontSizeMultiplier={FontScaleCap.chrome}>
                            {s.label}
                        </Text>
                    </View>
                ))}
            </View>

            {onLeaderboard || onShare ? (
                <View style={styles.actions}>
                    {onLeaderboard ? (
                        <Pressable
                            onPress={onLeaderboard}
                            accessibilityRole="button"
                            accessibilityLabel="Leaderboard"
                            testID={`${testID}-leaderboard`}
                            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
                        >
                            <MaterialIcons name="leaderboard" size={18} color={colors.text} {...decorativeIconProps} />
                            <Text style={styles.btnText} maxFontSizeMultiplier={FontScaleCap.chrome}>
                                Leaderboard
                            </Text>
                        </Pressable>
                    ) : null}
                    {onShare ? (
                        <Pressable
                            onPress={onShare}
                            accessibilityRole="button"
                            accessibilityLabel="Share"
                            testID={`${testID}-share`}
                            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
                        >
                            <MaterialIcons name="ios-share" size={18} color={colors.text} {...decorativeIconProps} />
                            <Text style={styles.btnText} maxFontSizeMultiplier={FontScaleCap.chrome}>
                                Share
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            ) : null}

            {nextPuzzle ? <View style={styles.next}>{nextPuzzle}</View> : null}
        </Animated.View>
    );
}

function makeStyles(text: string, secondary: string, border: string, surface: string, onPrimary: string, toastText: string) {
    return StyleSheet.create({
        sign: {
            marginHorizontal: 16,
            marginTop: 16,
            borderRadius: Size.radius,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        signText: { flex: 1 },
        signTitle: { ...GameType.title, color: onPrimary },
        signDetail: { fontFamily: FontFamily.regular, fontSize: 14, color: toastText },
        signTime: { ...GameType.title, ...GameType.numbers, color: onPrimary },
        board: { marginTop: 8 },
        stats: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 16 },
        stat: {
            flex: 1,
            borderWidth: 1,
            borderColor: border,
            borderRadius: Size.radius,
            padding: 10,
            alignItems: 'center',
            backgroundColor: surface,
        },
        statValue: { ...GameType.title, ...GameType.numbers, color: text },
        statLabel: { fontFamily: FontFamily.regular, fontSize: 13, color: secondary },
        actions: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 16 },
        btn: {
            flex: 1,
            minHeight: Size.primaryButton,
            borderRadius: Size.radius,
            borderWidth: 2,
            borderColor: border,
            backgroundColor: surface,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
        },
        btnText: { fontFamily: FontFamily.semibold, fontSize: 16, fontWeight: '600', color: text },
        pressed: { opacity: 0.7 },
        next: { marginHorizontal: 16, marginTop: 16 },
    });
}
