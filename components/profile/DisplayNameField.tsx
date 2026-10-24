import { Colors, Spacing, TFL } from '@/constants/theme';
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

const styles = StyleSheet.create({
    wrap: { gap: Spacing.xs },
    label: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
    input: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        color: Colors.light.text,
    },
    inputError: { borderColor: Colors.light.error },
    helper: { fontSize: 13, color: TFL.grey.dark },
    error: { fontSize: 13, color: Colors.light.error },
});
