import { windowOfflineReasons, type WindowAvailability } from '@/data/window-availability';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Field, Notice } from './form';
import { GlassSurface } from './glass-surface';
import { MotionButton } from './motion';

export function WindowAvailabilityControl({ status, busy, disabled, onSave }: {
  status: WindowAvailability; busy: boolean; disabled?: boolean;
  onSave: (online: boolean, reason: string) => Promise<boolean>;
}) {
  const colors = useAppTheme();
  const [open, setOpen] = useState(false);
  const [targetOnline, setTargetOnline] = useState(!status.online);
  const [reason, setReason] = useState<string>(windowOfflineReasons[0]);
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const shortWindow = status.window.replace(' - Registrar', '');
  const close = () => { if (!busy) setOpen(false); };
  const save = async () => {
    const text = reason === 'Other' ? detail.trim() : reason;
    if (busy || disabled || (!targetOnline && !text)) return;
    setError('');
    if (await onSave(targetOnline, targetOnline ? '' : text)) setOpen(false);
    else setError('Could not update this window. Please refresh and try again.');
  };
  return <>
    <MotionButton accessibilityLabel={`Manage availability for ${shortWindow}`} accessibilityState={{ disabled: busy || !!disabled }} disabled={busy || disabled}
      onPress={() => { setError(''); setTargetOnline(!status.online); setReason(windowOfflineReasons[0]); setDetail(''); setOpen(true); }}
      style={{ minHeight: 44, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 16, backgroundColor: colors.surfaceMuted, opacity: disabled ? 0.45 : 1 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: status.online ? colors.successStrong : colors.warningStrong }} />
      <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{status.online ? 'Online' : 'Offline'}</Text>
      <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
    </MotionButton>
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(7,12,24,0.55)' }} edges={['top', 'bottom', 'left', 'right']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
            <GlassSurface style={{ padding: 24, borderRadius: 30, gap: 16, width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: colors.surface }}>
              <Text accessibilityRole="header" style={{ fontSize: 24, lineHeight: 30, fontWeight: '700', color: colors.textStrong }}>{shortWindow} availability</Text>
              <Text style={{ fontSize: 14, lineHeight: 21, color: colors.textMuted }}>{!targetOnline ? 'Only services assigned to this window will stop accepting new tickets. Existing tickets stay in the queue.' : 'Reopening this window restores its enabled services. Individually paused services stay paused.'}</Text>
              {!targetOnline ? <View style={{ gap: 8 }}>
                {windowOfflineReasons.map(option => <MotionButton key={option} accessibilityLabel={option} accessibilityState={{ selected: reason === option, disabled: busy }} disabled={busy} onPress={() => setReason(option)}
                  style={{ minHeight: 44, borderRadius: 15, padding: 13, borderWidth: 1, borderColor: reason === option ? colors.brandText : colors.border, backgroundColor: reason === option ? colors.infoSurface : colors.surface, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, color: colors.text, fontSize: 14 }}>{option}</Text>{reason === option && <Ionicons name="checkmark" size={18} color={colors.brandText} />}
                </MotionButton>)}
                {reason === 'Other' && <Field label="Offline reason" value={detail} onChangeText={setDetail} maxLength={160} editable={!busy} multiline />}
              </View> : <Notice text={status.reason} />}
              <Notice text={error} error />
              <ActionButton label={!targetOnline ? `Mark ${shortWindow} offline` : `Bring ${shortWindow} online`} busy={busy} disabled={disabled || (!targetOnline && reason === 'Other' && !detail.trim())} onPress={() => void save()} />
              <ActionButton label="Cancel" secondary disabled={busy} onPress={close} />
            </GlassSurface>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </>;
}
