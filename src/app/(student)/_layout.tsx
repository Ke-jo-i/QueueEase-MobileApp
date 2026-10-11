import { NavigationBar } from '@/components/navigation-bar';
import { useTabTransitions } from '@/hooks/use-navigation-transitions';
import { Tabs } from 'expo-router';
import { SceneResponses, useSceneResponse } from '@/contexts/scene-responses';
import { type TabBarProps, useTabSelection } from '@/hooks/use-tab-selection';

const items = [
  { id: 'home', label: 'Home', icon: 'grid-outline', selectedIcon: 'grid' },
  { id: 'tickets', label: 'Tickets', icon: 'ticket-outline', selectedIcon: 'ticket' },
  { id: 'alerts', label: 'Alerts', icon: 'notifications-outline', selectedIcon: 'notifications' },
  { id: 'profile', label: 'Profile', icon: 'person-outline', selectedIcon: 'person' },
] as const;

export default function TabLayout() {
  return <SceneResponses><StudentTabs /></SceneResponses>;
}

function StudentTabs() {
  const transitions = useTabTransitions();
  return <Tabs initialRouteName="home" backBehavior="initialRoute" screenOptions={transitions} tabBar={props => <StudentNavigation {...props} />}>
    {items.map(item => <Tabs.Screen key={item.id} name={item.id} options={{ title: item.label }} />)}
  </Tabs>;
}

function StudentNavigation({ state, navigation }: TabBarProps) {
  const respond = useSceneResponse();
  const select = useTabSelection(navigation);
  return <NavigationBar tabs items={items} selected={state.routes[state.index].name}
      onSelect={id => {
        respond(id);
        select(id);
      }} onLongPress={id => {
        const route = state.routes.find(route => route.name === id);
        if (route) navigation.emit({ type: 'tabLongPress', target: route.key });
      }} />;
}
