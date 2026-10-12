import { useAppearance, type AppearanceTransition } from '@/contexts/appearance';
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import Animated, { cancelAnimation, Easing, ReduceMotion, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

type Snapshot = { uri: string; width: number; height: number };
type Change = { apply: () => void; finished: () => void; applied: boolean; uri?: string; timer?: ReturnType<typeof setTimeout> };

export function AppearanceSurface({ children, active = true, priority = 0 }: PropsWithChildren<{ active?: boolean; priority?: number }>) {
  const { registerTransition } = useAppearance();
  const view = useRef<View>(null);
  const change = useRef<Change | null>(null);
  const dimensions = useRef({ width: 0, height: 0 });
  const window = useWindowDimensions();
  const reduced = useReducedMotion();
  const mounted = useRef(true);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const edge = useSharedValue(0);
  const finish = useCallback(() => {
    const pending = change.current;
    if (!pending) return;
    change.current = null;
    clearTimeout(pending.timer);
    if (!pending.applied) pending.apply();
    if (pending.uri) releaseCapture(pending.uri);
    if (mounted.current) setSnapshot(null);
    pending.finished();
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (!active) return;
    const reveal: AppearanceTransition = (apply, finished) => {
      if (reduced || !view.current) { apply(); finished(); return; }
      const pending: Change = { apply, finished, applied: false };
      change.current = pending;
      pending.timer = setTimeout(finish, 1600);
      const { width, height } = dimensions.current;
      void captureRef(view, { format: 'png', result: 'tmpfile' }).then(uri => {
        if (!mounted.current || change.current !== pending) { releaseCapture(uri); return; }
        pending.uri = uri;
        edge.set(0);
        setSnapshot({ uri, width: width || window.width, height: height || window.height });
      }).catch(() => { if (change.current === pending) finish(); });
    };
    const unregister = registerTransition(reveal, priority);
    return () => { unregister(); cancelAnimation(edge); finish(); mounted.current = false; };
  }, [active, edge, finish, priority, reduced, registerTransition, window.height, window.width]);
  const clip = useAnimatedStyle(() => ({ top: edge.get(), height: Math.max(0, (snapshot?.height ?? 0) - edge.get()) }));
  const pixels = useAnimatedStyle(() => ({ transform: [{ translateY: -edge.get() }] }));
  const begin = () => {
    const pending = change.current;
    if (!snapshot || !pending || pending.uri !== snapshot.uri || pending.applied) return;
    pending.applied = true;
    pending.apply();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (change.current !== pending) return;
      edge.set(withTiming(snapshot.height, { duration: 520, easing: Easing.bezier(0.22, 0.61, 0.36, 1), reduceMotion: ReduceMotion.System }, done => { if (done) runOnJS(finish)(); }));
    }));
  };
  return <View style={{ flex: 1 }}>
    <View ref={view} collapsable={false} style={{ flex: 1 }} onLayout={event => { dimensions.current = event.nativeEvent.layout; }}>{children}</View>
    {snapshot && <Animated.View testID="appearance-reveal" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { bottom: undefined, overflow: 'hidden' }, clip]}>
      <Animated.View style={[{ width: snapshot.width, height: snapshot.height }, pixels]}><Image source={{ uri: snapshot.uri }} style={{ width: snapshot.width, height: snapshot.height }} resizeMode="stretch" onLoad={begin} onError={finish} /></Animated.View>
    </Animated.View>}
  </View>;
}
