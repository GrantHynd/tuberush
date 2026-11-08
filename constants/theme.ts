/**
 * Platform design tokens (TUB-293, rebranded in TUB-325).
 *
 * Light chrome is the Deep Teal foundation. Dark chrome is Option A tonal teal.
 * Dark crossword cells stay on V3. Light cells are the approved light-tuned V3
 * (option C). Token names are internal only.
 */

export type Scheme = 'light' | 'dark';

/**
 * Dark V3 crossword cells. Unchanged by the light-tuned decision.
 * Distinct from surface and border.
 */
export const crosswordCells = {
    cellIdleFill: '#526E64',
    cellBlockedFill: '#060B09',
    cellOutline: '#7E9B90',
    cellIdleText: '#F0F5F3',
    cellWordFill: '#A8E8DC',
    cellWordText: '#0C1614',
    cellSelectedFill: '#C3EADF',
    cellSelectedText: '#0C1614',
    cellSelectedRing: '#527E70',
    cellCursor: '#0C1614',
} as const;

/**
 * Light-tuned V3 (option C), light mode only.
 * Ring and cursor are both drawn: the ring separates the selected cell from
 * the word fill, and the cursor marks the insertion point.
 * The playable outline on white is below 3:1; that pair is part of the
 * approved sheet. Text, the blocked fill, and the ring stay above their bars.
 */
export const lightCrosswordCells = {
    cellIdleFill: '#FFFFFF',
    cellBlockedFill: '#1E3A35',
    cellOutline: '#9DB3AC',
    cellIdleText: '#10201E',
    cellWordFill: '#D5EBE6',
    cellWordText: '#10201E',
    cellSelectedFill: '#B4DDD3',
    cellSelectedText: '#10201E',
    cellSelectedRing: '#0D5C55',
    cellCursor: '#10201E',
} as const satisfies { [K in keyof typeof crosswordCells]: string };

/**
 * Solved Interchange groups. Tone is decorative; each group also has a number,
 * a category label and a pip count. Same fills in both schemes.
 */
export const interchangeGroups = [
    { level: 1, fill: '#18332D', text: '#F0F5F3' },
    { level: 2, fill: '#1E3D35', text: '#F0F5F3' },
    { level: 3, fill: '#24463D', text: '#F0F5F3' },
    { level: 4, fill: '#2A4F45', text: '#F0F5F3' },
] as const;

export function interchangeGroup(level: number) {
    const i = Math.min(Math.max(Math.round(level) || 1, 1), 4) - 1;
    return interchangeGroups[i];
}

const lightChrome = {
    background: '#FAF7F2',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    /** 3.58:1 on white. Borders and non-text marks only, never body text. */
    border: '#7A8B85',
    text: '#10201E',
    textSecondary: '#3E524E',
    textDisabled: '#556662',
    primary: '#0D5C55',
    onPrimary: '#FAF7F2',
    accent: '#247A6C',
    onAccent: '#FFFFFF',
    success: '#1A6B48',
    warning: '#B87514',
    error: '#B42318',
    info: '#2A6B8A',
    onSuccess: '#FFFFFF',
    onWarning: '#111111',
    onError: '#FFFFFF',
    onInfo: '#FFFFFF',
    tabActive: '#0D5C55',
    tabInactive: '#5A6B67',
    focus: '#8A6A1E',
    premium: '#C4922E',
    premiumText: '#10201E',
    toast: '#1C2422',
    toastText: '#F0F5F3',
    gameInterchange: '#0D5C55',
    onGameInterchange: '#FAF7F2',
    gameCrossword: '#8B3A2F',
    onGameCrossword: '#FFFFFF',
    /** Logo arm tile on the light mark. */
    brandArms: '#2E8F83',
} as const;

const darkChrome = {
    background: '#0C1614',
    surface: '#15201D',
    elevated: '#1C2A26',
    border: '#9BAFA8',
    text: '#F0F5F3',
    textSecondary: '#B0C4BE',
    /** Same hex as textSecondary, so a disabled control needs a non-colour cue. */
    textDisabled: '#B0C4BE',
    primary: '#A8E8DC',
    onPrimary: '#0C1614',
    /** Logo arm tile. UI accents alias primary so they stay tonal teal. */
    accent: '#A8E8DC',
    onAccent: '#0C1614',
    success: '#A8E8DC',
    warning: '#F0F5F3',
    error: '#F0F5F3',
    info: '#F0F5F3',
    onSuccess: '#0C1614',
    onWarning: '#0C1614',
    onError: '#0C1614',
    onInfo: '#0C1614',
    tabActive: '#A8E8DC',
    tabInactive: '#7A8B85',
    focus: '#A8E8DC',
    premium: '#A8E8DC',
    premiumText: '#0C1614',
    toast: '#1C2422',
    toastText: '#F0F5F3',
    gameInterchange: '#A8E8DC',
    onGameInterchange: '#0C1614',
    gameCrossword: '#A8E8DC',
    onGameCrossword: '#0C1614',
    brandArms: '#3FA597',
} as const;

export const palette = {
    light: { ...lightChrome, ...lightCrosswordCells },
    dark: { ...darkChrome, ...crosswordCells },
} as const;

type AsStrings<T> = { [K in keyof T]: string };
export type Palette = AsStrings<typeof lightChrome> & AsStrings<typeof crosswordCells>;

export const GameColors = {
    interchange: palette.light.gameInterchange,
    crossword: palette.light.gameCrossword,
} as const;

export function gameColors(scheme: Scheme) {
    const p = palette[scheme];
    return {
        interchange: p.gameInterchange,
        crossword: p.gameCrossword,
        onInterchange: p.onGameInterchange,
        onCrossword: p.onGameCrossword,
    };
}

function chromeColors(p: Palette) {
    return {
        text: p.text,
        background: p.background,
        tint: p.primary,
        icon: p.textSecondary,
        tabIconDefault: p.tabInactive,
        tabIconSelected: p.tabActive,
        tabBarBackground: p.surface,
        card: p.elevated,
        border: p.border,
        error: p.error,
        success: p.success,
        warning: p.warning,
        surface: {
            gameBase: p.background,
            gameOverlay: 'rgba(12, 22, 20, 0.92)',
        },
    };
}

export const Colors = {
    light: chromeColors(palette.light),
    dark: chromeColors(palette.dark),
} as const;

export const Fonts = {
    rounded: 'System',
    mono: 'System',
};

/** Fira Sans families registered in app/_layout.tsx (system fallback if loading fails). */
export const FontFamily = {
    regular: 'FiraSans_400Regular',
    medium: 'FiraSans_500Medium',
    semibold: 'FiraSans_600SemiBold',
    bold: 'FiraSans_700Bold',
} as const;

/** maxFontSizeMultiplier caps (Dynamic Type). */
export const FontScaleCap = {
    tile: 1.6,
    gridLetter: 1.2,
    chrome: 2.0,
} as const;

/** Font metrics only. Callers set color from the active palette. */
export const GameType = {
    title: { fontFamily: FontFamily.bold, fontSize: 20, fontWeight: '700' as const },
    body: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 24 },
    tile: { fontFamily: FontFamily.bold, fontSize: 14, fontWeight: '700' as const },
    label: {
        fontFamily: FontFamily.semibold,
        fontSize: 12,
        fontWeight: '600' as const,
        letterSpacing: 1,
        textTransform: 'uppercase' as const,
    },
    numbers: { fontVariant: ['tabular-nums'] as ('tabular-nums')[] },
} as const;

/** Hit areas and control sizes. */
export const Size = {
    minTarget: 44,
    primaryButton: 48,
    radius: 12,
} as const;

export const Typography = {
    h1: {
        fontSize: 32,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
    },
    h2: {
        fontSize: 24,
        fontWeight: '600' as const,
        letterSpacing: -0.5,
    },
    h3: {
        fontSize: 20,
        fontWeight: '600' as const,
    },
    body: {
        fontSize: 16,
        lineHeight: 24,
    },
    caption: {
        fontSize: 14,
    },
    label: {
        fontSize: 12,
        fontWeight: '500' as const,
        textTransform: 'uppercase' as const,
        letterSpacing: 1,
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    s12: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

/** Corner radii. Cards always use `lg`; badges/chips inside cards use `sm` or `pill`. */
export const Radius = {
    sm: 4,
    md: 8,
    lg: 12,
    pill: 999,
};

/** The single card elevation style: a 1px border, no shadow. Color comes from the palette. */
export const CardSurface = {
    borderWidth: 1,
    borderColor: palette.light.border,
};

export const Layout = {
    /** Horizontal gutter used on every screen. */
    screenPadding: 16,
    /** Gap between adjacent cards (carousels, stat rows, stacked cards). */
    cardGap: 12,
    /** Inner padding of a card. */
    cardPadding: 16,
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 24,
    },
    shadow: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
        },
        md: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
        },
    },
};
