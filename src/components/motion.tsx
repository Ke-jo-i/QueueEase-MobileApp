import { Pressable, type TouchableOpacityProps, type ViewProps } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedTouch = Animated.createAnimatedComponent(Pressable);
const timing = { duration: 160, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
export function MotionButton({ style, onPressIn, onPressOut, activeOpacity: _activeOpacity, ...props }: TouchableOpacityProps) {
  const scale = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <AnimatedTouch {...props} accessibilityRole={props.accessibilityRole ?? 'button'}
    style={[style, motion]} onPressIn={(event) => { scale.set(withTiming(0.975, timing)); onPressIn?.(event); }}
    onPressOut={(event) => { scale.set(withTiming(1, timing)); onPressOut?.(event); }} />;
}
export function Reveal({ children, ...props }: ViewProps) {
  return <Animated.View {...props} entering={FadeIn.duration(180).reduceMotion(ReduceMotion.System)}
    exiting={FadeOut.duration(100).reduceMotion(ReduceMotion.System)}>{children}</Animated.View>;
}
