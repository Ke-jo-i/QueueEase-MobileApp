import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ActionButton } from './form';
import { GlassSurface } from './glass-surface';

export function AppDialog({ open, title, message, icon = 'information-circle-outline', confirmLabel = 'OK', cancelLabel, busy = false, disabled = false, onConfirm, onClose }: {
  open: boolean; title: string; message: string; icon?: React.ComponentProps<typeof Ionicons>['name'];
  confirmLabel?: string; cancelLabel?: string; busy?: boolean; disabled?: boolean;
  onConfirm?: () => void; onClose: () => void;
}) {
  const colors = useAppTheme();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(open ? 1 : 0, { duration: 190, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));
    return () => cancelAnimation(progress);
  }, [open, progress]);
  const motion = useAnimatedStyle(() => ({ opacity: progress.get(), transform: [{ scale: 0.96 + progress.get() * 0.04 }] }));
  const dismiss = () => { if (!busy) onClose(); };
  return <Modal visible={open} transparent animationType="fade" onRequestClose={dismiss}>
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(7, 12, 24, 0.55)' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss dialog" onPress={dismiss} style={StyleSheet.absoluteFill} />
      <Animated.View style={[{ width: '100%', maxWidth: 420, alignSelf: 'center' }, motion]}>
        <GlassSurface style={{ padding: 24, borderRadius: 30, gap: 16, backgroundColor: colors.surface }}>
          <View style={{ width: 48, height: 48, borderRadius: 17, backgroundColor: colors.infoSurface, justifyContent: 'center', alignItems: 'center' }}><Ionicons name={icon} size={25} color={colors.brandText} /></View>
          <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.6, color: colors.textStrong }}>{title}</Text>
          <Text style={{ fontSize: 16, lineHeight: 23, color: colors.textBody }}>{message}</Text>
          <View style={{ gap: 9, marginTop: 5 }}>
            <ActionButton label={confirmLabel} busy={busy} disabled={disabled} onPress={onConfirm ?? dismiss} />
            {cancelLabel && <ActionButton label={cancelLabel} secondary disabled={busy} onPress={dismiss} />}
          </View>
        </GlassSurface>
      </Animated.View>
    </SafeAreaView>
  </Modal>;
}
