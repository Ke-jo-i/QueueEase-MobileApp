import { ActionButton, Field, FormPage, Notice } from '@/components/form';
import { GlassSurface } from '@/components/glass-surface';
import { Reveal } from '@/components/motion';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { request } from '@/data/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const [name, setName] = useState(''); const [login, setLogin] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  const [fields, setFields] = useState<Partial<Record<'name' | 'login' | 'email' | 'password' | 'confirm', string>>>({});
  const edit = (field: keyof typeof fields, setter: (value: string) => void) => (value: string) => {
    setter(value); setFields(current => ({ ...current, [field]: undefined })); setError('');
  };
  const submit = async () => {
    if (busy) return;
    const invalid: typeof fields = {};
    if (!name.trim()) invalid.name = 'Enter your full name.';
    if (!/^[a-z0-9][a-z0-9._-]{2,39}$/i.test(login.trim())) invalid.login = 'Use 3–40 letters, numbers, dots, underscores or dashes.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) invalid.email = 'Enter a valid email address.';
    if (password.length < 10 || password.length > 128) invalid.password = 'Use a password with 10–128 characters.';
    if (!confirm) invalid.confirm = 'Confirm your password.';
    else if (password !== confirm) invalid.confirm = 'Passwords do not match.';
    setFields(invalid); setError('');
    if (Object.keys(invalid).length) return;
    setBusy(true); setError('');
    try { await request('/auth/register', null, { name, login, email, password }); setDone(true); setPassword(''); setConfirm(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Registration failed.'); }
    finally { setBusy(false); }
  };
  return <FormPage sheet title={done ? 'You’re registered' : 'Create your account'}>
    {done ? <Reveal><GlassSurface style={{ borderRadius: 28, padding: 24, gap: 22 }}>
      <View style={{ alignSelf: 'center', width: 72, height: 72, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSurface }}><Ionicons name="checkmark" size={34} color={colors.successStrong} /></View>
      <ActionButton label="Go to Log In" onPress={() => router.replace('/login')} />
    </GlassSurface></Reveal> : <Reveal><GlassSurface style={{ borderRadius: 28, padding: 22, gap: 19 }}>
      <Field label="Full name" value={name} onChangeText={edit('name', setName)} error={fields.name} editable={!busy} autoComplete="name" maxLength={80} />
      <Field label="Student ID" value={login} onChangeText={edit('login', setLogin)} error={fields.login} editable={!busy} autoCapitalize="none" autoCorrect={false} maxLength={40} />
      <Field label="Email" value={email} onChangeText={edit('email', setEmail)} error={fields.email} editable={!busy} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={160} />
      <Field label="Password (at least 10 characters)" value={password} onChangeText={edit('password', setPassword)} error={fields.password} editable={!busy} secureTextEntry autoComplete="new-password" maxLength={128} />
      <Field label="Confirm password" value={confirm} onChangeText={edit('confirm', setConfirm)} error={fields.confirm} editable={!busy} secureTextEntry autoComplete="new-password" maxLength={128} returnKeyType="go" onSubmitEditing={() => void submit()} />
      <Notice text={error} error /><ActionButton label="Create Account" busy={busy} onPress={() => void submit()} />
    </GlassSurface></Reveal>}
  </FormPage>;
}
