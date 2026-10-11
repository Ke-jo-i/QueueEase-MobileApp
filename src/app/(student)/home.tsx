import { Notice } from '@/components/form';
import { Reveal, MotionButton as TouchableOpacity } from '@/components/motion';
import { AppPalette } from '@/constants/app-colors';
import { ticketStatusLabels } from '@/constants/queue-labels';
import { serviceDescriptions } from '@/constants/registrar-services';
import { useQueue } from '@/contexts/queue';
import { useSession } from '@/contexts/session';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Ang 6 na eksaktong Registrar Services options
const SERVICES_LIST = [
  { name: 'Certificate of Enrollment', enabled: true },
  { name: 'Certificate of Grades', enabled: true },
  { name: 'Academic Records Request', enabled: true },
  { name: 'Enrollment Concern', enabled: true },
  { name: 'Student Record Update', enabled: true },
  { name: 'Other Registrar Concern', enabled: true },
];

export default function HomeScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { studentTicket, studentProgress, services, acceptingTickets } = useQueue();
  const { user } = useSession();

  // Gamitin ang galing sa backend kung mayroon, kung wala ay gamitin agad ang fixed list
  const displayServices = services && services.length > 0 ? services : SERVICES_LIST;
  const isAccepting = acceptingTickets !== undefined ? acceptingTickets : true;

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
            <Text style={styles.brandTitle}>Queue Ease</Text>
            <Text style={styles.campusLabel}>Registrar</Text>
          </View>
          <TouchableOpacity style={styles.profileIconBtn} onPress={() => router.push('/profile')}>
            <Ionicons name="person-outline" size={22} color={colors.brandText} />
          </TouchableOpacity>
        </View>

        {/* Greeting & Active Queue Banner */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Good day, {user?.name ? user.name.split(' ')[0] : 'Student'}.</Text>

          <Reveal style={styles.queueBanner}>
            <Text style={styles.queueBannerLabel}>
              {studentTicket ? ticketStatusLabels[studentTicket.status] : 'Ready when you are'}
            </Text>
            <Text style={styles.queueBannerTitle}>
              {studentTicket ? studentTicket.number : 'No ticket yet'}
            </Text>
            {studentTicket && <Text style={styles.queueBannerSub}>{studentTicket.service}</Text>}
            {studentTicket && (
              <>
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>{studentTicket.window.replace(' - Registrar', '')}</Text>
                  <Text style={styles.progressText}>
                    {studentProgress?.peopleAhead !== null && studentProgress?.peopleAhead !== undefined
                      ? `${studentProgress.peopleAhead} ${studentProgress.peopleAhead === 1 ? 'person' : 'people'} ahead`
                      : studentTicket.status === 'HELD'
                      ? 'Check staff instructions'
                      : 'Please proceed to the window'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.progressButton}
                  accessibilityRole="button"
                  accessibilityLabel="View queue progress"
                  onPress={() => router.push('/live-status')}
                >
                  <Text style={styles.progressButtonText}>View queue progress</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.brandText} />
                </TouchableOpacity>
              </>
            )}
            {!studentTicket && (
              <Text style={styles.queueBannerSub}>Choose a service below to join the queue.</Text>
            )}
            {!studentTicket && (
              <TouchableOpacity
                style={styles.progressButton}
                accessibilityLabel="View all window queues"
                onPress={() => router.push('/live-status')}
              >
                <Text style={styles.progressButtonText}>View all window queues</Text>
                <Ionicons name="arrow-up" size={16} color={colors.brandText} />
              </TouchableOpacity>
            )}
          </Reveal>
        </View>

        {/* Registrar Services List */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Registrar Services</Text>

          {!isAccepting && (
            <Notice text="New tickets are paused. Existing tickets remain in the queue. Please check again later." />
          )}

          {displayServices.map(({ name: service, enabled }) => (
            <Reveal key={service}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={service}
                disabled={!enabled || !isAccepting}
                onPress={() => handleSelectService(service)}
                style={({ hovered, pressed }: { hovered?: boolean; pressed?: boolean }) => [
                  styles.serviceCard,
                  (!enabled || !isAccepting) && { opacity: 0.45 },
                  hovered && styles.serviceCardHovered,
                  pressed && styles.serviceCardPressed,
                ]}
              >
                {({ hovered }: { hovered?: boolean }) => (
                  <>
                    <View style={styles.serviceInfo}>
                      <Text style={[styles.serviceName, hovered && styles.serviceNameHovered]}>
                        {service}
                      </Text>
                      <Text style={styles.serviceDescription}>
                        {enabled
                          ? serviceDescriptions[service] || 'Select to request queue ticket'
                          : 'Temporarily unavailable'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </>
                )}
              </Pressable>
            </Reveal>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) =>
  StyleSheet.create({
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
    campusLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 3,
    },
    progressRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 16,
    },
    progressText: {
      fontSize: 12,
      color: colors.brandText,
      fontWeight: '700',
    },
    progressButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 14,
      paddingTop: 14,
      minHeight: 44,
    },
    progressButtonText: {
      color: colors.brandText,
      fontSize: 13,
      fontWeight: '700',
    },
    serviceInfo: {
      flex: 1,
    },
    serviceDescription: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 5,
    },
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