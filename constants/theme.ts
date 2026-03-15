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

export const Fonts = {
  rounded: 'System',
  mono: 'System',
};

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
    tabIconDefault: '#9CA3AF',
    tabIconSelected: TFL.blue,
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
  dark: { // Keeping same as light to force light theme
    text: '#111111',
    background: '#FFFFFF',
    tint: TFL.blue,
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: TFL.blue,
    card: TFL.grey.light,
    border: '#E5E7EB',
    error: TFL.red,
    success: TFL.green,
    warning: TFL.yellow,
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
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Layout = {
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
