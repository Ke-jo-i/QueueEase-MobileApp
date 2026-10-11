import { useSession } from '@/contexts/session';
import { useQueue } from '@/contexts/queue';
import { request } from '@/data/api';
import { registrarWindows } from '@/constants/service-windows';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DarkModeToggle } from './dark-mode-toggle';
import { ThemePicker } from './theme-picker';
import { ProfilePhoto } from './profile-photo';
import { ActionButton, Field, Notice } from './form';
import { Reveal } from './motion';
import { useTurnAlerts } from '@/contexts/turn-alerts';
import { turnAlertDelivery } from '@/data/notifications';
import { KeyboardScrollView } from './keyboard-scroll-view';
import { StudentProfileTitle } from './student-profile-title';
import { Disclosure } from './disclosure';
import { GlassSurface } from './glass-surface';
import { SettingsRow } from './settings-row';

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
  const detailStyle = { paddingHorizontal: 18, paddingBottom: 20, gap: 14 };
  const divider = <View style={{ height: 1, backgroundColor: colors.borderSubtle, marginLeft: 67 }} />;
  return <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top', 'left', 'right']}>
    <KeyboardScrollView contentContainerStyle={{ padding: 22, paddingTop: 26, paddingBottom: 38, gap: 22, width: '100%', maxWidth: 580, alignSelf: 'center' }}>
      <View style={{ gap: 5 }}>
        {role === 'student' ? <StudentProfileTitle /> : <Text accessibilityRole="header" style={{ fontSize: 34, letterSpacing: -1, fontWeight: '700', color: colors.text }}>Profile & Settings</Text>}
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>Your account, your preferences.</Text>
      </View>
      <Reveal><GlassSurface variant="tinted" style={{ flexDirection: 'row', gap: 16, padding: 23, borderRadius: 28, alignItems: 'center' }}>
        <ProfilePhoto storageId={`${role}:${user?.id}`} initials={user?.name.split(' ').map((part) => part[0]).slice(0, 2).join('') ?? 'Q'} size={64} variant={role === 'staff' ? 'staff' : 'student'} />
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}><Text style={{ color: colors.text, fontSize: 21, fontWeight: '700', letterSpacing: -0.4 }}>{user?.name}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{user?.login}</Text>
          <Text style={{ color: colors.brandText, fontSize: 12, fontWeight: '600' }}>{role === 'staff' ? assignedWindow || 'No window assigned' : 'Student'}</Text>
        </View>
      </GlassSurface></Reveal>
      <View style={{ gap: 9 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', paddingLeft: 5 }}>APPEARANCE</Text>
        <GlassSurface style={{ borderRadius: 25, overflow: 'hidden' }}><DarkModeToggle /><ThemePicker /></GlassSurface>
      </View>
      <View style={{ gap: 9 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600', paddingLeft: 5 }}>ACCOUNT</Text>
        <GlassSurface style={{ borderRadius: 25, overflow: 'hidden' }}>
          {role === 'staff' && <>
            <SettingsRow title="Window Assignment" subtitle={assignedWindow || 'Choose your service window'} icon="grid-outline" expanded={section === 'window'} onPress={() => toggle('window')} />
            <Disclosure open={section === 'window'} style={detailStyle}>
              <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>Occupied windows are unavailable.</Text>
              {registrarWindows.map((window) => <ActionButton key={window} label={window} secondary={assignedWindow !== window} disabled={busy || !connected} onPress={() => { void setAssignedWindow(window).then((ok) => { if (ok) setSection(''); }); }} />)}
            </Disclosure>{divider}
          </>}
          <SettingsRow title="Personal Information" subtitle="Name, ID and email" icon="person-outline" expanded={section === 'personal'} onPress={() => toggle('personal')} />
          <Disclosure open={section === 'personal'} style={detailStyle}>
            <Text style={{ color: colors.text }}>{user?.name}</Text><Text style={{ color: colors.text }}>ID: {user?.login}</Text><Text style={{ color: colors.text }}>{user?.email}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>Profile photos are saved on this device.</Text>
          </Disclosure>{divider}
          <SettingsRow title="Change Password" icon="lock-closed-outline" expanded={section === 'password'} onPress={() => toggle('password')} />
          <Disclosure open={section === 'password'} style={detailStyle}>
            <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry />
            <Field label="New password (at least 10 characters)" value={next} onChangeText={setNext} secureTextEntry />
            <Field label="Confirm new password" value={confirm} onChangeText={setConfirm} secureTextEntry />
            <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 19 }}>Changing your password signs out all your sessions. Sign in again with the new password.</Text>
            <ActionButton label="Update Password" busy={saving} onPress={() => void changePassword()} />
          </Disclosure>{divider}
          <SettingsRow title="Help & Support" subtitle="How the queue works" icon="help-circle-outline" expanded={section === 'help'} onPress={() => toggle('help')} />
          <Disclosure open={section === 'help'} style={detailStyle}><Notice text="For account recovery, contact an administrator. For service requirements, contact registrar staff." /></Disclosure>
        </GlassSurface>
      </View>
      {role === 'student' && <GlassSurface style={{ borderRadius: 25, padding: 18, gap: 10 }}>
        <ActionButton label={alerts.enabled ? 'Turn alerts: on' : 'Enable turn alerts'} secondary onPress={() => { void alerts.toggle().then((enabled) => { if (!enabled && !alerts.enabled) setMessage('Notification permission was not granted. You can still check Alerts in the app.'); }).catch(() => setMessage('Could not update notification settings.')); }} />
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>{turnAlertDelivery === 'in-app' ? 'Shows a pop-up inside the app when your turn is near or called.' : 'Shows a device notification when your turn is near or called.'} Keep Queue Ease open and connected to receive updates. Alerts are not delivered while the app is closed.</Text>
      </GlassSurface>}
      <Notice text={message} error />
      <GlassSurface style={{ borderRadius: 25 }}><SettingsRow title="Log Out" icon="log-out-outline" danger onPress={() => { void signOut().catch((error: Error) => setMessage(error.message)); }} /></GlassSurface>
    </KeyboardScrollView>
  </SafeAreaView>;
}
