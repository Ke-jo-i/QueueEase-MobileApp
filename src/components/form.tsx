import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PropsWithChildren, useContext, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotionButton, Reveal, settleSpring } from './motion';
import { KeyboardFieldContext, KeyboardScrollView } from './keyboard-scroll-view';
import { GlassSurface, translucent } from './glass-surface';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export function FormPage({ title, subtitle, children, back = true }: PropsWithChildren<{ title: string; subtitle?: string; back?: boolean }>) {
  const colors = useAppTheme(); const router = useRouter();
  return <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
    <KeyboardScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center', gap: 26 }}>
      {back && <MotionButton accessibilityLabel="Go back" onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/landing');
      }} style={{ alignSelf: 'flex-start', borderRadius: 24, padding: 12, backgroundColor: translucent(colors.surface, 0.7) }}><Ionicons name="chevron-back" size={22} color={colors.text} /></MotionButton>}
      <Reveal style={{ gap: 12 }}><GlassSurface variant="tinted" style={{ width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Text style={{ fontSize: 32, fontWeight: '800', color: colors.brandText }}>Q</Text></GlassSurface>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.brandText }}>Queue Ease</Text>
        <Text accessibilityRole="header" style={{ fontSize: 36, lineHeight: 42, letterSpacing: -1.2, fontWeight: '700', color: colors.textStrong }}>{title}</Text>
        {!!subtitle && <Text style={{ fontSize: 15, lineHeight: 23, color: colors.textMuted }}>{subtitle}</Text>}
      </Reveal>
      {children}
    </KeyboardScrollView>
  </SafeAreaView>;
}
export function Field({ label, secureTextEntry, ...props }: TextInputProps & { label: string }) {
  const colors = useAppTheme(); const [visible, setVisible] = useState(false);
  const input = useRef<TextInput>(null);
  const keyboard = useContext(KeyboardFieldContext);
  const [focused, setFocused] = useState(false);
  const focus = useSharedValue(0);
  const emphasis = useAnimatedStyle(() => ({ transform: [{ scale: 1 + focus.get() * 0.008 }] }));
  return <View style={{ gap: 7 }}><Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{label}</Text>
    <Animated.View style={emphasis}><View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: focused ? colors.brandText : translucent(colors.borderStrong, 0.6), borderRadius: 18, backgroundColor: translucent(colors.surface, 0.75) }}>
      <TextInput {...props} ref={input} accessibilityLabel={label} secureTextEntry={secureTextEntry && !visible} placeholderTextColor={colors.textDisabled}
        autoCapitalize={secureTextEntry ? 'none' : props.autoCapitalize} autoCorrect={secureTextEntry ? false : props.autoCorrect}
        onFocus={(event) => { setFocused(true); focus.set(withSpring(1, settleSpring)); keyboard?.focus(input.current); props.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); focus.set(withSpring(0, settleSpring)); keyboard?.blur(input.current); props.onBlur?.(event); }}
        style={[{ flex: 1, minWidth: 0, fontSize: 16, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, color: colors.text }, Platform.OS === 'web' && { outlineWidth: 0 }, props.style]} />
      {secureTextEntry && <MotionButton accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(!visible)} style={{ padding: 14 }}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} /></MotionButton>}
    </View></Animated.View></View>;
}
export function ActionButton({ label, onPress, busy, disabled, secondary = false }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean }) {
  const colors = useAppTheme();
  return <MotionButton onPress={onPress} disabled={disabled || busy} accessibilityState={{ disabled: !!disabled || !!busy, busy }}
    style={{ minHeight: 54, borderRadius: 20, padding: 16, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1,
      backgroundColor: secondary ? translucent(colors.surface, 0.8) : colors.brand, borderWidth: secondary ? 1 : 0, borderColor: colors.border }}>
    {busy && <ActivityIndicator color={secondary ? colors.brandText : '#fff'} />}
    <Text style={{ color: secondary ? colors.brandText : '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>{label}</Text>
  </MotionButton>;
}
export function Notice({ text, error = false }: { text: string; error?: boolean }) {
  const colors = useAppTheme();
  if (!text) return null;
  return <Reveal accessibilityRole={error ? 'alert' : undefined} style={{ padding: 14, borderRadius: 12, backgroundColor: error ? colors.warningSurface : colors.infoSurface }}>
    <Text style={{ color: error ? colors.warningStrong : colors.textBody, lineHeight: 21 }}>{text}</Text>
  </Reveal>;
}
