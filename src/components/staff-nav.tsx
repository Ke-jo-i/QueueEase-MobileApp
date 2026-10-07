import { useRouter } from 'expo-router';
import { NavigationBar } from './navigation-bar';

type StaffTab = 'Queue' | 'History' | 'Profile';
const items = [
  { id: 'Queue', label: 'Queue', icon: 'list-outline', selectedIcon: 'list', href: '/staff/dashboard' },
  { id: 'History', label: 'History', icon: 'time-outline', selectedIcon: 'time', href: '/staff/history' },
  { id: 'Profile', label: 'Profile', icon: 'person-outline', selectedIcon: 'person', href: '/staff/profile' },
] as const;
export function StaffNav({ active, onSelect }: { active: StaffTab; onSelect?: (tab: StaffTab) => void }) {
  const router = useRouter();
  return <NavigationBar items={items} selected={active} onSelect={id => {
    const item = items.find(item => item.id === id);
    if (!item) return;
    if (onSelect) { if (active !== item.id) onSelect(item.id); }
    else router.navigate(item.href);
  }} />;
}
