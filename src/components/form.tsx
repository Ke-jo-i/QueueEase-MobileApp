import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PropsWithChildren, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotionButton, Reveal } from './motion';

export function FormPage({ title, subtitle, children, back = true }: PropsWithChildren<{ title: string; subtitle?: string; back?: boolean }>) {
  const colors = useAppTheme(); const router = useRouter();
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 24, width: '100%', maxWidth: 520, alignSelf: 'center', gap: 22 }}>
      {back && <MotionButton accessibilityLabel="Back to portals" onPress={() => router.replace('/landing')} style={{ alignSelf: 'flex-start', padding: 8 }}><Ionicons name="arrow-back" size={24} color={colors.text} /></MotionButton>}
      <Reveal style={{ gap: 10 }}><View style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brand }}><Text style={{ fontSize: 27, fontWeight: '800', color: '#fff' }}>Q</Text></View>
        <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.4, color: colors.brandText }}>QUEUEEASE · UM TAGUM</Text>
        <Text accessibilityRole="header" style={{ fontSize: 30, lineHeight: 36, fontWeight: '800', color: colors.text }}>{title}</Text>
        {!!subtitle && <Text style={{ fontSize: 15, lineHeight: 22, color: colors.textMuted }}>{subtitle}</Text>}
      </Reveal>
      {children}
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export function Field({ label, secureTextEntry, ...props }: TextInputProps & { label: string }) {
  const colors = useAppTheme(); const [visible, setVisible] = useState(false);
  return <View style={{ gap: 7 }}><Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, backgroundColor: colors.surfaceSubtle }}>
      <TextInput {...props} accessibilityLabel={label} secureTextEntry={secureTextEntry && !visible} placeholderTextColor={colors.textDisabled}
        style={[{ flex: 1, minWidth: 0, fontSize: 16, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, color: colors.text }, props.style]} />
      {secureTextEntry && <MotionButton accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={() => setVisible(!visible)} style={{ padding: 14 }}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} /></MotionButton>}
    </View></View>;
}
export function ActionButton({ label, onPress, busy, disabled, secondary = false }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean }) {
  const colors = useAppTheme();
  return <MotionButton onPress={onPress} disabled={disabled || busy} accessibilityState={{ disabled: !!disabled || !!busy, busy }}
    style={{ minHeight: 50, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1,
      backgroundColor: secondary ? colors.surfaceSubtle : colors.brand, borderWidth: secondary ? 1 : 0, borderColor: colors.border }}>
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
