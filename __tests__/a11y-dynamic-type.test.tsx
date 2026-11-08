import AuthScreen from '@/app/auth';
import { gameTabAccessibilityLabels } from '@/app/(tabs)/_layout';
import RebrandPreviewScreen from '@/components/dev/RebrandPreview';
import { GameHeader } from '@/components/game-ui/GameHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LARGE_TEXT_FONT_SCALE } from '@/lib/a11y';
import { useAuthStore } from '@/stores/auth-store';
import { render, within } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

jest.mock('@/stores/auth-store', () => ({
    useAuthStore: jest.fn(),
}));

describe('accessibility text and icon labels (TUB-330)', () => {
    beforeEach(() => {
        (useRouter as jest.Mock).mockReturnValue({
            push: jest.fn(),
            replace: jest.fn(),
            back: jest.fn(),
            setParams: jest.fn(),
            canGoBack: jest.fn(() => true),
        });
        (useAuthStore as unknown as jest.Mock).mockReturnValue({
            signIn: jest.fn(),
            signUp: jest.fn(),
        });
        (useLocalSearchParams as jest.Mock).mockReturnValue({});
    });

    it('speaks tab names without the icon glyph', () => {
        expect(gameTabAccessibilityLabels()).toEqual([
            'Games, tab, 1 of 4',
            'Stats, tab, 2 of 4',
            'Board, tab, 3 of 4',
            'Profile, tab, 4 of 4',
        ]);
        expect(gameTabAccessibilityLabels().join(' ')).not.toMatch(/home/i);
    });

    it('hides the tab symbol from the accessibility tree', async () => {
        const icon = (await render(<IconSymbol name="house" size={28} color="#111" />)).toJSON() as {
            props: { accessible?: boolean; accessibilityElementsHidden?: boolean; importantForAccessibility?: string };
        };
        expect(icon.props.accessible).toBe(false);
        expect(icon.props.accessibilityElementsHidden).toBe(true);
        expect(icon.props.importantForAccessibility).toBe('no-hide-descendants');
    });

    it('keeps the game header on one row at default size', async () => {
        const normal = await render(
            <GameHeader title="Crossword" subtitle="Sun 25 Oct" lineColor="#8B3A2F" onBack={jest.fn()} right={<Text>1:24</Text>} fontScale={1} />,
        );
        expect(normal.queryByTestId('game-header-titles')).toBeNull();
        expect(normal.getByTestId('game-header-row')).toBeTruthy();
    });

    it('keeps the game header on one row at XXXL', async () => {
        const xxxl = await render(
            <GameHeader title="Crossword" subtitle="Sun 25 Oct" lineColor="#8B3A2F" onBack={jest.fn()} fontScale={1.35} />,
        );
        expect(xxxl.queryByTestId('game-header-titles')).toBeNull();
    });

    it('stacks the title under the mark and timer at accessibility sizes', async () => {
        const { getByTestId, getByText } = await render(
            <GameHeader
                title="Crossword"
                subtitle="1st Class · 25 Oct 2026"
                lineColor="#8B3A2F"
                onBack={jest.fn()}
                right={<Text>1:24</Text>}
                fontScale={LARGE_TEXT_FONT_SCALE + 0.01}
            />,
        );
        const titles = getByTestId('game-header-titles');
        expect(within(titles).getByText('Crossword')).toBeTruthy();
        expect(within(titles).getByText('1st Class · 25 Oct 2026')).toBeTruthy();
        expect(within(getByTestId('game-header-row')).queryByText('Crossword')).toBeNull();
        expect(getByText('1:24')).toBeTruthy();
    });

    it('scrolls auth and keeps Welcome on word boundaries', async () => {
        const { getByTestId, getByText } = await render(<AuthScreen />);
        expect(getByTestId('auth-scroll')).toBeTruthy();
        const greeting = getByText('Welcome back!');
        expect(greeting.props.numberOfLines).toBe(2);
        expect(greeting.props.adjustsFontSizeToFit).toBe(true);
        expect(StyleSheet.flatten(greeting.props.style).width).toBe('100%');
        const signIn = getByTestId('auth-submit-button');
        expect(signIn.props.accessibilityLabel).toBe('Sign In');
        expect(signIn.props.accessibilityRole).toBe('button');
    });

    it('previews a disabled Check with its non-colour cue and hint', async () => {
        (useLocalSearchParams as jest.Mock).mockReturnValue({ view: 'crossword-check-disabled' });
        const { getByTestId } = await render(<RebrandPreviewScreen />);
        const check = getByTestId('key-check');
        expect(check.props.accessibilityState.disabled).toBe(true);
        expect(check.props.accessibilityLabel).toBe('Check');
        expect(check.props.accessibilityHint).toBe('Fill all squares to check');
        const flat = StyleSheet.flatten(check.props.style);
        expect(flat.borderStyle).toBe('dashed');
    });
});
