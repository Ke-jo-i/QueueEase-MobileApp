import { useNavigationMotion } from '@/contexts/navigation-motion';
import { useIsFocused } from 'expo-router';
import { type PropsWithChildren, useEffect, useRef } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

export function TicketScene({ children }: PropsWithChildren) {
  const { entry } = useNavigationMotion();
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const played = useRef(0);
  const progress = useSharedValue(entry && !reduced ? 0 : 1);
  useEffect(() => {
    if (entry <= played.current) return;
    progress.set(reduced ? 1 : 0);
    if (!focused) return;
    played.current = entry;
    progress.set(withTiming(1, { duration: reduced ? 0 : 320, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }));
  }, [entry, focused, progress, reduced]);
  useEffect(() => () => cancelAnimation(progress), [progress]);
  const style = useAnimatedStyle(() => ({ opacity: 0.65 + 0.35 * progress.get(), transform: [{ translateY: 36 * (1 - progress.get()) }] }));
  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}
