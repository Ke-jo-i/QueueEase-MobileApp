import { useEffect } from 'react';
import { Pressable, StyleSheet, type TouchableOpacityProps, type ViewProps } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedTouch = Animated.createAnimatedComponent(Pressable);
const pressTiming = { duration: 90, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
export const settleSpring = { stiffness: 380, damping: 27, mass: 0.72, overshootClamping: false, reduceMotion: ReduceMotion.System };
export const navigationSpring = { stiffness: 330, damping: 36, mass: 0.9, overshootClamping: true, restDisplacementThreshold: 0.001, restSpeedThreshold: 0.01 };
export function MotionButton({ style, onPressIn, onPressOut, activeOpacity: _activeOpacity, ...props }: TouchableOpacityProps) {
  const pressed = useSharedValue(0);
  const baseOpacity = StyleSheet.flatten(style)?.opacity;
  const opacity = typeof baseOpacity === 'number' ? baseOpacity : 1;
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.get() * 0.035 }], opacity: opacity * (1 - pressed.get() * 0.035) }));
  return <AnimatedTouch {...props} accessibilityRole={props.accessibilityRole ?? 'button'} aria-expanded={props['aria-expanded'] ?? props.accessibilityState?.expanded} aria-selected={props['aria-selected'] ?? props.accessibilityState?.selected}
    style={[style, motion]} onPressIn={(event) => { if (!props.disabled) pressed.set(withTiming(1, pressTiming)); onPressIn?.(event); }}
    onPressOut={(event) => { pressed.set(withSpring(0, settleSpring)); onPressOut?.(event); }} />;
}
export function Reveal({ children, style, delay = 0, ...props }: ViewProps & { delay?: number }) {
  const progress = useSharedValue(0.01);
  useEffect(() => {
    progress.set(withDelay(delay, withSpring(1, { ...settleSpring, stiffness: 240, damping: 25, overshootClamping: true })));
    return () => cancelAnimation(progress);
  }, [delay, progress]);
  const motion = useAnimatedStyle(() => ({
    opacity: Math.max(0.01, progress.get()),
    transform: [{ translateY: 16 * (1 - progress.get()) }, { scale: 0.985 + 0.015 * progress.get() }],
  }));
  return <Animated.View {...props} style={[style, motion]}>{children}</Animated.View>;
}
