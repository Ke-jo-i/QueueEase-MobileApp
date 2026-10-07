import { NavigationBar } from '@/components/navigation-bar';
import { useTabTransitions } from '@/hooks/use-navigation-transitions';
import { Tabs } from 'expo-router';

const items = [
  { id: 'home', label: 'Home', icon: 'grid-outline', selectedIcon: 'grid' },
  { id: 'tickets', label: 'Tickets', icon: 'ticket-outline', selectedIcon: 'ticket' },
  { id: 'alerts', label: 'Alerts', icon: 'notifications-outline', selectedIcon: 'notifications' },
  { id: 'profile', label: 'Profile', icon: 'person-outline', selectedIcon: 'person' },
] as const;

export default function TabLayout() {
  const transitions = useTabTransitions();
  return <Tabs initialRouteName="home" backBehavior="initialRoute" screenOptions={transitions}
    tabBar={({ state, navigation }) => <NavigationBar tabs items={items} selected={state.routes[state.index].name}
      onSelect={id => {
        const route = state.routes.find(route => route.name === id);
        if (!route) return;
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (state.routes[state.index].key !== route.key && !event.defaultPrevented) navigation.navigate(route.name, route.params);
      }} onLongPress={id => {
        const route = state.routes.find(route => route.name === id);
        if (route) navigation.emit({ type: 'tabLongPress', target: route.key });
      }} />}>
    {items.map(item => <Tabs.Screen key={item.id} name={item.id} options={{ title: item.label }} />)}
  </Tabs>;
}
