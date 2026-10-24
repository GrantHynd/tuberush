import type MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { GameColors } from './theme';

type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

/** Deep-link scheme as defined in app.config.ts → expo.scheme */
export const APP_SCHEME = 'tuberushv2';

export const GAMES = {
    connections: {
        id: 'connections',
        name: 'Connections',
        description: 'Find groups of 4 related items',
        isPremium: false,
        /** MaterialIcons glyph, shared by Home section headers and leaderboards. */
        icon: 'hub' as MaterialIconName,
        color: GameColors.connections,
    },
    crossword: {
        id: 'crossword',
        name: 'Crossword Puzzle',
        description: 'Daily premium crossword',
        isPremium: true,
        icon: 'grid-on' as MaterialIconName,
        color: GameColors.crossword,
    },
} as const;

export type GameId = keyof typeof GAMES;
