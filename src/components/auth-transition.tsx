import { type AuthTransition, useSession } from '@/contexts/session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

export function AuthTransitionOverlay({ transition }: { transition: AuthTransition }) {
  const colors = useAppTheme();
  const { finishTransition } = useSession();
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  const entering = transition.direction === 'login';
  const duration = reduced ? 160 : entering ? 720 : 520;
  const accent = transition.role === 'staff' ? colors.successStrong : transition.role === 'admin' ? colors.info : colors.brandText;
  const name = transition.role[0].toUpperCase() + transition.role.slice(1);

  useEffect(() => {
    progress.set(withTiming(1, { duration, easing: Easing.linear }));
    const timer = setTimeout(() => finishTransition(transition.id), duration);
    return () => { clearTimeout(timer); cancelAnimation(progress); };
  }, [duration, finishTransition, progress, transition.id]);

  const backdrop = useAnimatedStyle(() => ({ opacity: reduced ? 1 : interpolate(progress.get(), [0, 0.76, 1], [1, 1, 0]) }));
  const content = useAnimatedStyle(() => {
    const p = progress.get();
    const eased = 1 - Math.pow(1 - p, 3);
    const phase = entering ? eased : 1 - eased;
    return {
      opacity: reduced ? 1 : interpolate(p, [0, 0.1, 0.8, 1], [entering ? 0 : 1, 1, 1, 0]),
      transform: [
        { translateY: reduced || transition.role !== 'student' ? 0 : interpolate(phase, [0, 1], [52, 0]) },
        { translateX: reduced || transition.role !== 'staff' ? 0 : interpolate(phase, [0, 1], [-42, 0]) },
        { scale: reduced ? 1 : interpolate(phase, [0, 1], [0.88, 1]) },
      ],
    };
  });
  const ring = useAnimatedStyle(() => {
    const eased = 1 - Math.pow(1 - progress.get(), 3);
    const phase = entering ? eased : 1 - eased;
    return { transform: [{ scale: reduced ? 1 : interpolate(phase, [0, 1], [0.5, 1.16]) }], opacity: 0.16 };
  });
  const alignment = useAnimatedStyle(() => {
    const eased = 1 - Math.pow(1 - progress.get(), 3);
    const phase = entering ? eased : 1 - eased;
    return { transform: [{ translateX: reduced ? 0 : interpolate(phase, [0, 1], [48, 0]) }] };
  });

  return <Animated.View testID="auth-transition" accessibilityViewIsModal accessibilityRole="alert" accessibilityLabel={`${name} ${entering ? 'signed in' : 'signed out'}`} style={[StyleSheet.absoluteFill, { zIndex: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, backdrop]}>
    <Animated.View style={[{ alignItems: 'center', gap: 24, padding: 32 }, content]}>
      <View style={{ width: 180, height: 164, justifyContent: 'center', alignItems: 'center' }}>
        {transition.role === 'admin' && <>
          <Animated.View style={[{ position: 'absolute', width: 156, height: 156, borderRadius: 78, borderWidth: 1.5, borderColor: accent }, ring]} />
          <View style={{ position: 'absolute', width: 118, height: 118, borderRadius: 59, borderWidth: 1, borderColor: accent, opacity: 0.22 }} />
        </>}
        {transition.role === 'student' ? <View style={{ width: 112, height: 144, borderRadius: 28, backgroundColor: colors.infoSurface, alignItems: 'center', justifyContent: 'center', gap: 16, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="ticket-outline" size={42} color={accent} />
          <View style={{ width: 56, height: 3, borderRadius: 2, backgroundColor: accent, opacity: 0.25 }} />
          <View style={{ width: 36, height: 3, borderRadius: 2, backgroundColor: accent, opacity: 0.15 }} />
          <View style={{ position: 'absolute', left: -7, bottom: 26, height: 14, width: 14, borderRadius: 7, backgroundColor: colors.surface }} />
          <View style={{ position: 'absolute', right: -7, bottom: 26, height: 14, width: 14, borderRadius: 7, backgroundColor: colors.surface }} />
        </View> : transition.role === 'staff' ? <View style={{ width: 172, alignItems: 'center', gap: 18 }}>
          <View style={{ width: 82, height: 82, borderRadius: 27, backgroundColor: colors.successSurface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="people-outline" size={38} color={accent} /></View>
          <Animated.View style={[{ flexDirection: 'row', gap: 6 }, alignment]}>
            {[0, 1, 2].map(index => <View key={index} style={{ width: index === 1 ? 72 : 28, height: 7, borderRadius: 4, backgroundColor: accent, opacity: index === 1 ? 0.7 : 0.2 }} />)}
          </Animated.View>
        </View> : <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: colors.infoSurface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="options-outline" size={36} color={accent} /></View>}
      </View>
      <View style={{ gap: 7, alignItems: 'center' }}>
        <Text style={{ fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700', color: accent }}>{name}</Text>
        <Text style={{ fontSize: 28, fontWeight: '700', letterSpacing: -0.7, color: colors.text }}>{entering ? transition.role === 'student' ? 'Welcome back.' : transition.role === 'staff' ? 'Ready to serve.' : 'Administration.' : 'Signed out.'}</Text>
      </View>
    </Animated.View>
  </Animated.View>;
}
