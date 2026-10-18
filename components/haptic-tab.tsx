import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import type { GestureResponderEvent } from 'react-native';

type PressableProps = ComponentProps<typeof PlatformPressable>;

/**
 * Expo Router vendors its own tab-button props, where ripple colors can be null.
 * Accept that callback shape and forward the props to the pressable.
 */
type HapticTabProps = {
  onPressIn?: ((event: GestureResponderEvent) => void) | null;
};

export function HapticTab(props: HapticTabProps) {
  return (
    <PlatformPressable
      {...(props as PressableProps)}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
