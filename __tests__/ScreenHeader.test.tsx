import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { ScreenHeader } from '@/components/ui/ScreenHeader';

describe('ScreenHeader (TUB-271)', () => {
    it('renders a large title as an accessibility header with optional subtitle', async () => {
        const { getByRole, getByText } = await render(
            <ScreenHeader title="Leaderboard" subtitle="See where you stand across all games." />,
        );
        expect(getByRole('header').props.children).toBe('Leaderboard');
        expect(getByText('See where you stand across all games.')).toBeTruthy();
    });

    it('renders a trailing action and no back button', async () => {
        const { getByText, queryByLabelText } = await render(
            <ScreenHeader title="TubeRush" variant="brand" trailing={<Text>A</Text>} />,
        );
        expect(getByText('A')).toBeTruthy();
        expect(queryByLabelText('Go back')).toBeNull();
    });
});
