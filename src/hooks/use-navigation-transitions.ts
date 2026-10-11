import { useNavigationMotion } from '@/contexts/navigation-motion';
import { navigationSpring } from '@/components/motion';
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
    sceneStyle: { backgroundColor: colors.surfaceSubtle },
    animation: reduced || booking ? 'none' as const : 'shift' as const,
    transitionSpec: { animation: 'spring' as const, config: { stiffness: 350, damping: 35, mass: 0.85, overshootClamping: true } },
    sceneStyleInterpolator: ({ current }: { current: { progress: Animated.Value } }) => ({ sceneStyle: {
      transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width, 0, width], extrapolate: 'clamp' }) },
        { scale: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.97, 1, 0.97], extrapolate: 'clamp' }) }],
    } }),
  };
}

export function useVerticalTransitions(handoff = false): StackNavigationOptions {
  const colors = useAppTheme();
  const reduced = useReducedMotion();
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
}
