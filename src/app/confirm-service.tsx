import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueue } from '@/contexts/queue';
import { useSession } from '@/contexts/session';
import { getServiceWindow } from '@/constants/service-windows';
import { registrarReminders, serviceDescriptions } from '@/constants/registrar-services';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ConfirmServiceScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { bookTicket, studentTicket } = useQueue();
  const { studentId } = useSession();
  const params = useLocalSearchParams();
  const serviceTitle = (params.serviceName as string) || 'Certificate of Enrollment';

  const handleGetQueue = () => {
    if (studentTicket) { router.navigate('/tickets'); return; }
    if (!bookTicket(serviceTitle)) {
      Alert.alert('Active ticket', 'Cancel your current ticket before getting another one.');
      return;
    }
    router.navigate('/tickets');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Back Button & Title */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.brandText} />
          <Text style={styles.headerTitle}>Confirm Service</Text>
        </TouchableOpacity>

        <Text style={styles.studentInfo}>Student: {studentId} (Tagum Campus)</Text>

        {/* Selected Service Detail Card */}
        <View style={styles.serviceDetailCard}>
          <Text style={styles.serviceNameTitle}>{serviceTitle}</Text>
          <Text style={styles.metaText}>{serviceDescriptions[serviceTitle]}</Text>
          <Text style={styles.metaText}>Queue window: {getServiceWindow(serviceTitle)}</Text>
        </View>

        {/* Important Reminders Box (Dynamic na nagbabago) */}
        <View style={styles.remindersCard}>
          <Text style={styles.remindersTitle}>Important Reminders</Text>

          {registrarReminders.map((reminder) => (
            <View key={reminder} style={styles.bulletItem}>
              <Text style={styles.bulletText}>• {reminder}</Text>
            </View>
          ))}

          <Text style={styles.processingTime}>Your queue number is for your turn at the window, not a document release time.</Text>
        </View>

        {/* Get Queue Number Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleGetQueue} activeOpacity={0.8}>
            <Text style={styles.confirmButtonText}>{studentTicket ? 'View active ticket' : 'Get Queue Number'}</Text>
          </TouchableOpacity>
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
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.brandText,
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
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  serviceNameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  remindersCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
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
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
