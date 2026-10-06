import { useSession } from '@/contexts/session';
import { useQueue } from '@/contexts/queue';
import { request } from '@/data/api';
import { registrarWindows } from '@/constants/service-windows';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DarkModeToggle } from './dark-mode-toggle';
import { ThemePicker } from './theme-picker';
import { ProfilePhoto } from './profile-photo';
import { ActionButton, Field, Notice } from './form';
import { Reveal } from './motion';
import { StaffNav } from './staff-nav';
import { useTurnAlerts } from '@/contexts/turn-alerts';
import { turnAlertDelivery } from '@/data/notifications';
import { KeyboardScrollView } from './keyboard-scroll-view';
import { StudentProfileTitle } from './student-profile-title';

export function AccountProfile() {
  const colors = useAppTheme(); const { user, role, token, signOut, expire } = useSession();
  const { assignedWindow, setAssignedWindow, busy, connected } = useQueue();
  const [section, setSection] = useState(''); const [current, setCurrent] = useState(''); const [next, setNext] = useState(''); const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState('');
  const alerts = useTurnAlerts();
  const toggle = (name: string) => { setSection(section === name ? '' : name); setMessage(''); };
  const changePassword = async () => {
    if (saving) return;
    if (next !== confirm) { setMessage('New passwords do not match.'); return; }
    setSaving(true); setMessage('');
    try { await request('/auth/password', token, { currentPassword: current, newPassword: next }); expire(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not change password.'); }
    finally { setSaving(false); }
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top', 'left', 'right']}>
    <KeyboardScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40, gap: 20, width: '100%', maxWidth: 540, alignSelf: 'center' }}>
      {role === 'student' ? <StudentProfileTitle /> : <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text }}>Profile & Settings</Text>}
      <Reveal style={{ flexDirection: 'row', gap: 14, padding: 20, borderRadius: 18, backgroundColor: colors.infoSurface, alignItems: 'center' }}>
        <ProfilePhoto storageId={`${role}:${user?.id}`} initials={user?.name.split(' ').map((part) => part[0]).slice(0, 2).join('') ?? 'Q'} size={56} variant={role === 'staff' ? 'staff' : 'student'} />
        <View style={{ flex: 1, gap: 4 }}><Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{user?.name}</Text>
          <Text style={{ color: colors.textMuted }}>{user?.login}</Text><Text style={{ color: colors.brandText, fontSize: 12 }}>{role === 'staff' ? assignedWindow || 'No window assigned' : 'Student · Tagum Campus'}</Text></View>
      </Reveal>
      <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}><DarkModeToggle /><ThemePicker /></View>
      {role === 'student' && Platform.OS !== 'web' && <View style={{ gap: 8 }}>
        <ActionButton label={alerts.enabled ? 'Turn alerts: on' : 'Enable turn alerts'} secondary onPress={() => { void alerts.toggle().then((enabled) => { if (!enabled && !alerts.enabled) setMessage('Notification permission was not granted. You can still check Alerts in the app.'); }).catch(() => setMessage('Could not update notification settings.')); }} />
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>{turnAlertDelivery === 'in-app' ? 'Shows a pop-up inside the app when your turn is near or called.' : 'Shows a device notification when your turn is near or called.'} Keep Queue Ease open and connected to receive updates. Alerts are not delivered while the app is closed.</Text>
      </View>}
      {role === 'staff' && <><ActionButton label="Window Assignment" secondary onPress={() => toggle('window')} />
        {section === 'window' && <Reveal style={{ gap: 8 }}><Text style={{ color: colors.textMuted }}>Select Registrar Window. Occupied windows cannot be taken.</Text>
          {registrarWindows.map((window) => <ActionButton key={window} label={window} secondary={assignedWindow !== window} disabled={busy || !connected} onPress={() => { void setAssignedWindow(window).then((ok) => { if (ok) setSection(''); }); }} />)}
        </Reveal>}</>}
      <ActionButton label="Personal Information" secondary onPress={() => toggle('personal')} />
      {section === 'personal' && <Reveal style={{ gap: 8 }}><Text style={{ color: colors.text }}>{user?.name}</Text><Text style={{ color: colors.text }}>ID: {user?.login}</Text><Text style={{ color: colors.text }}>{user?.email}</Text><Text style={{ color: colors.textMuted }}>Profile photos are saved on this device.</Text></Reveal>}
      <ActionButton label="Change Password" secondary onPress={() => toggle('password')} />
      {section === 'password' && <Reveal style={{ gap: 14 }}>
        <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry />
        <Field label="New password (at least 10 characters)" value={next} onChangeText={setNext} secureTextEntry />
        <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry />
        <Text style={{ color: colors.textMuted }}>Changing your password signs out all your sessions. Sign in again with the new password.</Text>
        <ActionButton label="Update Password" busy={saving} onPress={() => void changePassword()} />
      </Reveal>}
      <ActionButton label="Help & Support" secondary onPress={() => toggle('help')} />
      {section === 'help' && <Reveal><Notice text="Choose a service to get one active ticket. Watch Live Status or Alerts for your turn, then go to the assigned window. A queue ticket reserves your place in line; it does not mean your document is ready. For account recovery, ask the project administrator. For document requirements, speak with registrar staff." /></Reveal>}
      <Notice text={message} error />
      <ActionButton label="Log Out" onPress={() => { void signOut().catch((error: Error) => setMessage(error.message)); }} />
    </KeyboardScrollView>
    {role === 'staff' && <StaffNav active="Profile" />}
  </SafeAreaView>;
}
