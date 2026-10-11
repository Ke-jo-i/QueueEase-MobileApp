import { useVerticalTransitions } from '@/hooks/use-navigation-transitions';
import { Stack } from '@/components/app-stack';

export default function StaffAuthLayout() {
  const transitions = useVerticalTransitions();
  return <Stack screenOptions={transitions}><Stack.Screen name="staff/login" /></Stack>;
}
