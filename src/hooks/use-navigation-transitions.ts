import { navigationSpring } from '@/components/motion';
import { useAppTheme } from './use-app-theme';
import { type StackNavigationOptions } from 'expo-router/js-stack';
import { Animated, Easing, Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useMemo } from 'react';

export const serviceTransitions: StackNavigationOptions = {};

export function useVerticalTransitions(handoff = false): StackNavigationOptions {
  const colors = useAppTheme();
  const reduced = useReducedMotion();
  return useMemo(() => {
    const close = { animation: 'timing' as const, config: { duration: reduced ? 0 : 210, easing: Easing.bezier(0.4, 0, 0.2, 1) } };
    return {
      headerShown: false,
      animation: reduced ? 'none' : 'slide_from_bottom',
      gestureDirection: 'vertical',
      gestureEnabled: Platform.OS === 'ios' && !reduced,
      detachPreviousScreen: false,
      cardStyle: { backgroundColor: colors.surfaceSubtle, ...(Platform.OS === 'web' ? { height: '100%' } : {}) },
      transitionSpec: { open: reduced ? close : { animation: 'spring', config: navigationSpring }, close },
      cardStyleInterpolator: ({ current, next, layouts }) => ({ cardStyle: {
        transform: [{ translateY: Animated.add(
          current.progress.interpolate({ inputRange: [0, 1], outputRange: [handoff ? -layouts.screen.height : layouts.screen.height, 0], extrapolate: 'clamp' }),
          next ? next.progress.interpolate({ inputRange: [0, 1], outputRange: [0, handoff ? layouts.screen.height : -layouts.screen.height * 0.035], extrapolate: 'clamp' }) : 0,
        ) }, { scale: Animated.multiply(
          current.progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1], extrapolate: 'clamp' }),
          next ? next.progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.965], extrapolate: 'clamp' }) : 1,
        ) }],
      } }),
    };
  }, [colors.surfaceSubtle, handoff, reduced]);
}
