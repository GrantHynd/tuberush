import { palette, type Palette, type Scheme } from '@/constants/theme';
import { useColorScheme } from 'react-native';

/** Active Platform palette. Unset or light system schemes resolve to light. */
export function useTheme(): { scheme: Scheme; colors: Palette } {
    const system = useColorScheme();
    const scheme: Scheme = system === 'dark' ? 'dark' : 'light';
    return { scheme, colors: palette[scheme] };
}
