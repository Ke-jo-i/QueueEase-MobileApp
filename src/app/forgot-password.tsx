import { ActionButton, FormPage, Notice } from '@/components/form';
import { GlassSurface } from '@/components/glass-surface';
import { Reveal } from '@/components/motion';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
export default function AccountRecoveryScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  return <FormPage title="Account recovery" subtitle="Ask the Queue Ease project administrator to help you regain access.">
    <Reveal><GlassSurface style={{ borderRadius: 28, padding: 22, gap: 22 }}>
      <View style={{ width: 60, height: 60, borderRadius: 22, backgroundColor: colors.infoSurface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="key-outline" color={colors.brandText} size={28} /></View>
      <Notice text="Present your student or staff ID so the administrator can verify your identity and reset your password. After signing in, change it in Profile. Email recovery is not enabled for this installation." />
      <ActionButton label="Back to portals" onPress={() => router.replace('/landing')} />
    </GlassSurface></Reveal>
  </FormPage>;
}
