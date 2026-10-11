import { useAppTheme } from './use-app-theme';
import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

export const serviceTransitions: NativeStackNavigationOptions = {
  presentation: 'transparentModal', animation: 'none', gestureEnabled: false, freezeOnBlur: false, contentStyle: { backgroundColor: 'transparent' },
};

export function useVerticalTransitions(handoff = false): NativeStackNavigationOptions {
  const colors = useAppTheme();
  const reduced = useReducedMotion();
  return useMemo(() => ({
    headerShown: false, animation: reduced || handoff ? 'none' : 'slide_from_bottom', animationDuration: 360,
    freezeOnBlur: true,
    contentStyle: { backgroundColor: colors.surfaceSubtle }, gestureDirection: 'vertical',
    gestureEnabled: !reduced, fullScreenGestureEnabled: false,
  }), [colors.surfaceSubtle, handoff, reduced]);
}
