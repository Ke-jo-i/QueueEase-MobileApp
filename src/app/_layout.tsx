import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppearanceProvider, useAppearance } from '@/contexts/appearance';
import { SessionProvider, useSession } from '@/contexts/session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { QueueProvider } from '@/contexts/queue';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppearanceProvider>
        <SessionProvider><QueueProvider><RootNavigator /></QueueProvider></SessionProvider>
      </AppearanceProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { role } = useSession();
  const { colorScheme } = useAppearance();
  const colors = useAppTheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
        <Stack.Protected guard={role === null}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="staff/login" />
          <Stack.Screen name="explore" />
        </Stack.Protected>
        <Stack.Screen name="landing" />
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
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
