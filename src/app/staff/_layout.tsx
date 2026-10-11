import { useSession } from '@/contexts/session';
import { Redirect } from 'expo-router';
import { Stack } from 'expo-router/js-stack';
import { useVerticalTransitions } from '@/hooks/use-navigation-transitions';

export default function StaffLayout() {
  const { role } = useSession();
  const transitions = useVerticalTransitions();
  if (role === 'student') return <Redirect href="/(student)/home" />;
  if (role === 'admin') return <Redirect href="/admin" />;
  if (role === null) return <Redirect href="/landing" />;
  return <Stack screenOptions={transitions}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="queue-list" />
      <Stack.Screen name="scan" />
  </Stack>;
}
