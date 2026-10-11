import { useSession } from '@/contexts/session';
import { useNavigationMotion } from '@/contexts/navigation-motion';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useNavigation } from 'expo-router';
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { GlassBackdrop } from './glass-surface';
import { navigationSpring } from './motion';

export function ServiceTransition({ children, mode = 'service' }: PropsWithChildren<{ mode?: 'service' | 'form' }>) {
  const navigation = useNavigation();
  const { role, transition } = useSession();
  const { booking } = useNavigationMotion();
  const colors = useAppTheme();
  const { height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const pending = useRef<NavigationAction | null>(null);
  const [closing, setClosing] = useState(false);
  const finishClose = useCallback(() => {
    const action = pending.current;
    if (action) navigation.dispatch(action);
  }, [navigation]);

  usePreventRemove(!transition && (mode === 'form' ? role === null : role === 'student' && !booking), ({ data }) => {
    if (pending.current) return;
    pending.current = data.action;
    setClosing(true);
  });

  useEffect(() => {
    if (closing) progress.set(withTiming(0, {
      duration: 240, easing: Easing.bezier(0.4, 0, 0.2, 1), reduceMotion: ReduceMotion.System,
    }, finished => { if (finished) runOnJS(finishClose)(); }));
    else progress.set(withSpring(1, { ...navigationSpring, reduceMotion: ReduceMotion.System }));
    return () => cancelAnimation(progress);
  }, [closing, finishClose, progress]);

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateY: booking ? 0 : height * (1 - progress.get()) }, { scale: booking ? 1 : 0.96 + progress.get() * 0.04 }],
  }));

  return <Animated.View testID={mode === 'form' ? 'form-transition' : 'service-transition'} pointerEvents={closing ? 'none' : 'auto'}
    style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: colors.surfaceSubtle }, motion]}>
    <GlassBackdrop>{children}</GlassBackdrop>
  </Animated.View>;
}
