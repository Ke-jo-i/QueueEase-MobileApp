import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppearanceProvider, useAppearance } from '@/contexts/appearance';
import { SessionProvider, useSession } from '@/contexts/session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { QueueProvider } from '@/contexts/queue';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { TurnAlertsProvider } from '@/contexts/turn-alerts';
import { useEffect } from 'react';
import { View } from 'react-native';
import { setBackgroundColorAsync } from 'expo-system-ui';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <SessionProvider><TurnAlertsProvider><QueueProvider><RootNavigator /></QueueProvider></TurnAlertsProvider></SessionProvider>
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { role } = useSession();
  const { colorScheme } = useAppearance();
  const colors = useAppTheme();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    void setBackgroundColorAsync(colors.surface).catch(() => {});
  }, [colors.surface]);

  return (
    <ThemeProvider value={{
      ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
      colors: {
        ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
        primary: colors.brandText,
        background: colors.surface,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack screenOptions={{ headerShown: false, animation: reducedMotion ? 'none' : 'slide_from_right', contentStyle: { backgroundColor: colors.surface } }}>
        <Stack.Protected guard={role === null}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="staff/login" />
        </Stack.Protected>
        <Stack.Screen name="landing" options={{ animationTypeForReplace: 'pop' }} />
        <Stack.Protected guard={role === 'admin'}><Stack.Screen name="admin" /></Stack.Protected>
        <Stack.Protected guard={role === 'student'}>
          <Stack.Screen name="(student)" />
          <Stack.Screen name="confirm-service" />
          <Stack.Screen name="live-status" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'staff'}>
          <Stack.Screen name="staff/dashboard" />
          <Stack.Screen name="staff/queue-list" />
          <Stack.Screen name="staff/history" />
          <Stack.Screen name="staff/profile" />
          <Stack.Screen name="staff/scan" />
        </Stack.Protected>
      </Stack>
      </View>
    </ThemeProvider>
  );
}
