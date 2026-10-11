import { DarkTheme, DefaultTheme, ThemeProvider, useRouter } from 'expo-router';
import { Stack } from 'expo-router/js-stack';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { AppearanceProvider, useAppearance } from '@/contexts/appearance';
import { SessionProvider, useSession } from '@/contexts/session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { QueueProvider } from '@/contexts/queue';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationMotionProvider, useNavigationMotion } from '@/contexts/navigation-motion';
import { useVerticalTransitions } from '@/hooks/use-navigation-transitions';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TurnAlertsProvider } from '@/contexts/turn-alerts';
import { useEffect } from 'react';
import { View } from 'react-native';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { AuthTransitionOverlay } from '@/components/auth-transition';
import { GlassBackdrop } from '@/components/glass-surface';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaProvider>
      <Head><title>Queue Ease · Registrar</title></Head>
      <AppearanceProvider>
        <SessionProvider><TurnAlertsProvider><QueueProvider><NavigationMotionProvider><RootNavigator /></NavigationMotionProvider></QueueProvider></TurnAlertsProvider></SessionProvider>
      </AppearanceProvider>
    </SafeAreaProvider></GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { role, transition } = useSession();
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
      },
    }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <GlassBackdrop>
      <View accessibilityElementsHidden={!!transition} importantForAccessibility={transition ? 'no-hide-descendants' : 'auto'} aria-hidden={!!transition} style={{ flex: 1 }}>
      <Stack screenOptions={transitions}>
        <Stack.Protected guard={role === null}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="(staff-auth)" />
        </Stack.Protected>
        <Stack.Screen name="landing" options={{ animationTypeForReplace: 'pop' }} />
        <Stack.Protected guard={role === 'admin'}><Stack.Screen name="admin" /></Stack.Protected>
        <Stack.Protected guard={role === 'student'}>
          <Stack.Screen name="(student)" />
          <Stack.Screen name="confirm-service" />
          <Stack.Screen name="live-status" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'staff'}><Stack.Screen name="staff" /></Stack.Protected>
      </Stack>
      </View>
      {transition && <AuthTransitionOverlay key={transition.id} transition={transition} />}
      </GlassBackdrop>
    </ThemeProvider>
  );
}
