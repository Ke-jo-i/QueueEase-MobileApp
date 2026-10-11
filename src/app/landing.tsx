import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { GlassSurface } from '@/components/glass-surface';
import { MotionButton, Reveal } from '@/components/motion';
import { BrandMark } from '@/components/brand-mark';

export default function LandingScreen() {
  const colors = useAppTheme();
  const router = useRouter();
  return <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 26, paddingVertical: 40, gap: 30, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Reveal style={{ gap: 20 }}>
        <GlassSurface style={{ alignSelf: 'flex-start', borderRadius: 24, width: 76, height: 76, alignItems: 'center', justifyContent: 'center' }}><BrandMark size={48} color={colors.brandText} /></GlassSurface>
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={{ fontSize: 42, lineHeight: 47, fontWeight: '700', letterSpacing: -1.9, color: colors.text }}>Queue Ease</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted }}>Registrar queue</Text>
        </View>
      </Reveal>
      <Reveal style={{ gap: 13 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.4 }}>SELECT YOUR PORTAL</Text>
        {([
          ['Student Portal', '', 'school-outline', '/login'],
          ['Staff Portal', 'Staff and administrators', 'people-outline', '/staff/login'],
        ] as const).map(([title, subtitle, icon, route], index) => <MotionButton key={route} accessibilityLabel={title} onPress={() => router.push(route)}>
          <GlassSurface interactive style={{ padding: 21, borderRadius: 26, flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <View style={{ width: 50, height: 50, borderRadius: 18, backgroundColor: index === 0 ? colors.infoSurface : colors.successSurface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={25} color={index === 0 ? colors.brandText : colors.successStrong} /></View>
            <View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 17, fontWeight: '700', letterSpacing: -0.3, color: colors.text }}>{title}</Text>{!!subtitle && <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textMuted }}>{subtitle}</Text>}</View>
            <Ionicons name="arrow-forward" size={19} color={colors.brandText} />
          </GlassSurface>
        </MotionButton>)}
      </Reveal>
    </ScrollView>
  </SafeAreaView>;
}
