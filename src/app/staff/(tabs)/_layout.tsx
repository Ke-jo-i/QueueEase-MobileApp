import { StaffNav } from '@/components/staff-nav';
import { useTabTransitions } from '@/hooks/use-navigation-transitions';
import { Tabs } from 'expo-router';

export default function StaffTabs() {
  const transitions = useTabTransitions();
  return <Tabs initialRouteName="dashboard" backBehavior="initialRoute"
    screenOptions={transitions}
    tabBar={({ state, navigation }) => <StaffNav active={state.routes[state.index].name === 'history' ? 'History' : state.routes[state.index].name === 'profile' ? 'Profile' : 'Queue'}
      onSelect={(label) => navigation.navigate(label === 'History' ? 'history' : label === 'Profile' ? 'profile' : 'dashboard')} />}>
    <Tabs.Screen name="dashboard" options={{ title: 'Queue' }} />
    <Tabs.Screen name="history" options={{ title: 'History' }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
  </Tabs>;
}
