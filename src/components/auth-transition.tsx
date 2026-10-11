import { GlassSurface, translucent } from '@/components/glass-surface';
import { type AuthTransition, useSession } from '@/contexts/session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { type PropsWithChildren, useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolate, type SharedValue, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

export function AuthTransitionFrame({ children }: PropsWithChildren) {
  const { transition, finishTransition } = useSession();
  const reduced = useReducedMotion();
  const progress = useSharedValue(transition ? 0 : 1);
  const entering = transition?.direction === 'login';
  const role = transition?.role;
  const id = transition?.id;
  const sceneRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !(sceneRef.current instanceof HTMLElement)) return;
    const element = sceneRef.current;
    element.inert = id !== undefined;
    return () => { element.inert = false; };
  }, [id]);

  useEffect(() => {
    if (id === undefined) { progress.set(1); return; }
    progress.set(0);
    progress.set(withTiming(1, {
      duration: reduced ? 100 : entering ? role === 'staff' ? 980 : 900 : 720,
      easing: Easing.linear,
      reduceMotion: ReduceMotion.Never,
    }, finished => {
      if (finished) scheduleOnRN(finishTransition, id);
    }));
    return () => cancelAnimation(progress);
  }, [entering, finishTransition, id, progress, reduced, role]);

  const scene = useAnimatedStyle(() => {
    const reveal = interpolate(progress.get(), [0, 0.32, 1], [0, 0, 1], 'clamp');
    const remainder = Math.pow(1 - reveal, 3);
    return {
      opacity: interpolate(progress.get(), [0, 0.32, 0.85, 1], [0.01, 0.01, 1, 1], 'clamp'),
      transform: [
        { translateY: reduced ? 0 : remainder * (entering ? role === 'student' ? 52 : 16 : -22) },
        { translateX: reduced || role !== 'staff' ? 0 : remainder * (entering ? 34 : -26) },
        { scale: reduced ? 1 : 1 - remainder * (role === 'admin' ? 0.065 : 0.028) },
      ],
    };
  });

  return <View style={styles.frame}>
    <Animated.View ref={sceneRef} accessibilityElementsHidden={!!transition} importantForAccessibility={transition ? 'no-hide-descendants' : 'auto'} aria-hidden={!!transition} pointerEvents={transition ? 'none' : 'auto'} style={[styles.scene, scene]}>
      {children}
    </Animated.View>
    {transition && <AuthTransitionOverlay transition={transition} progress={progress} reduced={reduced} />}
  </View>;
}

function AuthTransitionOverlay({ transition, progress, reduced }: { transition: AuthTransition; progress: SharedValue<number>; reduced: boolean }) {
  const colors = useAppTheme();
  const entering = transition.direction === 'login';
  const accent = transition.role === 'staff' ? colors.successStrong : transition.role === 'admin' ? colors.info : colors.brandText;
  const name = transition.role[0].toUpperCase() + transition.role.slice(1);
  const veil = useAnimatedStyle(() => ({ opacity: reduced ? 1 - progress.get() : interpolate(progress.get(), [0, 0.32, 0.94, 1], [1, 1, 0, 0], 'clamp') }));
  const emblem = useAnimatedStyle(() => {
    const p = progress.get();
    const exit = interpolate(p, [0.42, 0.88], [0, 1], 'clamp');
    return {
      opacity: interpolate(p, [0, 0.14, 0.42, 0.86], [entering ? 0.5 : 1, 1, 1, 0], 'clamp'),
      transform: [
        { translateY: transition.role === 'student' ? entering ? 24 * (1 - p) - 108 * exit + Math.sin(p * Math.PI * 2) * 6 : -18 + 96 * exit : 0 },
        { scale: entering ? 0.88 + 0.2 * Math.min(1, p / 0.25) - 0.24 * exit : 1 - 0.3 * exit },
        { rotate: `${transition.role === 'student' ? (entering ? -8 * (1 - p) : 8 * exit) : transition.role === 'admin' ? -24 * (1 - p) : 0}deg` },
      ],
    };
  });
  const opening = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: interpolate(p, [0, 0.1, 0.65, 0.92], [0.1, 0.26, 0.18, 0], 'clamp'),
      transform: [
        { scale: entering ? 0.76 + 5.2 * p : 1.7 + 3.3 * p },
        { rotate: `${transition.role === 'admin' ? 35 * p : 0}deg` },
      ],
    };
  });
  const left = useAnimatedStyle(() => ({ transform: [{ translateX: entering ? interpolate(progress.get(), [0, 0.24, 1], [-62, -24, -170]) : -24 - 146 * progress.get() }] }));
  const right = useAnimatedStyle(() => ({ transform: [{ translateX: entering ? interpolate(progress.get(), [0, 0.24, 1], [62, 24, 170]) : 24 + 146 * progress.get() }] }));

  return <View testID="auth-transition" accessibilityViewIsModal accessibilityRole="alert" accessibilityLabel={`${name} ${entering ? 'signed in' : 'signed out'}`} style={styles.shield}>
    <Animated.View testID="auth-transition-veil" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceSubtle }, veil]} />
    {!reduced && <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" aria-hidden style={styles.stage}>
      <Animated.View style={[styles.opening, { borderColor: translucent(accent, 0.42), backgroundColor: translucent(accent, 0.04), borderRadius: transition.role === 'admin' ? 66 : 40 }, opening]} />
      <Animated.View style={[styles.emblem, emblem]}>
        {transition.role === 'student' ? <GlassSurface style={[styles.ticket, { backgroundColor: colors.infoSurface }]}>
          <Ionicons name="ticket-outline" size={35} color={accent} />
          <View style={[styles.ticketLine, { backgroundColor: translucent(accent, 0.35) }]} />
          <View style={[styles.ticketLine, { width: 26, backgroundColor: translucent(accent, 0.18) }]} />
        </GlassSurface> : transition.role === 'staff' ? <View style={styles.counter}>
          <Animated.View style={[styles.counterSide, left]}><GlassSurface style={[styles.counterRail, { backgroundColor: colors.successSurface }]}><View style={[styles.counterMark, { backgroundColor: accent }]} /></GlassSurface></Animated.View>
          <GlassSurface style={[styles.counterCenter, { backgroundColor: colors.successSurface }]}><Ionicons name="people-outline" size={32} color={accent} /></GlassSurface>
          <Animated.View style={[styles.counterSide, right]}><GlassSurface style={[styles.counterRail, { backgroundColor: colors.successSurface }]}><View style={[styles.counterMark, { backgroundColor: accent }]} /></GlassSurface></Animated.View>
        </View> : <GlassSurface style={[styles.control, { backgroundColor: colors.infoSurface }]}>
          <View style={[styles.controlRing, { borderColor: translucent(accent, 0.22) }]} />
          <Ionicons name="options-outline" size={31} color={accent} />
        </GlassSurface>}
      </Animated.View>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden' },
  scene: { flex: 1 },
  shield: { ...StyleSheet.absoluteFill, zIndex: 100 },
  stage: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  opening: { position: 'absolute', width: 132, height: 132, borderWidth: 1 },
  emblem: { width: 172, height: 160, alignItems: 'center', justifyContent: 'center' },
  ticket: { width: 90, height: 116, borderRadius: 24, alignItems: 'center', justifyContent: 'center', gap: 10 },
  ticketLine: { width: 43, height: 3, borderRadius: 2 },
  counter: { width: 172, height: 108, alignItems: 'center', justifyContent: 'center' },
  counterCenter: { width: 76, height: 84, borderRadius: 26, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  counterSide: { position: 'absolute' },
  counterRail: { width: 30, height: 62, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  counterMark: { width: 3, height: 20, borderRadius: 2, opacity: 0.28 },
  control: { width: 94, height: 94, borderRadius: 47, alignItems: 'center', justifyContent: 'center' },
  controlRing: { ...StyleSheet.absoluteFill, margin: 9, borderWidth: 1, borderRadius: 38 },
});
