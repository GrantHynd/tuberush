import { FontScaleCap, GameType, Size } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { announce } from '@/lib/a11y';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export const TOAST_DURATION_MS = 2500;

export interface FeedbackToastProps {
    /** Null hides the toast. A new `id` restarts the timer. */
    message: string | null;
    id?: number;
    tone?: 'error' | 'success';
    /** Tag colour for success (game accent). */
    lineColor?: string;
    /** Tag text; defaults to "NOT QUITE" for errors. */
    tag?: string;
    onHide?: () => void;
    duration?: number;
    testID?: string;
}

/** Non-blocking toast that replaces Alert.alert for game feedback. */
export function FeedbackToast({
    message,
    id,
    tone = 'error',
    lineColor,
    tag,
    onHide,
    duration = TOAST_DURATION_MS,
    testID = 'feedback-toast',
}: FeedbackToastProps) {
    const { colors } = useTheme();
    const accent = lineColor ?? colors.primary;
    const reduceMotion = useReduceMotion();
    const [opacity] = useState(() => new Animated.Value(0));
    const [translateY] = useState(() => new Animated.Value(8));
    const reduceRef = useRef(reduceMotion);
    const onHideRef = useRef(onHide);
    useEffect(() => {
        reduceRef.current = reduceMotion;
        onHideRef.current = onHide;
    });
    const tagText = tag ?? (tone === 'error' ? 'NOT QUITE' : 'ON TIME');
    const styles = useMemo(
        () => makeStyles(colors.toast, colors.toastText, colors.onPrimary, colors.text, colors.surface, colors.border),
        [colors],
    );

    useEffect(() => {
        if (!message) return;
        announce(`${tone === 'error' ? 'Not quite. ' : ''}${message}`);
        opacity.setValue(0);
        translateY.setValue(reduceRef.current ? 0 : 8);
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: reduceRef.current ? 0 : 200, useNativeDriver: true }),
        ]).start();
        const t = setTimeout(() => {
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
                onHideRef.current?.(),
            );
        }, duration);
        return () => clearTimeout(t);
    }, [message, id, duration, opacity, translateY, tone]);

    if (!message) return null;
    return (
        <Animated.View
            testID={testID}
            pointerEvents="none"
            accessibilityLiveRegion="polite"
            style={[styles.toast, { opacity, transform: [{ translateY }] }]}
        >
            <View
                style={[
                    styles.tag,
                    tone === 'error' ? styles.tagError : { backgroundColor: accent },
                ]}
            >
                <Text
                    style={[styles.tagText, tone === 'success' && { color: colors.onPrimary }]}
                    maxFontSizeMultiplier={FontScaleCap.chrome}
                >
                    {tagText}
                </Text>
            </View>
            <Text style={styles.message} maxFontSizeMultiplier={FontScaleCap.chrome}>
                {message}
            </Text>
        </Animated.View>
    );
}

function makeStyles(toast: string, toastText: string, onPrimary: string, text: string, surface: string, border: string) {
    return StyleSheet.create({
        toast: {
            position: 'absolute',
            left: 16,
            right: 16,
            backgroundColor: toast,
            borderRadius: Size.radius,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            zIndex: 10,
            elevation: 10,
        },
        tag: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
        tagError: { backgroundColor: surface, borderWidth: 1, borderColor: border },
        tagText: { ...GameType.label, color: text, letterSpacing: 0.5, fontWeight: '700' },
        message: { ...GameType.body, fontSize: 15, lineHeight: 20, color: toastText, flex: 1 },
        onFill: { color: onPrimary },
    });
}
