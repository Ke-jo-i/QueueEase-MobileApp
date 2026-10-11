import { MotionButton as TouchableOpacity, Reveal } from '@/components/motion';
import { GlassSurface, translucent } from '@/components/glass-surface';
import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { type StackNavigationProp } from 'expo-router/js-stack';
import { useEffect } from 'react';
import { useQueue } from '@/contexts/queue';
import { useSession } from '@/contexts/session';
import { registrarReminders, serviceDescriptions } from '@/constants/registrar-services';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigationMotion } from '@/contexts/navigation-motion';

export default function ConfirmServiceScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { openTickets, booking, finishBooking } = useNavigationMotion();
  const navigation = useNavigation<StackNavigationProp<Record<string, object | undefined>>>();
  const { bookTicket, studentTicket, busy, connected, services, acceptingTickets } = useQueue();
  const { studentId } = useSession();
  const params = useLocalSearchParams();
  const serviceTitle = (params.serviceName as string) || 'Certificate of Enrollment';

  useEffect(() => {
    const unsubscribe = navigation.addListener('transitionEnd', event => {
      if (event.data.closing) finishBooking();
    });
    return () => { unsubscribe(); finishBooking(); };
  }, [navigation, finishBooking]);

  const handleGetQueue = async () => {
    if (booking) return;
    if (studentTicket) { openTickets(); return; }
    if (!await bookTicket(serviceTitle)) return;
    openTickets();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Back Button & Title */}
        <TouchableOpacity style={styles.backButton} accessibilityLabel="Back" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.brandText} />
          <Text style={styles.headerTitle}>Confirm Service</Text>
        </TouchableOpacity>

        <Text style={styles.studentInfo}>Student: {studentId}</Text>

        {/* Selected Service Detail Card */}
        <Reveal><GlassSurface variant="tinted" style={styles.serviceDetailCard}>
          <Ionicons name="document-text-outline" size={30} color={colors.brandText} style={{ marginBottom: 18 }} />
          <Text style={styles.serviceNameTitle}>{serviceTitle}</Text>
          <Text style={styles.metaText}>{serviceDescriptions[serviceTitle]}</Text>
          <Text style={styles.metaText}>Queue window: {services.find((service) => service.name === serviceTitle)?.window ?? 'Connecting…'}</Text>
        </GlassSurface></Reveal>

        {/* Important Reminders Box (Dynamic na nagbabago) */}
        <Reveal delay={60}><GlassSurface style={styles.remindersCard}>
          <Text style={styles.remindersTitle}>Important Reminders</Text>

          {registrarReminders.map((reminder) => (
            <View key={reminder} style={styles.bulletItem}>
              <Text style={styles.bulletText}>• {reminder}</Text>
            </View>
          ))}

          <Text style={styles.processingTime}>Your queue number is for your turn at the window, not a document release time.</Text>
        </GlassSurface></Reveal>

        {/* Get Queue Number Button */}
        <View style={styles.footer}>
          <TouchableOpacity disabled={busy || booking || !connected || (!studentTicket && !acceptingTickets)} style={[styles.confirmButton, (busy || booking || !connected || !acceptingTickets) && { opacity: 0.5 }]} onPress={handleGetQueue} activeOpacity={0.8}>
            <Text style={styles.confirmButtonText}>{busy ? 'Creating ticket…' : studentTicket ? 'View active ticket' : !acceptingTickets ? 'New tickets paused' : 'Get Queue Number'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flexGrow: 1,
    width: '100%', maxWidth: 720, alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28, letterSpacing: -0.7,
    fontWeight: '700',
    color: colors.textStrong,
    marginLeft: 4,
  },
  studentInfo: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
    marginLeft: 28,
  },
  serviceDetailCard: {
    backgroundColor: colors.surface,
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  serviceNameTitle: {
    fontSize: 25, lineHeight: 32, letterSpacing: -0.5,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 14, lineHeight: 22,
    color: colors.textMuted,
    marginTop: 2,
  },
  remindersCard: {
    backgroundColor: colors.surface,
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  remindersTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  bulletItem: {
    marginBottom: 6,
  },
  bulletText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textBody,
  },
  processingTime: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.info,
    marginTop: 16,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 20,
    paddingBottom: 24,
  },
  confirmButton: {
    backgroundColor: colors.brand,
    borderRadius: 22,
    paddingVertical: 18,
    boxShadow: `0 7px 18px ${translucent(colors.brand, 0.18)}`,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
