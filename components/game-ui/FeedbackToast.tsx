import { FontScaleCap, GameType, Size, StateColors } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { announce } from '@/lib/a11y';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export const TOAST_DURATION_MS = 2500;

export interface FeedbackToastProps {
    /** Null hides the toast. A new `id` restarts the timer. */
    message: string | null;
    id?: number;
    onHide?: () => void;
    duration?: number;
    testID?: string;
}

/** Non-blocking dark toast that replaces Alert.alert for game feedback. */
export function FeedbackToast({
    message,
    id,
    onHide,
    duration = TOAST_DURATION_MS,
    testID = 'feedback-toast',
}: FeedbackToastProps) {
    const reduceMotion = useReduceMotion();
    const [opacity] = useState(() => new Animated.Value(0));
    const [translateY] = useState(() => new Animated.Value(8));
    const reduceRef = useRef(reduceMotion);
    const onHideRef = useRef(onHide);
    useEffect(() => {
        reduceRef.current = reduceMotion;
        onHideRef.current = onHide;
    });

    useEffect(() => {
        if (!message) return;
        announce(`Mind the gap. ${message}`);
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
    }, [message, id, duration, opacity, translateY]);

    if (!message) return null;
    return (
        <Animated.View
            testID={testID}
            pointerEvents="none"
            accessibilityLiveRegion="polite"
            style={[styles.toast, { opacity, transform: [{ translateY }] }]}
        >
            <View style={[styles.tag, styles.tagError]}>
                <Text style={styles.tagText} maxFontSizeMultiplier={FontScaleCap.chrome}>
                    MIND THE GAP
                </Text>
            </View>
            <Text style={styles.message} maxFontSizeMultiplier={FontScaleCap.chrome}>
                {message}
            </Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        left: 16,
        right: 16,
        backgroundColor: StateColors.toast,
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
    tagError: { backgroundColor: StateColors.premium },
    tagText: { ...GameType.label, color: '#111111', letterSpacing: 0.5, fontWeight: '700' },
    message: { ...GameType.body, fontSize: 15, lineHeight: 20, color: '#FFFFFF', flex: 1 },
});
