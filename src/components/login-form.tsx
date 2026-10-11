import { ActionButton, Field, FormPage, Notice } from '@/components/form';
import { GlassSurface } from '@/components/glass-surface';
import { MotionButton, Reveal } from '@/components/motion';
import { useSession, type Role } from '@/contexts/session';
import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/use-app-theme';
import { demoLoginEnabled } from '@/constants/demo-mode';

export function LoginForm({ portal }: { portal: 'student' | 'staff' }) {
  const { signIn, quickSignIn, cancelSignIn } = useSession();
  const router = useRouter();
  const focused = useIsFocused();
  const colors = useAppTheme();
  const quickRoles: Role[] = portal === 'student' ? ['student'] : ['staff', 'admin'];
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!focused && pending.current) {
      pending.current = false;
      requestId.current++;
      cancelSignIn();
      setBusy(false);
    }
  }, [cancelSignIn, focused]);

  useEffect(() => () => {
    if (pending.current) {
      pending.current = false;
      requestId.current++;
      cancelSignIn();
    }
  }, [cancelSignIn]);

  const submit = async (quickRole?: Role) => {
    if (pending.current) return;
    if (!quickRole && (!login.trim() || !password)) { setError('Enter your ID or email and password.'); return; }
    if (!quickRole && login.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.trim())) { setError('Enter a valid email address.'); return; }
    const id = ++requestId.current;
    pending.current = true;
    setBusy(true);
    setError('');
    Keyboard.dismiss();
    try {
      if (quickRole) await quickSignIn(quickRole);
      else await signIn(portal, login, password);
      if (id !== requestId.current) return;
      pending.current = false;
      setPassword('');
    } catch (failure) {
      if (id === requestId.current) setError(failure instanceof Error ? failure.message : 'Could not sign in.');
    } finally {
      if (id === requestId.current) { pending.current = false; setBusy(false); }
    }
  };

  return <FormPage title={portal === 'student' ? 'Student sign in' : 'Staff sign in'}>
    {demoLoginEnabled && <Reveal><GlassSurface variant="tinted" style={{ borderRadius: 24, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="flash-outline" size={16} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>Quick login · demo accounts</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {quickRoles.map(role => <MotionButton key={role} accessibilityLabel={`Quick login as ${role[0].toUpperCase()}${role.slice(1)}`} disabled={busy} onPress={() => void submit(role)}
          style={{ flex: 1, minHeight: 54, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceNeutral, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.45 : 1 }}>
          <Ionicons name={role === 'student' ? 'ticket-outline' : role === 'staff' ? 'people-outline' : 'options-outline'} size={20} color={role === 'staff' ? colors.successStrong : role === 'admin' ? colors.info : colors.brandText} />
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{role[0].toUpperCase()}{role.slice(1)}</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.textMuted} />
        </MotionButton>)}
      </View>
    </GlassSurface></Reveal>}
    <Reveal><GlassSurface style={{ borderRadius: 28, padding: 22, gap: 20 }}>
      <Field label={portal === 'student' ? 'Student ID or email' : 'Staff ID or email'} placeholder={portal === 'student' ? 'Your student ID or email' : 'Your staff ID or email'} value={login} onChangeText={value => { setLogin(value); setError(''); }} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="username" returnKeyType="next" />
      <Field label="Password" placeholder="Your password" value={password} onChangeText={value => { setPassword(value); setError(''); }} editable={!busy} secureTextEntry autoComplete="current-password" onSubmitEditing={() => void submit()} returnKeyType="go" />
      <Notice text={error} error />
      <ActionButton label={portal === 'student' ? 'Log In' : 'LOG IN AS STAFF'} busy={busy} onPress={() => void submit()} />
      <MotionButton onPress={() => router.push('/forgot-password')} style={{ alignSelf: 'center', padding: 8 }}><Text style={{ fontSize: 14, color: colors.brandText, fontWeight: '600' }}>Forgot password?</Text></MotionButton>
    </GlassSurface></Reveal>
    {portal === 'student' && <MotionButton accessibilityLabel="Create an account" onPress={() => router.push('/register')} style={{ paddingVertical: 10, alignItems: 'center', gap: 5 }}>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>New to Queue Ease?</Text>
      <Text style={{ color: colors.brandText, fontSize: 15, fontWeight: '700' }}>Create an account</Text>
    </MotionButton>}

  </FormPage>;
}
