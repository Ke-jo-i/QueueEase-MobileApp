import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppearanceProvider, useAppearance } from '@/contexts/appearance';
import { SessionProvider, useSession } from '@/contexts/session';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <SessionProvider><RootNavigator /></SessionProvider>
    </AppearanceProvider>
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
          <Stack.Screen name="staff/analytics" />
          <Stack.Screen name="staff/profile" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
