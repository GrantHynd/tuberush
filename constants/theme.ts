/**
 * Theme configuration for the app.
 * Light mode only, TFL inspired minimalist design.
 */

export const TFL = {
  red: '#E32017', // Central
  blue: '#003688', // Piccadilly
  green: '#00782A', // District
  yellow: '#FFD300', // Circle
  black: '#111111', // Northern
  white: '#FFFFFF',
  grey: {
    light: '#F9FAFB',
    medium: '#D1D5DB',
    dark: '#4B5563',
  },
};

/**
 * Per-game identity colours. Kept separate from TFL.red / Colors.error,
 * which are reserved for errors and destructive actions.
 */
export const GameColors = {
  /** Muted crossword red — white text 7.75:1. */
  crossword: '#A4161A',
  connections: TFL.blue,
};

export const Fonts = {
  rounded: 'System',
  mono: 'System',
};

/* -------------------------------------------------------------------------- */
/* "Mind the Gap" design tokens (TUB-293). Single source for game UI.          */
/* Token names are internal only; never surface line names in UI copy.         */
/* -------------------------------------------------------------------------- */

/** Per-game line colour: header ring, 4px strip, results sign, accents. */
export const LineColors = {
  connections: '#003688', // white text 11.15:1
  crossword: '#A4161A', // white text 7.75:1
  reservedGreen: '#00782A', // 5.65:1
  reservedGrey: '#6A7278', // 4.89:1
} as const;

/** Connections difficulty lines 1–4. Always paired with a number badge. */
export const DifficultyLines = [
  { level: 1, color: '#EE7C0E', text: '#111111' }, // 6.77:1
  { level: 2, color: '#00A4A7', text: '#111111' }, // 6.18:1
  { level: 3, color: '#6950A1', text: '#FFFFFF' }, // 6.44:1
  { level: 4, color: '#9B0056', text: '#FFFFFF' }, // 8.31:1
] as const;

export function difficultyLine(level: number) {
  const i = Math.min(Math.max(Math.round(level) || 1, 1), 4) - 1;
  return DifficultyLines[i];
}

/** Interaction / feedback state colours. */
export const StateColors = {
  ink: '#111111',
  paper: '#FFFFFF',
  selected: '#003688',
  selectedText: '#FFFFFF',
  inactiveText: '#4B5563', // 7.56:1
  inactiveBorder: '#6B7280', // 4.83:1, dashed
  tileBorder: '#6B7280',
  gridLine: '#4B5563',
  error: '#A4161A',
  premium: '#FFD300',
  premiumText: '#111111', // 13.10:1
  toast: '#1C1C1F', // white 17:1
  found: '#00782A', // 5.65:1
  cursorRing: '#FFD300',
  activeWord: '#D6DFFB', // fill only; always paired with a #003688 outline
  surface: '#F9FAFB',
  hairline: '#E5E7EB',
} as const;

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

export const GameType = {
  title: { fontFamily: FontFamily.bold, fontSize: 20, fontWeight: '700' as const, color: '#111111' },
  body: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 24, color: '#111111' },
  tile: { fontFamily: FontFamily.bold, fontSize: 14, fontWeight: '700' as const, color: '#111111' },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    color: '#4B5563',
  },
  numbers: { fontVariant: ['tabular-nums'] as ('tabular-nums')[] },
} as const;

/** Hit areas and control sizes. */
export const Size = {
  minTarget: 44,
  primaryButton: 48,
  radius: 12,
} as const;

/** Connections game group colours — standard difficulty colours (1→4) */
export const ConnectionsGroupColors = {
  yellow: '#F9DF6D',
  green: '#A0C35A',
  blue: '#B0C4EF',
  purple: '#BA81C5',
} as const;

export const Colors = {
  light: {
    text: '#111111',
    background: '#FFFFFF',
    tint: TFL.blue,
    icon: '#6B7280',
    /** Inactive tab icon/label: #4B5563 = 7.56:1 on white (WCAG AA). */
    tabIconDefault: TFL.grey.dark,
    tabIconSelected: TFL.blue,
    /** Explicit so contrast holds regardless of device appearance. */
    tabBarBackground: '#FFFFFF',
    card: TFL.grey.light,
    border: '#E5E7EB',
    error: TFL.red,
    success: TFL.green,
    warning: TFL.yellow,
    /** Dark surface for game screens (Connections, etc.) */
    surface: {
      gameBase: '#1A1A1E',
      gameOverlay: 'rgba(26, 26, 30, 0.92)',
    },
  },
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.light.text,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.text,
  },
  caption: {
    fontSize: 14,
    color: TFL.grey.dark,
  },
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    color: TFL.grey.dark,
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

/** The single card elevation style: a 1px border, no shadow. */
export const CardSurface = {
  borderWidth: 1,
  borderColor: Colors.light.border,
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
