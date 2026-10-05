import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotionButton } from './motion';

export function StaffNav({ active }: { active: 'Queue' | 'History' | 'Profile' }) {
  const colors = useAppTheme(); const router = useRouter(); const insets = useSafeAreaInsets();
  return <View style={{ flexDirection: 'row', paddingBottom: Math.max(8, insets.bottom), paddingTop: 8, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
    {([
      ['Queue', 'list-outline', '/staff/dashboard'], ['History', 'time-outline', '/staff/history'], ['Profile', 'person-outline', '/staff/profile'],
    ] as const).map(([label, icon, href]) => <MotionButton key={label} accessibilityState={{ selected: active === label }} onPress={() => router.replace(href)} style={{ flex: 1, minHeight: 46, gap: 3, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={22} color={active === label ? colors.brandText : colors.textMuted} /><Text style={{ fontSize: 11, lineHeight: 15, fontWeight: '600', color: active === label ? colors.brandText : colors.textMuted }}>{label}</Text>
    </MotionButton>)}
  </View>;
}
