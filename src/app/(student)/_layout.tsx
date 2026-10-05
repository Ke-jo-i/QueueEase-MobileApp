import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colors = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandText,
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarLabelPosition: 'below-icon', 
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 60 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          flexShrink: 0,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ticket-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
