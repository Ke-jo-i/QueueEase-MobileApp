import { useNavigationMotion } from '@/contexts/navigation-motion';
import { useAppTheme } from './use-app-theme';
import { Animated, Easing, useWindowDimensions } from 'react-native';
import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

export function useTabTransitions() {
  const colors = useAppTheme();
  const reduced = useReducedMotion();
  const { booking } = useNavigationMotion();
  const { width } = useWindowDimensions();
  return useMemo(() => ({
    headerShown: false,
    sceneStyle: { backgroundColor: colors.surfaceSubtle },
    animation: reduced || booking ? 'none' as const : 'shift' as const,
    freezeOnBlur: true,
    transitionSpec: { animation: 'timing' as const, config: { duration: 220, easing: Easing.bezier(0.2, 0.8, 0.2, 1) } },
    sceneStyleInterpolator: ({ current }: { current: { progress: Animated.Value } }) => ({ sceneStyle: {
      transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width], extrapolate: 'clamp' }) }],
    } }),
  }), [booking, colors.surfaceSubtle, reduced, width]);
}

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
