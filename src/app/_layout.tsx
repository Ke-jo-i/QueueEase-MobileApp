import { DarkTheme, DefaultTheme, ThemeProvider, useRouter, type ErrorBoundaryProps } from 'expo-router';
import { Stack } from '@/components/app-stack';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { AppearanceProvider, useAppearance } from '@/contexts/appearance';
import { SessionProvider, useSession } from '@/contexts/session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { QueueProvider, useQueue } from '@/contexts/queue';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationMotionProvider, useNavigationMotion } from '@/contexts/navigation-motion';
import { serviceTransitions, useVerticalTransitions } from '@/hooks/use-navigation-transitions';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TurnAlertsProvider } from '@/contexts/turn-alerts';
import { useEffect } from 'react';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { AuthTransitionFrame } from '@/components/auth-transition';
import { GlassBackdrop } from '@/components/glass-surface';
import { StateScreen, stateOverlay } from '@/components/state-screen';
import { View } from 'react-native';
import { AppearanceSurface } from '@/components/appearance-surface';

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <AppearanceProvider><StateScreen title="Something went wrong" message="Your saved tickets are still on the server." onRetry={retry} /></AppearanceProvider>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider>
      <Head><title>Queue Ease · Registrar</title></Head>
      <AppearanceProvider>
        <AppearanceSurface><SessionProvider><TurnAlertsProvider><QueueProvider><NavigationMotionProvider><RootNavigator /></NavigationMotionProvider></QueueProvider></TurnAlertsProvider></SessionProvider></AppearanceSurface>
      </AppearanceProvider>
    </SafeAreaProvider></GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { role, transition, signOut } = useSession();
  const queue = useQueue();
  const router = useRouter();
  const { colorScheme } = useAppearance();
  const colors = useAppTheme();
  const { booking } = useNavigationMotion();
  const transitions = useVerticalTransitions(booking);

  useEffect(() => {
    void setBackgroundColorAsync(colors.surfaceSubtle).catch(() => {});
  }, [colors.surfaceSubtle]);

  useEffect(() => {
    if (transition?.direction === 'logout' && role === null) router.replace('/landing');
    if (transition?.direction === 'login' && role === transition.role) {
      router.replace(role === 'student' ? '/(student)/home' : role === 'admin' ? '/admin' : '/staff/dashboard');
    }
  }, [role, router, transition]);

  return (
    <ThemeProvider value={{
      ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
      colors: {
        ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
        primary: colors.brandText,
        background: colors.surfaceSubtle,
        card: colors.surfaceSubtle,
        text: colors.text,
        border: colors.border,
        notification: colors.brandText,
      },
    }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <GlassBackdrop>
      <AuthTransitionFrame>
      <Stack screenOptions={transition ? { ...transitions, animation: 'none', cardStyleInterpolator: () => ({}) } : transitions}>
        <Stack.Protected guard={role === null}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" options={serviceTransitions} />
          <Stack.Screen name="forgot-password" options={serviceTransitions} />
          <Stack.Screen name="(staff-auth)" />
        </Stack.Protected>
        <Stack.Screen name="landing" options={{ animationTypeForReplace: 'pop' }} />
        <Stack.Protected guard={role === 'admin'}><Stack.Screen name="admin" /></Stack.Protected>
        <Stack.Protected guard={role === 'student'}>
          <Stack.Screen name="(student)" options={{ freezeOnBlur: false }} />
          <Stack.Screen name="confirm-service" options={serviceTransitions} />
          <Stack.Screen name="live-status" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'staff'}><Stack.Screen name="staff" /></Stack.Protected>
      </Stack>
      {(role === 'student' || role === 'staff') && !queue.ready && <View style={stateOverlay}>
        <StateScreen loading={queue.loading} title={queue.loading ? 'Getting your queue ready' : 'Unable to connect'} message={queue.loading ? undefined : 'Check your connection and that the queue server is running.'}
          onRetry={queue.loading ? undefined : () => void queue.refresh()} onBack={() => void signOut()} />
      </View>}
      </AuthTransitionFrame>
      </GlassBackdrop>
    </ThemeProvider>
  );
}
