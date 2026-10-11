import { useNavigationMotion } from '@/contexts/navigation-motion';
import { useAppTheme } from './use-app-theme';
import { Animated, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

export function useTabTransitions() {
  const colors = useAppTheme();
  const reduced = useReducedMotion();
  const { booking } = useNavigationMotion();
  const { width } = useWindowDimensions();
  return {
    headerShown: false,
    sceneStyle: { backgroundColor: colors.surfaceSubtle },
    animation: reduced || booking ? 'none' as const : 'shift' as const,
    transitionSpec: { animation: 'timing' as const, config: { duration: 280 } },
    sceneStyleInterpolator: ({ current }: { current: { progress: Animated.Value } }) => ({ sceneStyle: {
      transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-width * 0.2, 0, width * 0.2], extrapolate: 'clamp' }) }],
      opacity: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' }),
    } }),
  };
}

export function useVerticalTransitions(handoff = false): NativeStackNavigationOptions {
  const colors = useAppTheme();
  const reduced = useReducedMotion();
  return {
    headerShown: false, animation: reduced || handoff ? 'none' : 'slide_from_bottom', animationDuration: 360,
    contentStyle: { backgroundColor: colors.surfaceSubtle }, gestureDirection: 'vertical',
    gestureEnabled: !reduced, fullScreenGestureEnabled: false,
  };
}
