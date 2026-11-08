import { useTheme } from '@/hooks/useTheme';
import { type Palette, Spacing } from '@/constants/theme';
import { DISPLAY_NAME_HELPER, DISPLAY_NAME_MAX } from '@/lib/display-name';
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
    value: string;
    onChangeText: (text: string) => void;
    error?: string | null;
    testID?: string;
    autoFocus?: boolean;
};

/** Labelled display-name input with helper text and an announced inline error. */
export function DisplayNameField({ value, onChangeText, error, testID = 'display-name-input', autoFocus }: Props) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);
    return (
        <View style={styles.wrap}>
            <Text style={styles.label} nativeID={`${testID}-label`}>
                Display name
            </Text>
            <TextInput
                testID={testID}
                style={[styles.input, error ? styles.inputError : null]}
                value={value}
                onChangeText={onChangeText}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="username"
                textContentType="nickname"
                maxLength={DISPLAY_NAME_MAX + 10}
                autoFocus={autoFocus}
                accessibilityLabel="Display name"
                accessibilityHint={DISPLAY_NAME_HELPER}
                aria-labelledby={`${testID}-label`}
            />
            {error ? (
                <Text
                    testID={`${testID}-error`}
                    style={styles.error}
                    accessibilityLiveRegion="polite"
                    accessibilityRole="alert"
                >
                    {error}
                </Text>
            ) : (
                <Text style={styles.helper}>{DISPLAY_NAME_HELPER}</Text>
            )}
        </View>
    );
}

function makeStyles(colors: Palette) {
    return StyleSheet.create({
    wrap: { gap: Spacing.xs },
    label: { fontSize: 14, fontWeight: '600', color: colors.text },
    input: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
    },
    inputError: { borderColor: colors.error },
    helper: { fontSize: 13, color: colors.textSecondary },
    error: { fontSize: 13, color: colors.error },
});
}

