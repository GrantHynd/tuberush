import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { Card, getCardStyle } from '@/components/ui/Card';
import { CardSurface, Colors, Layout, Radius, Spacing } from '@/constants/theme';

describe('design tokens (TUB-272)', () => {
    it('exposes the 4/8/12/16/24 spacing scale and card tokens', () => {
        expect([Spacing.xs, Spacing.sm, Spacing.s12, Spacing.md, Spacing.lg]).toEqual([4, 8, 12, 16, 24]);
        expect(Radius).toMatchObject({ sm: 4, md: 8, lg: 12 });
        expect(Layout).toMatchObject({ screenPadding: 16, cardGap: 12, cardPadding: 16 });
        expect(CardSurface).toEqual({ borderWidth: 1, borderColor: '#E5E7EB' });
    });
});

describe('Card', () => {
    it.each([
        ['filled', { backgroundColor: '#123456' }],
        ['tinted', { backgroundColor: Colors.light.card }],
        ['outlined', { backgroundColor: Colors.light.background, borderWidth: 1 }],
        ['grouped', { backgroundColor: Colors.light.card, borderWidth: 1, overflow: 'hidden' }],
    ] as const)('%s variant surface', (variant, expected) => {
        expect(getCardStyle(variant, '#123456')).toMatchObject(expected);
    });

    it('uses radius lg, default padding and no shadow when static', async () => {
        const { getByTestId } = await render(
            <Card testID="c" variant="tinted"><Text>Hi</Text></Card>,
        );
        const style = StyleSheet.flatten(getByTestId('c').props.style);
        expect(style.borderRadius).toBe(Radius.lg);
        expect(style.padding).toBe(16);
        expect(style.shadowOpacity).toBeUndefined();
        expect(getByTestId('c').props.accessibilityRole).toBeUndefined();
    });

    it('grouped defaults to no padding', async () => {
        const { getByTestId } = await render(<Card testID="g" variant="grouped" />);
        expect(StyleSheet.flatten(getByTestId('g').props.style).padding).toBe(0);
    });

    it('renders as a button when pressable', async () => {
        const onPress = jest.fn();
        const { getByRole } = await render(
            <Card onPress={onPress} accessibilityLabel="Open"><Text>Open</Text></Card>,
        );
        await fireEvent.press(getByRole('button'));
        expect(onPress).toHaveBeenCalled();
    });
});
