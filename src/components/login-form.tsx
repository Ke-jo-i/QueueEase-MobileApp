import { ActionButton, Field, FormPage, Notice } from '@/components/form';
import { useSession, type Role } from '@/contexts/session';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';

export function LoginForm({ portal }: { portal: 'student' | 'staff' }) {
  const { signIn, quickSignIn } = useSession(); const router = useRouter();
  const colors = useAppTheme();
  const quickRoles: Role[] = portal === 'student' ? ['student'] : ['staff', 'admin'];
  const [login, setLogin] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (quickRole?: Role) => {
    if (busy) return;
    if (!quickRole && (!login.trim() || !password)) { setError('Enter your ID or email and password.'); return; }
    setBusy(true); setError('');
    try {
      const user = quickRole ? await quickSignIn(quickRole) : await signIn(portal, login, password);
      router.replace(user.role === 'student' ? '/(student)/home' : user.role === 'admin' ? '/admin' : '/staff/dashboard');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not sign in.'); }
    finally { setBusy(false); }
  };
  return <FormPage title={portal === 'student' ? 'Welcome back' : 'Staff sign in'} subtitle={portal === 'student' ? 'Your place in line, wherever you are on campus.' : 'Sign in with your registrar or administrator account.'}>
    <View style={{ gap: 18 }}>
      {__DEV__ && <View style={{ gap: 8 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>Quick login · demo accounts</Text>
        {quickRoles.map((role) => <ActionButton key={role} label={`Quick login as ${role[0].toUpperCase()}${role.slice(1)}`} secondary disabled={busy}
          onPress={() => void submit(role)} />)}
      </View>}
      <Field label={portal === 'student' ? 'Student ID or email' : 'Staff ID or email'} placeholder={portal === 'student' ? 'Enter your Student ID or Email' : 'Enter your Staff ID or Email'} value={login} onChangeText={setLogin} autoCapitalize="none" autoCorrect={false} autoComplete="username" />
      <Field label="Password" placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={() => void submit()} returnKeyType="go" />
      <Notice text={error} error />
      <ActionButton label={portal === 'student' ? 'Log In' : 'LOG IN AS STAFF'} busy={busy} onPress={() => void submit()} />
      <ActionButton label="Forgot password?" secondary onPress={() => router.push('/forgot-password')} />
      {portal === 'student' && <ActionButton label="Create an account" secondary onPress={() => router.push('/register')} />}
    </View>
  </FormPage>;
}
