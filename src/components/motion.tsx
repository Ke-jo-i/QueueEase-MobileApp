import { Pressable, StyleSheet, type TouchableOpacityProps, type ViewProps } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedTouch = Animated.createAnimatedComponent(Pressable);
const pressTiming = { duration: 75, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System };
export const settleSpring = { stiffness: 420, damping: 32, mass: 0.7, overshootClamping: true, reduceMotion: ReduceMotion.System };
export const navigationSpring = { stiffness: 360, damping: 38, mass: 0.9, overshootClamping: true, restDisplacementThreshold: 0.001, restSpeedThreshold: 0.01 };
const reveal = FadeInDown.duration(220).easing(Easing.bezier(0.22, 1, 0.36, 1)).reduceMotion(ReduceMotion.System);
export function MotionButton({ style, onPressIn, onPressOut, activeOpacity: _activeOpacity, ...props }: TouchableOpacityProps) {
  const pressed = useSharedValue(0);
  const baseOpacity = StyleSheet.flatten(style)?.opacity;
  const opacity = typeof baseOpacity === 'number' ? baseOpacity : 1;
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.get() * 0.018 }], opacity: opacity * (1 - pressed.get() * 0.08) }));
  return <AnimatedTouch {...props} accessibilityRole={props.accessibilityRole ?? 'button'} aria-expanded={props['aria-expanded'] ?? props.accessibilityState?.expanded} aria-selected={props['aria-selected'] ?? props.accessibilityState?.selected}
    style={[style, motion]} onPressIn={(event) => { if (!props.disabled) pressed.set(withTiming(1, pressTiming)); onPressIn?.(event); }}
    onPressOut={(event) => { pressed.set(withSpring(0, settleSpring)); onPressOut?.(event); }} />;
}
export function Reveal({ children, ...props }: ViewProps) {
  return <Animated.View {...props} entering={reveal}
    exiting={FadeOut.duration(100).reduceMotion(ReduceMotion.System)}>{children}</Animated.View>;
}
