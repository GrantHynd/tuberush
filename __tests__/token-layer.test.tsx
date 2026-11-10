import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { Leaderboard } from '@/components/ui/Leaderboard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { TodayHeroCard } from '@/components/home/TodayHeroCard';
import { FontFamily, palette, type Scheme } from '@/constants/theme';

const schemeRef: { current: Scheme } = { current: 'light' };

jest.mock('@/hooks/useTheme', () => {
    const actual = jest.requireActual('@/constants/theme') as typeof import('@/constants/theme');
    return {
        useTheme: () => ({
            scheme: schemeRef.current,
            colors: actual.palette[schemeRef.current],
        }),
    };
});

jest.mock('@/lib/leaderboard', () => ({
    leaderboard: { getLeaderboard: jest.fn(() => Promise.resolve([])) },
    getLocationDisplay: () => '',
}));

function flat(node: { props: { style?: unknown } }): Record<string, unknown> {
    const style = StyleSheet.flatten(node.props.style as object);
    return (style ?? {}) as Record<string, unknown>;
}

describe('token layer on screen styles', () => {
    it.each(['light', 'dark'] as const)('%s scheme uses palette colours and the loaded Fira cuts', async (scheme) => {
        schemeRef.current = scheme;
        const colors = palette[scheme];
        const header = await render(<ScreenHeader title="TubeRush" subtitle="Beat the commute" />);
        expect(flat(header.getByRole('header'))).toMatchObject({
            fontFamily: FontFamily.bold,
            fontWeight: '700',
            color: colors.text,
        });
        expect(flat(header.getByText('Beat the commute'))).toMatchObject({
            fontFamily: FontFamily.regular,
            color: colors.textSecondary,
        });

        const card = await render(<Card testID="card" variant="outlined" />);
        expect(flat(card.getByTestId('card'))).toMatchObject({
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            borderRadius: 12,
        });
        expect(flat(card.getByTestId('card')).shadowOpacity).toBeUndefined();

        const hero = await render(
            <TodayHeroCard rows={[{ gameType: 'connections', state: 'unplayed', statusText: 'Ready', onPress: jest.fn() }]} />,
        );
        expect(flat(hero.getByText('Interchange'))).toMatchObject({
            fontFamily: FontFamily.semibold,
            fontWeight: '600',
            color: colors.text,
        });

        const board = await render(<Leaderboard gameType="connections" />);
        const chip = board.getByText('All UK').parent;
        if (!chip) throw new Error('active filter chip is missing');
        const chipStyle = flat(chip);
        expect(chipStyle.backgroundColor).toBe(colors.background);
        expect(chipStyle.borderWidth).toBe(1);
        expect(chipStyle.shadowOpacity).toBeUndefined();
        expect(chipStyle.shadowRadius).toBeUndefined();
        expect(chipStyle.elevation).toBeUndefined();
    });
});
