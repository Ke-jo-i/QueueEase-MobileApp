import { NavigationBar } from '@/components/navigation-bar';
import { useTabTransitions } from '@/hooks/use-navigation-transitions';
import { type TabBarProps, useTabSelection } from '@/hooks/use-tab-selection';
import { Tabs } from 'expo-router';

const items = [
  { id: 'dashboard', label: 'Queue', icon: 'list-outline', selectedIcon: 'list' },
  { id: 'history', label: 'History', icon: 'time-outline', selectedIcon: 'time' },
  { id: 'profile', label: 'Profile', icon: 'person-outline', selectedIcon: 'person' },
] as const;

function StaffNavigation({ state, navigation }: TabBarProps) {
  const select = useTabSelection(navigation);
  return <NavigationBar tabs items={items} selected={state.routes[state.index].name} onSelect={select} />;
}

export default function StaffTabs() {
  const transitions = useTabTransitions();
  return <Tabs initialRouteName="dashboard" backBehavior="initialRoute"
    screenOptions={transitions}
    tabBar={props => <StaffNavigation {...props} />}>
    <Tabs.Screen name="dashboard" options={{ title: 'Queue' }} />
    <Tabs.Screen name="history" options={{ title: 'History' }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
  </Tabs>;
}
