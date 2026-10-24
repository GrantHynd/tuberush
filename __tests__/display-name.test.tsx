import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { DisplayNameSheet } from '@/components/profile/DisplayNameSheet';
import {
    DISPLAY_NAME_ERROR,
    DISPLAY_NAME_SAVE_ERROR,
    hasSeenDisplayNamePrompt,
    markDisplayNamePromptSeen,
    validateDisplayName,
} from '@/lib/display-name';
import { getChosenDisplayName } from '@/lib/display-utils';

describe('validateDisplayName', () => {
    it.each(['Ada', 'Tube_Runner-1', '  Zoë Smith  ', 'a'.repeat(20)])('accepts %p', (n) => {
        expect(validateDisplayName(n)).toBeNull();
    });

    it.each(['', 'ab', '   ab  ', 'a'.repeat(21), 'Ada 🚇', 'ada@x.com', 'drop;table'])('rejects %p', (n) => {
        expect(validateDisplayName(n)).toBe(DISPLAY_NAME_ERROR);
    });
});

describe('prompt seen flag', () => {
    beforeEach(() => AsyncStorage.clear());
    it('is per user', async () => {
        await markDisplayNamePromptSeen('u1');
        expect(await hasSeenDisplayNamePrompt('u1')).toBe(true);
        expect(await hasSeenDisplayNamePrompt('u2')).toBe(false);
    });
});

describe('getChosenDisplayName', () => {
    it('ignores email-local-part usernames', () => {
        expect(getChosenDisplayName({ id: '1', username: 'grant', email: 'grant@x.com' })).toBeNull();
        expect(getChosenDisplayName({ id: '1', username: 'Grant H', email: 'grant@x.com' })).toBe('Grant H');
    });
});

describe('DisplayNameSheet', () => {
    it('keeps Save disabled until valid, shows inline error, saves trimmed', async () => {
        const onSave = jest.fn().mockResolvedValue(undefined);
        const { getByTestId, getByText } = await render(
            <DisplayNameSheet visible onSave={onSave} onDismiss={jest.fn()} dismissLabel="Skip" />,
        );
        expect(getByTestId('display-name-sheet-input').props.value).toBe('');
        await fireEvent.changeText(getByTestId('display-name-sheet-input'), 'ab');
        expect(getByText(DISPLAY_NAME_ERROR)).toBeTruthy();
        await fireEvent.press(getByTestId('display-name-save'));
        expect(onSave).not.toHaveBeenCalled();
        await fireEvent.changeText(getByTestId('display-name-sheet-input'), '  Rush Hour ');
        await fireEvent.press(getByTestId('display-name-save'));
        await waitFor(() => expect(onSave).toHaveBeenCalledWith('Rush Hour'));
        expect(getByText('Skip')).toBeTruthy();
    });

    it('shows a save error inline', async () => {
        const onSave = jest.fn().mockRejectedValue(new Error('x'));
        const { getByTestId, findByText } = await render(
            <DisplayNameSheet visible onSave={onSave} onDismiss={jest.fn()} />,
        );
        await fireEvent.changeText(getByTestId('display-name-sheet-input'), 'Commuter Joe');
        await fireEvent.press(getByTestId('display-name-save'));
        expect(await findByText(DISPLAY_NAME_SAVE_ERROR)).toBeTruthy();
    });
});
