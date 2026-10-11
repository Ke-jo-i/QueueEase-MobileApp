import { useAppearance } from '@/contexts/appearance';
import { useAppTheme } from '@/hooks/use-app-theme';
import { BlurTargetView, BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { createContext, type PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type ViewProps } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';

const BlurTargetContext = createContext<React.RefObject<View | null> | undefined>(undefined);

export function translucent(color: string, opacity: number) {
  if (!/^#[\da-f]{6}$/i.test(color)) return color;
  return `${color}${Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0')}`;
}

function nativeGlassAvailable() {
  if (Platform.OS !== 'ios') return false;
  try { return isGlassEffectAPIAvailable() && isLiquidGlassAvailable(); }
  catch { return false; }
}

export function GlassBackdrop({ children }: PropsWithChildren) {
  const colors = useAppTheme();
  const { colorScheme } = useAppearance();
  const target = useRef<View>(null);
  return <BlurTargetContext.Provider value={target}>
    <View style={{ flex: 1, backgroundColor: colors.surfaceSubtle }}>
      <BlurTargetView ref={target} pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 400 900">
          <Defs>
            <RadialGradient id="ambient-top"><Stop offset="0" stopColor={colors.blueLight} stopOpacity={colorScheme === 'dark' ? 0.12 : 0.28} /><Stop offset="1" stopColor={colors.blueLight} stopOpacity="0" /></RadialGradient>
            <RadialGradient id="ambient-bottom"><Stop offset="0" stopColor={colors.brandText} stopOpacity={colorScheme === 'dark' ? 0.06 : 0.1} /><Stop offset="1" stopColor={colors.brandText} stopOpacity="0" /></RadialGradient>
          </Defs>
          <Rect width="400" height="900" fill={colors.surfaceSubtle} />
          <Ellipse cx="370" cy="100" rx="340" ry="350" fill="url(#ambient-top)" />
          <Ellipse cx="0" cy="720" rx="300" ry="370" fill="url(#ambient-bottom)" />
        </Svg>
      </BlurTargetView>
      {children}
    </View>
  </BlurTargetContext.Provider>;
}

export function GlassSurface({ children, style, variant = 'regular', interactive = false, ...props }: ViewProps & { variant?: 'regular' | 'tinted'; interactive?: boolean }) {
  const colors = useAppTheme();
  const { colorScheme } = useAppearance();
  const target = useContext(BlurTargetContext);
  const [opaque, setOpaque] = useState(false);
  const [native] = useState(nativeGlassAvailable);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (active) setOpaque(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOpaque);
    return () => { active = false; listener.remove(); };
  }, []);
  const dark = colorScheme === 'dark';
  const flattened = StyleSheet.flatten(style);
  const tint = variant === 'tinted' ? colors.infoSurface : typeof flattened?.backgroundColor === 'string' ? flattened.backgroundColor : colors.surface;
  const material = translucent(tint, opaque ? 1 : native ? 0.28 : dark ? 0.82 : 0.76);
  return <View {...props} style={[{
    borderRadius: 26, borderWidth: StyleSheet.hairlineWidth,
    borderColor: translucent(dark ? '#FFFFFF' : '#FFFFFF', dark ? 0.13 : 0.85),
    boxShadow: `0 8px 30px ${translucent('#12233D', dark ? 0.14 : 0.055)}`,
  }, style, { backgroundColor: material, overflow: 'hidden' }]}>
    {!opaque && (native
      ? <GlassView pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: flattened?.borderRadius ?? 26 }]} glassEffectStyle="regular" colorScheme={colorScheme} tintColor={translucent(tint, 0.2)} isInteractive={interactive} />
      : <BlurView pointerEvents="none" style={StyleSheet.absoluteFill} intensity={variant === 'tinted' ? 55 : 36} tint={dark ? 'dark' : 'light'} blurTarget={target} blurMethod={Platform.OS === 'android' && target ? 'dimezisBlurViewSdk31Plus' : 'none'} />)}
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: translucent(tint, native ? 0.1 : dark ? 0.2 : 0.24), borderRadius: flattened?.borderRadius ?? 26, borderTopWidth: 1, borderTopColor: translucent('#FFFFFF', dark ? 0.12 : 0.8) }]} />
    {children}
  </View>;
}
