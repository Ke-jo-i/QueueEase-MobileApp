import { ActionButton, Field, FormPage, Notice } from '@/components/form';
import { request } from '@/data/api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState(''); const [login, setLogin] = useState(''); const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  const submit = async () => {
    if (busy) return;
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try { await request('/auth/register', null, { name, login, email, password }); setDone(true); setPassword(''); setConfirm(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Registration failed.'); }
    finally { setBusy(false); }
  };
  return <FormPage title={done ? 'You’re registered' : 'Create your account'} subtitle={done ? 'Sign in to request your first queue ticket.' : 'Use your student ID. Staff accounts are created by the administrator.'}>
    {done ? <ActionButton label="Go to Log In" onPress={() => router.replace('/login')} /> : <View style={{ gap: 16 }}>
      <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" maxLength={80} />
      <Field label="Student ID" value={login} onChangeText={setLogin} autoCapitalize="none" autoCorrect={false} maxLength={40} />
      <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={160} />
      <Field label="Password (at least 10 characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
      <Notice text={error} error /><ActionButton label="Create Account" busy={busy} onPress={() => void submit()} />
    </View>}
  </FormPage>;
}
