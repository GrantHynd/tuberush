import { useTheme } from '@/hooks/useTheme';
import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

const symbolLight = require('@/assets/brand/symbol-light.png');
const symbolDark = require('@/assets/brand/symbol-dark.png');

export interface BrandMarkProps {
    /** Square symbol size in pt. Minimum readable size is 29. */
    size?: number;
    style?: StyleProp<ImageStyle>;
    testID?: string;
}

/**
 * Crossbar Train symbol. `symbol-light` is the deep-teal mark for light backgrounds;
 * `symbol-dark` is the mint mark for dark backgrounds. Decorative: the adjacent
 * title text carries the accessible name.
 */
export function BrandMark({ size = 40, style, testID }: BrandMarkProps) {
    const { scheme } = useTheme();
    return (
        <Image
            testID={testID}
            source={scheme === 'dark' ? symbolDark : symbolLight}
            style={[{ width: size, height: size }, style]}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            accessible={false}
        />
    );
}
