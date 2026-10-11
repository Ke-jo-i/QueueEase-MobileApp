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

  // Dynamic route at quick roles batay sa portal prop
  const isStaff = portal === 'staff';
  const homeRoute = isStaff ? '/staff/queue-list' : '/(student)/home';
  const quickRoles: Role[] = isStaff ? ['staff'] : ['student'];

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (quickRole?: Role) => {
    if (busy) return;

    if (!quickRole) {
      const cleanLogin = login.trim();
      const cleanPassword = password.trim();

      // Blank Field Validations
      if (cleanLogin && !cleanPassword) {
        setError('Please enter your password.');
        return;
      }

      if (!cleanLogin && cleanPassword) {
        setError(isStaff ? 'Please enter your email.' : 'Please enter your Student ID or email.');
        return;
      }

      if (!cleanLogin && !cleanPassword) {
        setError(isStaff ? 'Please enter your email and password.' : 'Please enter your Student ID or email and password.');
        return;
      }

      // Format Validation: 6-Digit check para sa Student lang
      if (!isStaff) {
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
    }

    setBusy(true);
    setError('');

    try {
      if (quickRole) {
        await quickSignIn(quickRole);
        router.replace(homeRoute as any);
        return;
      }

      const cleanInput = login.trim();

      // Database Record Check sa profiles table
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

      if (!isRegistered) {
        setError('Account not registered. Please sign up first.');
        setBusy(false);
        return;
      }

      // Sign In Attempt
      try {
        await signIn(portal, cleanInput, password);
        router.replace(homeRoute as any);
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
      title={isStaff ? "Staff Portal" : "Welcome back"}
      subtitle={isStaff ? "Sign in to manage and serve campus queues." : "Your place in line, wherever you are on campus."}
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
                label={`Quick login as ${role.toUpperCase()}`}
                secondary
                disabled={busy}
                onPress={() => void submit(role)}
              />
            ))}
          </View>
        )}

        <Field
          label={isStaff ? "Email" : "Student ID or email"}
          placeholder={isStaff ? "staff@umindanao.edu.ph" : "e.g. 123456 or name@umindanao.edu.ph"}
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
        />

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

        {!isStaff && (
          <ActionButton
            label="Create an account"
            secondary
            onPress={() => router.push('/register')}
          />
        )}
      </View>
    </FormPage>
  );
}