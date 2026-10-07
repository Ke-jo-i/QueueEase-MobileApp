import { useNavigationMotion } from '@/contexts/navigation-motion';
import { useAppTheme } from './use-app-theme';
import { type StackNavigationOptions } from 'expo-router/js-stack';
import { Animated, Easing, Platform, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

export function useTabTransitions() {
  const colors = useAppTheme();
  const reduced = useReducedMotion();
  const { booking } = useNavigationMotion();
  const { width } = useWindowDimensions();
  return {
    headerShown: false,
    sceneStyle: { backgroundColor: colors.surface },
    animation: reduced || booking ? 'none' as const : 'shift' as const,
    transitionSpec: { animation: 'timing' as const, config: { duration: 240, easing: Easing.out(Easing.cubic) } },
    sceneStyleInterpolator: ({ current }: { current: { progress: Animated.Value } }) => ({ sceneStyle: {
      transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width], extrapolate: 'clamp' }) }],
    } }),
  };
}

export function useVerticalTransitions(handoff = false): StackNavigationOptions {
  const colors = useAppTheme();
  const reduced = useReducedMotion();
  const timing = { animation: 'timing' as const, config: { duration: reduced ? 0 : 260, easing: Easing.out(Easing.cubic) } };
  return {
    headerShown: false,
    animation: reduced ? 'none' : 'slide_from_bottom',
    gestureDirection: 'vertical',
    gestureEnabled: Platform.OS === 'ios' && !reduced,
    detachPreviousScreen: false,
    cardStyle: { backgroundColor: colors.surface },
    transitionSpec: { open: timing, close: timing },
    cardStyleInterpolator: ({ current, next, layouts }) => ({ cardStyle: {
      transform: [{ translateY: Animated.add(
        current.progress.interpolate({ inputRange: [0, 1], outputRange: [handoff ? -layouts.screen.height : layouts.screen.height, 0], extrapolate: 'clamp' }),
        next ? next.progress.interpolate({ inputRange: [0, 1], outputRange: [0, handoff ? layouts.screen.height : -layouts.screen.height * 0.035], extrapolate: 'clamp' }) : 0,
      ) }],
    } }),
  };
}
