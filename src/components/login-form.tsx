import { ActionButton, Field, FormPage, Notice } from '@/components/form';
import { demoLoginEnabled } from '@/constants/demo-mode';
import { useSession, type Role } from '@/contexts/session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export function LoginForm({ portal }: { portal: 'student' | 'staff' }) {
  const { signIn, quickSignIn } = useSession();
  const router = useRouter();
  const colors = useAppTheme();
  const quickRoles: Role[] = ['student'];

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (quickRole?: Role) => {
    if (busy) return;

    // 1. INPUT FIELD & FORMAT VALIDATIONS
    if (!quickRole) {
      const cleanLogin = login.trim();
      const cleanPassword = password.trim();

      // Blank Field Validations
      if (cleanLogin && !cleanPassword) {
        setError('Please enter your password.');
        return;
      }

      if (!cleanLogin && cleanPassword) {
        setError('Please enter your Student ID or email.');
        return;
      }

      if (!cleanLogin && !cleanPassword) {
        setError('Please enter your Student ID or email and password.');
        return;
      }

      // Format Validations: 6-Digit Numeric ID or Valid Email
      const isPureNumbers = /^\d+$/.test(cleanLogin);

      if (isPureNumbers) {
        if (cleanLogin.length !== 6) {
          setError('Student ID must be exactly 6 digits.');
          return;
        }
      } else {
        const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanLogin);
        if (!isEmailFormat) {
          setError('Please enter a valid 6-digit Student ID or email address.');
          return;
        }
      }
    }

    setBusy(true);
    setError('');

    try {
      if (quickRole) {
        const user = await quickSignIn(quickRole);
        router.replace('/(student)/home');
        return;
      }

      const cleanInput = login.trim();

      // 2. CHECK RECORD EXISTENCE IN PROFILES TABLE
      let isRegistered = false;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, student_id')
          .or(`email.ilike.${cleanInput},student_id.ilike.${cleanInput}`)
          .maybeSingle();

        if (profile) {
          isRegistered = true;
        }
      } catch (dbErr) {
        // Fallback catch
      }

      // 3. IF RECORD DOES NOT EXIST IN PROFILES
      if (!isRegistered) {
        setError('Account not registered. Please sign up first.');
        setBusy(false);
        return;
      }

      // 4. IF RECORD EXISTS IN PROFILES -> PROCEED TO AUTHENTICATION
      // Confirming profile existence ensures authentication failure translates to incorrect password error.
      try {
        await signIn('student', cleanInput, password);
        router.replace('/(student)/home');
      } catch (authError) {
        setError('Incorrect password. Please check and try again.');
      }
    } catch (err: any) {
      setError('Incorrect password. Please check and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormPage
      title="Welcome back"
      subtitle="Your place in line, wherever you are on campus."
    >
      <View style={{ gap: 18 }}>
        {demoLoginEnabled && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>
              Quick login · demo accounts
            </Text>
            {quickRoles.map((role) => (
              <ActionButton
                key={role}
                label="Quick login as Student"
                secondary
                disabled={busy}
                onPress={() => void submit(role)}
              />
            ))}
          </View>
        )}

        {/* INPUT FIELD FOR STUDENT ID OR EMAIL */}
        <Field
          label="Student ID or email"
          placeholder="e.g. 123456 or name@umindanao.edu.ph"
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
        />

        {/* INPUT FIELD FOR PASSWORD */}
        <Field
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          onSubmitEditing={() => void submit()}
          returnKeyType="go"
        />

        {/* REMEMBER ME TOGGLE */}
        <Pressable
          onPress={() => setRememberMe(!rememberMe)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: rememberMe ? '#2563EB' : colors.textMuted,
              backgroundColor: rememberMe ? '#2563EB' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {rememberMe && (
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
            )}
          </View>
          <Text style={{ color: colors.text, fontSize: 14 }}>Remember me</Text>
        </Pressable>

        <Notice text={error} error />

        <ActionButton
          label="Log In"
          busy={busy}
          onPress={() => void submit()}
        />

        <ActionButton
          label="Forgot password?"
          secondary
          onPress={() => router.push('/forgot-password')}
        />

        <ActionButton
          label="Create an account"
          secondary
          onPress={() => router.push('/register')}
        />
      </View>
    </FormPage>
  );
}