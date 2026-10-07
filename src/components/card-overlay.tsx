import { useAppTheme } from '@/hooks/use-app-theme';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { cancelAnimation, Easing, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { navigationSpring } from './motion';

type CardOverlayProps = { open: boolean; onClose: () => void; children: ReactNode };
const timing = { duration: 210, easing: Easing.bezier(0.4, 0, 0.2, 1), reduceMotion: ReduceMotion.System };
const opening = { ...navigationSpring, reduceMotion: ReduceMotion.System };

export function CardOverlay({ open, onClose, children }: CardOverlayProps) {
  const colors = useAppTheme();
  const window = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [viewport, setViewport] = useState({ width: window.width, height: window.height });
  if (open && !mounted) setMounted(true);
  const progress = useSharedValue(0);
  const revision = useRef(0);
  const finishClose = useCallback((version: number) => {
    if (revision.current !== version) return;
    setMounted(false);
    setShown(false);
  }, []);
  useEffect(() => () => { revision.current++; cancelAnimation(progress); }, [progress]);
  useEffect(() => {
    const version = ++revision.current;
    if (open && !shown) return;
    if (open) progress.set(withSpring(1, opening));
    else progress.set(withTiming(0, timing, finished => {
      if (finished) runOnJS(finishClose)(version);
    }));
  }, [open, shown, progress, finishClose]);
  const frame = useAnimatedStyle(() => ({ transform: [{ translateY: viewport.height * (1 - progress.get()) }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: 0.18 * progress.get() }));
  return <Modal visible={mounted} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onShow={() => setShown(true)} onRequestClose={onClose}>
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={event => {
      const { width, height } = event.nativeEvent.layout;
      setViewport(previous => previous.width === width && previous.height === height ? previous : { width, height });
    }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdrop]} />
      <Animated.View accessibilityViewIsModal testID="ticket-overlay" pointerEvents={open ? 'auto' : 'none'}
        style={[{ width: viewport.width, height: viewport.height, backgroundColor: colors.surface }, frame]}>{children}</Animated.View>
    </View>
  </Modal>;
}
