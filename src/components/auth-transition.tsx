import { BrandMark } from '@/components/brand-mark';
import { type AuthTransition, useSession } from '@/contexts/session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { type PropsWithChildren, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolate, type SharedValue, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export function AuthTransitionFrame({ children }: PropsWithChildren) {
  const { transition, finishTransition } = useSession();
  const reduced = useReducedMotion();
  const progress = useSharedValue(transition ? 0 : 1);
  const id = transition?.id;
  const sceneRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !(sceneRef.current instanceof HTMLElement)) return;
    const element = sceneRef.current;
    element.inert = id !== undefined;
    return () => { element.inert = false; };
  }, [id]);

  useLayoutEffect(() => {
    if (id === undefined) { progress.set(1); return; }
    progress.set(0);
    progress.set(withTiming(1, {
      duration: reduced ? 100 : 480,
      easing: Easing.bezier(0.22, 0.68, 0.35, 1),
      reduceMotion: ReduceMotion.Never,
    }, finished => { if (finished) scheduleOnRN(finishTransition, id); }));
    return () => cancelAnimation(progress);
  }, [finishTransition, id, progress, reduced]);

  const scene = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return <View style={styles.frame}>
    <Animated.View ref={sceneRef} testID="auth-transition-scene" accessibilityElementsHidden={!!transition} importantForAccessibility={transition ? 'no-hide-descendants' : 'auto'} aria-hidden={!!transition} pointerEvents={transition ? 'none' : 'auto'} style={[styles.scene, scene]}>
      {children}
    </Animated.View>
    {transition && <AuthTransitionOverlay key={transition.id} transition={transition} progress={progress} reduced={reduced} />}
  </View>;
}

function AuthTransitionOverlay({ transition, progress, reduced }: { transition: AuthTransition; progress: SharedValue<number>; reduced: boolean }) {
  const colors = useAppTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const name = transition.role[0].toUpperCase() + transition.role.slice(1);
  const veil = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  const emblem = useAnimatedStyle(() => ({ opacity: reduced ? 0 : interpolate(progress.get(), [0, 0.22, 0.48, 1], [0, 1, 1, 0], 'clamp') }));
  return <View testID="auth-transition" accessibilityViewIsModal accessibilityRole="alert" accessibilityLabel={`${name} ${transition.direction === 'login' ? 'signed in' : 'signed out'}`} style={styles.shield}>
    <Animated.View testID="auth-transition-veil" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceSubtle }, veil]} />
    <View pointerEvents="none" style={styles.stage}>
      <Animated.View style={[styles.avatar, { backgroundColor: colors.infoSurface }, emblem]}>
        {transition.photoUri && !imageFailed ? <Image testID="auth-transition-avatar" source={{ uri: transition.photoUri }} resizeMode="cover" style={styles.image} onError={() => setImageFailed(true)} /> : <BrandMark size={42} color={colors.brandText} />}
      </Animated.View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden' },
  scene: { flex: 1 },
  shield: { ...StyleSheet.absoluteFill, zIndex: 100 },
  stage: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: 80, height: 80 },
});
