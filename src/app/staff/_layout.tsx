import { useSession } from '@/contexts/session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Redirect, useIsFocused, usePathname, useRouter } from 'expo-router';
import { Stack } from 'expo-router/js-stack';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useVerticalTransitions } from '@/hooks/use-navigation-transitions';

export default function StaffLayout() {
  const { role } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const focused = useIsFocused();
  const colors = useAppTheme();
  const transitions = useVerticalTransitions();
  useEffect(() => {
    if (focused && role === null && pathname !== '/staff/login') router.dismissTo('/landing');
  }, [role, pathname, router, focused]);
  if (role === 'student') return <Redirect href="/(student)/home" />;
  if (role === 'admin') return <Redirect href="/admin" />;
  if (role === null && pathname !== '/staff/login') return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  return <Stack screenOptions={transitions}>
    <Stack.Protected guard={role === null}><Stack.Screen name="login" /></Stack.Protected>
    <Stack.Protected guard={role === 'staff'}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="queue-list" />
      <Stack.Screen name="scan" />
    </Stack.Protected>
  </Stack>;
}
