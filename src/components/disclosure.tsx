import { useCallback, useEffect, useRef, useState } from 'react';
import { View, type ViewProps } from 'react-native';
import Animated, { cancelAnimation, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { settleSpring } from './motion';

export function Disclosure({ open, gap = 0, children, ...props }: ViewProps & { open: boolean; gap?: number }) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const [height, setHeight] = useState(0);
  const revision = useRef(0);
  const size = useSharedValue(0);
  const progress = useSharedValue(0);
  const finishClose = useCallback((version: number) => {
    if (revision.current === version) setMounted(false);
  }, []);
  useEffect(() => () => {
    revision.current++;
    cancelAnimation(size);
    cancelAnimation(progress);
  }, [size, progress]);
  useEffect(() => {
    const version = ++revision.current;
    progress.set(withTiming(open ? 1 : 0, { duration: open ? 160 : 120, reduceMotion: ReduceMotion.System }));
    size.set(withSpring(open ? height : 0, settleSpring, (finished) => {
      if (finished && !open) runOnJS(finishClose)(version);
    }));
  }, [open, height, progress, size, finishClose]);
  const frame = useAnimatedStyle(() => ({ height: size.get(), marginTop: -gap * (1 - progress.get()) }));
  const content = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return <Animated.View accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} aria-hidden={!open}
    style={[{ overflow: 'hidden', pointerEvents: open ? 'auto' : 'none' }, frame]}>
    {mounted && <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0 }, content]}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
      <View {...props}>{children}</View>
    </Animated.View>}
  </Animated.View>;
}
