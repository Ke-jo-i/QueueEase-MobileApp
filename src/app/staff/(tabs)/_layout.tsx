import { FluidTabs } from '@/components/fluid-tabs';

export const unstable_settings = { initialRouteName: 'dashboard' };

const items = [
  { id: 'dashboard', href: '/staff/dashboard', label: 'Queue', icon: 'list-outline', selectedIcon: 'list' },
  { id: 'history', href: '/staff/history', label: 'History', icon: 'time-outline', selectedIcon: 'time' },
  { id: 'profile', href: '/staff/profile', label: 'Profile', icon: 'person-outline', selectedIcon: 'person' },
] as const;

export default function StaffTabs() {
  return <FluidTabs items={items} />;
}
