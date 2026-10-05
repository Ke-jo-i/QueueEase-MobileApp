import { MotionButton as TouchableOpacity, Reveal } from '@/components/motion';
import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueue } from '@/contexts/queue';
import { serviceDescriptions } from '@/constants/registrar-services';
import { Notice } from '@/components/form';
import { useSession } from '@/contexts/session';
import { ticketStatusLabels } from '@/constants/queue-labels';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { studentTicket, studentProgress, services, acceptingTickets, ready, connected } = useQueue();
  const { user } = useSession();

  const handleSelectService = (serviceName: string) => {
    router.push({
      pathname: '/confirm-service',
      params: { serviceName },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="student-home">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>QueueEase</Text>
            <Text style={styles.campusLabel}>Registrar · UM Tagum</Text>
          </View>
          <TouchableOpacity style={styles.profileIconBtn} onPress={() => router.push('/profile')}>
            <Ionicons name="person-outline" size={22} color={colors.brandText} />
          </TouchableOpacity>
        </View>

        {/* Greeting & Active Queue Banner */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Good day, {user?.name.split(' ')[0]}.</Text>

          <Reveal style={styles.queueBanner}>
            <Text style={styles.queueBannerLabel}>{!ready ? 'Connecting' : studentTicket ? ticketStatusLabels[studentTicket.status] : 'Ready when you are'}</Text>
            <Text style={styles.queueBannerTitle}>{!ready ? 'Loading your queue…' : studentTicket ? studentTicket.number : 'No ticket yet'}</Text>
            {studentTicket && <Text style={styles.queueBannerSub}>{studentTicket.service}</Text>}
            {studentTicket && <>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>{studentTicket.window.replace(' - Registrar', '')}</Text>
                <Text style={styles.progressText}>{studentProgress?.peopleAhead !== null && studentProgress?.peopleAhead !== undefined
                  ? `${studentProgress.peopleAhead} ${studentProgress.peopleAhead === 1 ? 'person' : 'people'} ahead`
                  : studentTicket.status === 'HELD' ? 'Check staff instructions' : 'Please proceed to the window'}</Text>
              </View>
              <TouchableOpacity style={styles.progressButton} accessibilityRole="button" onPress={() => router.push('/live-status')}>
                <Text style={styles.progressButtonText}>View queue progress</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.brandText} />
              </TouchableOpacity>
            </>}
            {!studentTicket && <Text style={styles.queueBannerSub}>Choose a service below to join the queue.</Text>}
          </Reveal>
        </View>

        {/* All Registrar Services List with Hover Effect */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Registrar Services</Text>

          {ready && !acceptingTickets && <Notice text="New tickets are paused. Existing tickets remain in the queue. Please check again later." />}
          {services.map(({ name: service, enabled }) => (
            <Pressable
              key={service}
              accessibilityRole="button"
              accessibilityLabel={service}
              disabled={!connected || !enabled || !acceptingTickets}
              onPress={() => handleSelectService(service)}
              style={({ hovered, pressed }) => [
                styles.serviceCard,
                (!enabled || !acceptingTickets) && { opacity: 0.45 },
                hovered && styles.serviceCardHovered, // Kulay kapag itinaas lang ang mouse cursor
                pressed && styles.serviceCardPressed, // Kulay kapag talagang pino-press/kiniclick
              ]}
            >
              {({ hovered }) => (<>
                <View style={styles.serviceInfo}><Text
                  style={[
                    styles.serviceName,
                    hovered && styles.serviceNameHovered,
                  ]}
                >
                  {service}
                </Text>
                <Text style={styles.serviceDescription}>{enabled ? serviceDescriptions[service] : 'Temporarily unavailable'}</Text></View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </>)}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.brandText,
  },
  campusLabel: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  progressText: { fontSize: 12, color: colors.brandText, fontWeight: '700' },
  progressButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 14, paddingTop: 14, minHeight: 44 },
  progressButtonText: { color: colors.brandText, fontSize: 13, fontWeight: '700' },
  serviceInfo: { flex: 1 },
  serviceDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  profileIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeSection: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  queueBanner: {
    backgroundColor: colors.bluePale,
    borderRadius: 16,
    padding: 20,
  },
  queueBannerLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  queueBannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.brandText,
    marginBottom: 4,
  },
  queueBannerSub: {
    fontSize: 13,
    color: colors.textMuted,
  },
  servicesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },

  // Default Box Style
  serviceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    cursor: 'pointer',
  },


  serviceCardHovered: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.brandText,
  },


  serviceCardPressed: {
    backgroundColor: colors.blueSurface,
  },

  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'left',
  },

  serviceNameHovered: {
    color: colors.brandText,
    fontWeight: 'bold',
  },
});
