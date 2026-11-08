import type MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { palette } from './theme';

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

/** Deep-link scheme as defined in app.config.ts → expo.scheme */
export const APP_SCHEME = 'tuberushv2';

export const GAMES = {
    connections: {
        id: 'connections',
        // TUB-304: user-facing name is "Interchange"; the id / stored game_type stays 'connections'.
        name: 'Interchange',
        description: 'Find four groups of four.',
        isPremium: false,
        /** MaterialIcons glyph, shared by Home section headers and leaderboards. */
        icon: 'hub' as MaterialIconName,
        color: palette.light.gameInterchange,
    },
    crossword: {
        id: 'crossword',
        name: 'Crossword Puzzle',
        description: 'Daily premium crossword',
        isPremium: true,
        icon: 'grid-on' as MaterialIconName,
        color: palette.light.gameCrossword,
    },
} as const;

export type GameId = keyof typeof GAMES;
