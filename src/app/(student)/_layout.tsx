import { FluidTabs } from '@/components/fluid-tabs';
import { SceneResponses, useSceneResponse } from '@/contexts/scene-responses';

export const unstable_settings = { initialRouteName: 'home' };

const items = [
  { id: 'home', href: '/(student)/home', label: 'Home', icon: 'grid-outline', selectedIcon: 'grid' },
  { id: 'tickets', href: '/(student)/tickets', label: 'Tickets', icon: 'ticket-outline', selectedIcon: 'ticket' },
  { id: 'alerts', href: '/(student)/alerts', label: 'Alerts', icon: 'notifications-outline', selectedIcon: 'notifications' },
  { id: 'profile', href: '/(student)/profile', label: 'Profile', icon: 'person-outline', selectedIcon: 'person' },
] as const;

export default function TabLayout() {
  return <SceneResponses><StudentTabs /></SceneResponses>;
}

function StudentTabs() {
  const respond = useSceneResponse();
  return <FluidTabs items={items} onSelect={respond} />;
}
