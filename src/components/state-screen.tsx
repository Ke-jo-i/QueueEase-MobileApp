import { useAppTheme } from '@/hooks/use-app-theme';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { ActionButton } from './form';
import { BrandMark } from './brand-mark';

export function StateScreen({ title, message, loading = false, onRetry, onBack, compact = false }: {
  title: string; message?: string; loading?: boolean; onRetry?: () => void; onBack?: () => void; compact?: boolean;
}) {
  const colors = useAppTheme();
  const reduced = useReducedMotion();
  const phase = useSharedValue(0);
  useEffect(() => {
    if (loading && !reduced) phase.set(withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }), -1, true));
    else phase.set(0);
    return () => cancelAnimation(phase);
  }, [loading, reduced, phase]);
  const icon = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * phase.get() }, { rotate: `${phase.get() * 8 - 4}deg` }] }));
  return <View testID={loading ? 'loading-screen' : 'error-screen'} accessibilityRole={loading ? 'progressbar' : 'alert'} accessibilityLabel={title}
    style={[{ padding: 28, alignItems: 'center', justifyContent: 'center', gap: 24, backgroundColor: colors.surfaceSubtle }, !compact && { flex: 1 }]}>
    <Animated.View style={[{ width: 76, height: 76, borderRadius: 26, backgroundColor: colors.infoSurface, alignItems: 'center', justifyContent: 'center' }, icon]}>
      <BrandMark size={48} color={colors.brandText} />
    </Animated.View>
    <View style={{ gap: 10, alignItems: 'center', maxWidth: 420 }}><Text accessibilityRole="header" style={{ color: colors.textStrong, fontWeight: '700', fontSize: 25, letterSpacing: -0.6, textAlign: 'center' }}>{title}</Text>
      {!!message && <Text style={{ color: colors.textMuted, lineHeight: 22, textAlign: 'center', fontSize: 14 }}>{message}</Text>}
    </View>
    <View style={{ width: '100%', maxWidth: 320, gap: 12 }}>{onRetry && <ActionButton label="Try again" onPress={onRetry} />}{onBack && <ActionButton label={loading ? 'Cancel' : 'Go back'} onPress={onBack} secondary />}</View>
  </View>;
}

export const stateOverlay = { ...StyleSheet.absoluteFill, zIndex: 80 };
