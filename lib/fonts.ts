import { FontFamily } from '@/constants/theme';

/**
 * Fira Sans (OFL) bundled via expo-font. Loaded in app/_layout.tsx; if loading
 * fails we still render, and platforms fall back to the system font.
 */
export const gameFonts = {
    [FontFamily.regular]: require('@expo-google-fonts/fira-sans/400Regular/FiraSans_400Regular.ttf'),
    [FontFamily.medium]: require('@expo-google-fonts/fira-sans/500Medium/FiraSans_500Medium.ttf'),
    [FontFamily.semibold]: require('@expo-google-fonts/fira-sans/600SemiBold/FiraSans_600SemiBold.ttf'),
    [FontFamily.bold]: require('@expo-google-fonts/fira-sans/700Bold/FiraSans_700Bold.ttf'),
};
