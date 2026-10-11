import { useContext, useEffect, useState, type ReactNode } from 'react';
import { BackHandler, Platform } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AdminSectionFocus } from '@/contexts/admin-section';

export function DirectoryTransition({ children, onClose }: { children: (close: () => void) => ReactNode; onClose: () => void }) {
  const focused = useContext(AdminSectionFocus);
  const [closing, setClosing] = useState(false);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(closing ? 0 : 1, { duration: closing ? 210 : 320, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }, finished => {
      if (finished && closing) runOnJS(onClose)();
    }));
    return () => cancelAnimation(progress);
  }, [closing, onClose, progress]);
  useEffect(() => {
    if (!focused || Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { setClosing(true); return true; });
    return () => subscription.remove();
  }, [focused]);
  const motion = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.get() * 3), transform: [{ translateY: 80 * (1 - progress.get()) }] }));
  return <Animated.View testID="account-directory-transition" pointerEvents={closing ? 'none' : 'auto'} style={motion}>{children(() => setClosing(true))}</Animated.View>;
}
