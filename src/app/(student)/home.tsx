import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueue } from '@/contexts/queue';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { studentTicket } = useQueue();

  const registrarServices = [
    'Certificate of Enrollment',
    'Certificate of Grades',
    'Academic Records Request',
    'Enrollment Concern',
    'Student Record Update',
    'Other Registrar Concern',
  ];

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
          <Text style={styles.brandTitle}>QueueEase</Text>
          <TouchableOpacity style={styles.profileIconBtn} onPress={() => router.push('/profile')}>
            <Ionicons name="person-outline" size={22} color={colors.brandText} />
          </TouchableOpacity>
        </View>

        {/* Greeting & Active Queue Banner */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Good day!</Text>

          <View style={styles.queueBanner}>
            <Text style={styles.queueBannerLabel}>Current Queue</Text>
            <Text style={styles.queueBannerTitle}>{studentTicket ? studentTicket.number : 'No ticket yet'}</Text>
            {studentTicket && <Text style={styles.queueBannerSub}>{studentTicket.service}</Text>}
          </View>
        </View>

        {/* All Registrar Services List with Hover Effect */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Registrar Services</Text>

          {registrarServices.map((service, index) => (
            <Pressable
              key={index}
              onPress={() => handleSelectService(service)}
              style={({ hovered, pressed }) => [
                styles.serviceCard,
                hovered && styles.serviceCardHovered, // Kulay kapag itinaas lang ang mouse cursor
                pressed && styles.serviceCardPressed, // Kulay kapag talagang pino-press/kiniclick
              ]}
            >
              {({ hovered }) => (
                <Text
                  style={[
                    styles.serviceName,
                    hovered && styles.serviceNameHovered,
                  ]}
                >
                  {service}
                </Text>
              )}
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
    justifyContent: 'center',
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
  },

  serviceNameHovered: {
    color: colors.brandText,
    fontWeight: 'bold',
  },
});
