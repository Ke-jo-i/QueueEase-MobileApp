import { GlassSurface, translucent } from '@/components/glass-surface';
import { Reveal, MotionButton as TouchableOpacity } from '@/components/motion';
import { ServiceTransition } from '@/components/service-transition';
import { AppPalette } from '@/constants/app-colors';
import { useNavigationMotion } from '@/contexts/navigation-motion';
import { useQueue } from '@/contexts/queue';
import { useSession } from '@/contexts/session';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { type StackNavigationProp } from 'expo-router/js-stack';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ConfirmServiceScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { openTickets, booking, finishBooking } = useNavigationMotion();
  const navigation = useNavigation<StackNavigationProp<Record<string, object | undefined>>>();
  const { bookTicket, studentTicket, busy, connected, services, acceptingTickets } = useQueue();
  const { studentId } = useSession();
  const params = useLocalSearchParams<{ serviceName?: string }>();
  const requestedService = services.find(service => service.name === params.serviceName);
  const serviceTitle = studentTicket?.service ?? requestedService?.name ?? params.serviceName ?? 'Choose a service';
  const disabled = busy || booking || (!studentTicket && (!connected || !acceptingTickets || !requestedService?.available));

  useEffect(() => {
    const unsubscribe = navigation.addListener('transitionEnd', event => {
      if (event.data.closing) finishBooking();
    });
    return () => { unsubscribe(); finishBooking(); };
  }, [navigation, finishBooking]);

  const handleGetQueue = async () => {
    if (booking) return;
    if (studentTicket) { openTickets(); return; }
    if (!requestedService || !await bookTicket(requestedService.name)) return;
    openTickets();
  };

  return (
    <ServiceTransition><SafeAreaView style={styles.container} testID="confirm-service">
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} accessibilityLabel="Back" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.brandText} />
          <Text style={styles.headerTitle}>{studentTicket ? 'Your active ticket' : 'Confirm Service'}</Text>
        </TouchableOpacity>

        <Text style={styles.studentInfo}>Student: {studentId}</Text>

        <Reveal><GlassSurface variant="tinted" style={styles.serviceDetailCard}>
          {studentTicket ? <Text style={styles.ticketNumber}>{studentTicket.number}</Text> : <Ionicons name="document-text-outline" size={30} color={colors.brandText} style={{ marginBottom: 18 }} />}
          <Text style={styles.serviceNameTitle}>{serviceTitle}</Text>
          <Text style={styles.metaText}>{studentTicket?.window ?? requestedService?.window ?? 'Connecting…'}</Text>
          {!studentTicket && requestedService && !requestedService.available && <Text style={[styles.metaText, { color: colors.warningStrong }]}>{requestedService.unavailableReason || 'This service is temporarily unavailable.'}</Text>}
          {studentTicket && <View style={styles.ticketPolicy}>
            <Text style={styles.policyTitle}>One active ticket at a time.</Text>
            <Text style={styles.metaText}>Finish your current request, or cancel it while waiting, before joining another queue.</Text>
          </View>}
        </GlassSurface></Reveal>

        <View style={styles.footer}>
          <TouchableOpacity disabled={disabled} style={[styles.confirmButton, disabled && { opacity: 0.5 }]} onPress={handleGetQueue} activeOpacity={0.8}>
            <Text style={styles.confirmButtonText}>{busy ? 'Creating ticket…' : studentTicket ? 'View active ticket' : !acceptingTickets ? 'New tickets paused' : requestedService && !requestedService.available ? 'Service unavailable' : 'Get Queue Number'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView></ServiceTransition>
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
  ticketNumber: { fontSize: 44, fontWeight: '700', letterSpacing: -1, color: colors.brandText, marginBottom: 14 },
  ticketPolicy: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 18, marginTop: 18, gap: 4 },
  policyTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  metaText: {
    fontSize: 14, lineHeight: 22,
    color: colors.textMuted,
    marginTop: 2,
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
