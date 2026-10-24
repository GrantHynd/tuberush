import { Colors, Layout, Spacing, Typography } from '@/constants/theme';
import { DISPLAY_NAME_SAVE_ERROR, validateDisplayName } from '@/lib/display-name';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DisplayNameField } from './DisplayNameField';

type Props = {
    visible: boolean;
    /** Current name; never pre-fill from email. */
    initialValue?: string | null;
    title?: string;
    /** Secondary action label: "Skip" for the one-time prompt, "Cancel" when editing. */
    dismissLabel?: string;
    onSave: (name: string) => Promise<void>;
    onDismiss: () => void;
};

export function DisplayNameSheet(props: Props) {
    return (
        <Modal visible={props.visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onDismiss}>
            {/* Mounted only while open so each opening starts from fresh state. */}
            {props.visible ? <SheetBody {...props} /> : null}
        </Modal>
    );
}

function SheetBody({
    initialValue,
    title = 'Display name',
    dismissLabel = 'Cancel',
    onSave,
    onDismiss,
}: Props) {
    const [value, setValue] = useState(initialValue ?? '');
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const validationError = validateDisplayName(value);
    const shownError = saveError ?? (touched && value.length > 0 ? validationError : null);
    const canSave = !validationError && !saving;

    const handleSave = async () => {
        if (!canSave) return;
        setSaving(true);
        setSaveError(null);
        try {
            await onSave(value.trim());
        } catch {
            setSaveError(DISPLAY_NAME_SAVE_ERROR);
        } finally {
            setSaving(false);
        }
    };

    return (
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
                    <Text style={styles.title} accessibilityRole="header">
                        {title}
                    </Text>
                    <DisplayNameField
                        value={value}
                        onChangeText={(t) => {
                            setValue(t);
                            setTouched(true);
                            setSaveError(null);
                        }}
                        error={shownError}
                        testID="display-name-sheet-input"
                        autoFocus
                    />
                    <TouchableOpacity
                        testID="display-name-save"
                        style={[styles.primary, !canSave && styles.disabled]}
                        onPress={handleSave}
                        disabled={!canSave}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !canSave, busy: saving }}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Save</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                        testID="display-name-dismiss"
                        style={styles.secondary}
                        onPress={onDismiss}
                        accessibilityRole="button"
                    >
                        <Text style={styles.secondaryText}>{dismissLabel}</Text>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.light.background },
    body: { padding: Spacing.lg, gap: Spacing.md },
    title: { ...Typography.h3 },
    primary: {
        backgroundColor: Colors.light.tint,
        minHeight: 48,
        borderRadius: Layout.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.sm,
    },
    disabled: { opacity: 0.5 },
    primaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
    secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { color: Colors.light.tint, fontWeight: '600', fontSize: 16 },
});
