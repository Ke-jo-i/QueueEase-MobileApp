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

  const isStaff = portal === 'staff';
  const homeRoute = isStaff ? '/staff/queue-list' : '/(student)/home';
  const quickRoles: Role[] = isStaff ? ['staff'] : ['student'];

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // HARD INPUT RESTRICTION:
  // - Sa Student ID: Numbers only, Maximum 6 digits lang. Bawal mo-type ug letter.
  // - Sa Email: Bawal kung wala'y '@' ug gustong mag-type ug letters.
  const handleLoginChange = (text: string) => {
    setError('');

    if (!isStaff && !text.includes('@')) {
      // Tanggalin tanang non-numeric characters (Bawal ang Letters)
      const numericOnly = text.replace(/[^0-9]/g, '');
      // Max 6 digits restriction
      if (numericOnly.length <= 6) {
        setLogin(numericOnly);
      }
    } else {
      // Kung email (naay '@')
      setLogin(text);
    }
  };

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
        setError(isStaff ? 'Please enter your staff email.' : 'Please enter your Student ID or email.');
        return;
      }

      if (!cleanLogin && !cleanPassword) {
        setError(isStaff ? 'Please enter your email and password.' : 'Please enter your Student ID or email and password.');
        return;
      }

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
            setError('Please enter a valid email address.');
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

      const cleanInput = login.trim().toLowerCase();

      // STEP 1: I-CHECK SA SUPABASE DATABASE PROFILES TABLE ANG ACCOUNT
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, email, student_id')
        .or(`email.ilike.${cleanInput},student_id.ilike.${cleanInput}`)
        .maybeSingle();

      // KUNG WALA ANG ACCOUNT SA DATABASE:
      if (!profile) {
        if (cleanInput.includes('@')) {
          setError('Invalid or Unregistered Email. Please check your email address.');
        } else {
          setError('Invalid or Unregistered Student ID. Please check your ID number.');
        }
        setBusy(false);
        return;
      }

      // STEP 2: CROSS-PORTAL GUARDS & NOTIFICATIONS (SEPARATED STUDENT & STAFF)
      if (!isStaff && profile.role === 'staff') {
        setError('Staff Account Detected! Please use the Staff Portal to log in.');
        setBusy(false);
        return;
      }

      if (isStaff && profile.role === 'student') {
        setError('Student Account Detected! Please use the Student Portal to log in.');
        setBusy(false);
        return;
      }

      // STEP 3: TRY TO SIGN IN (CHECK PASSWORD)
      try {
        await signIn(portal, cleanInput, password);
        router.replace(homeRoute as any);
      } catch (authErr: any) {
        // KUNG MALI ANG PASSWORD
        setError('Incorrect Password. Please check your password and try again.');
      }

    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
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
          placeholder={isStaff ? "staff@umindanao.edu.ph" : "6-digit ID or email"}
          value={login}
          onChangeText={handleLoginChange}
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