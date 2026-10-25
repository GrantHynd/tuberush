import React from 'react';
import { render } from '@testing-library/react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { GameSummaryCard } from '@/components/leaderboard/GameSummaryCard';
import { GAMES } from '@/constants/Games';

describe('Game icons (TUB-264)', () => {
    it('uses real MaterialIcons glyphs rather than emoji', () => {
        for (const game of Object.values(GAMES)) {
            expect(MaterialIcons.glyphMap).toHaveProperty(game.icon);
        }
        expect(GAMES.connections.icon).toBe('hub');
        expect(GAMES.crossword.icon).toBe('grid-on');
    });

    it('renders the game name without a placeholder glyph', async () => {
        const { getByText, queryByText } = await render(
            <GameSummaryCard
                data={{ gameType: 'connections', userRank: null, totalPlayers: 0, userScore: null, nearbyEntries: [] }}
                onFullBoard={jest.fn()}
            />,
        );
        expect(getByText('Interchange')).toBeTruthy();
        expect(queryByText('?')).toBeNull();
        expect(queryByText('🔗')).toBeNull();
    });
});
