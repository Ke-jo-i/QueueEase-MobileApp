import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { MotionButton } from '@/components/motion';

export default function LandingScreen() {
  const colors = useAppTheme(); const router = useRouter();
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 28, gap: 28, maxWidth: 500, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: 12 }}>
        <View style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Text style={{ fontSize: 34, color: '#fff', fontWeight: '800' }}>Q</Text></View>
        <Text style={{ color: colors.brandText, fontSize: 14, fontWeight: '800', letterSpacing: 1.5 }}>Queue Ease</Text>
        <Text style={{ fontSize: 36, lineHeight: 42, fontWeight: '800', color: colors.text }}>Your time matters.</Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: colors.textMuted }}>A clearer way to queue at the registrar.</Text>
      </View>
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted }}>Select Your Portal</Text>
        {([
          ['Student Portal', 'Get a ticket and follow your turn', 'school-outline', '/login'],
          ['Staff Portal', 'Serve students and manage the queue', 'people-outline', '/staff/login'],
        ] as const).map(([title, subtitle, icon, route]) => <MotionButton key={route} onPress={() => router.push(route)} style={{ padding: 20, borderRadius: 18, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surfaceSubtle }}>
          <View style={{ padding: 12, borderRadius: 14, backgroundColor: colors.infoSurface }}><Ionicons name={icon} size={24} color={colors.brandText} /></View>
          <View style={{ flex: 1, gap: 4 }}><Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{title}</Text><Text style={{ fontSize: 12, lineHeight: 18, color: colors.textMuted }}>{subtitle}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </MotionButton>)}
      </View>
      <Text style={{ color: colors.textDisabled, fontSize: 12, lineHeight: 18 }}>Choose a service. Keep track of your place. Come to the window when called.</Text>
    </ScrollView>
  </SafeAreaView>;
}
