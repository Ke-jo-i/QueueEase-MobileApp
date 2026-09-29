import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueue } from '@/contexts/queue';
import { useSession } from '@/contexts/session';
import { getServiceWindow } from '@/constants/service-windows';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Dynamic data para sa bawat Registrar Service
const SERVICE_DETAILS: Record<string, {
  waitTime: string;
  requirements: string;
  reminders: string[];
  processingTime: string;
}> = {
  'Certificate of Enrollment': {
    waitTime: '20 - 30 mins',
    requirements: 'Student ID & Assessment Form',
    reminders: [
      '• Show valid Student ID at Window 3',
      '• Bring printed Assessment Form',
      '• Strictly no proxy allowed',
    ],
    processingTime: 'Est. Processing: 1-2 Working Days',
  },
  'Certificate of Grades': {
    waitTime: '15 - 25 mins',
    requirements: 'Student ID & Official Clearance',
    reminders: [
      '• Ensure all subject grades are fully submitted by professors',
      '• Present school clearance from the previous semester',
      '• Payment of ₱50 fee at the Cashier if requested for official transcript copy',
    ],
    processingTime: 'Est. Processing: Same Day',
  },
  'Academic Records Request': {
    waitTime: '30 - 45 mins',
    requirements: 'Transcript Request Form, 2x2 Picture, Clearance',
    reminders: [
      '• Complete the Registrar Request Form beforehand',
      '• Submit 2 recent 2x2 ID photos with white background',
      '• Clearance from Library and Accounting is required',
    ],
    processingTime: 'Est. Processing: 3-5 Working Days',
  },
  'Enrollment Concern': {
    waitTime: '10 - 20 mins',
    requirements: 'Student ID & Subject Pre-evaluation Slip',
    reminders: [
      '• Prepare list of affected subject codes or schedule conflicts',
      '• Proceed to Window 1 for subject adding/dropping queries',
      '• Bring signed endorsement from Department Head if overload',
    ],
    processingTime: 'Est. Processing: Immediate upon review',
  },
  'Student Record Update': {
    waitTime: '20 - 30 mins',
    requirements: 'PSA Birth Certificate / Supporting Legal Documents',
    reminders: [
      '• Bring original and photocopy of PSA Birth Certificate for name correction',
      '• Submit formal letter request addressed to the Registrar',
      '• Affidavit of Discrepancy required for major record changes',
    ],
    processingTime: 'Est. Processing: 2-3 Working Days',
  },
  'Other Registrar Concern': {
    waitTime: '15 - 30 mins',
    requirements: 'Valid Student ID',
    reminders: [
      '• Prepare a clear explanation of your concern',
      '• Bring any relevant documents related to your inquiry',
      '• Proceed to Helpdesk / Information Window',
    ],
    processingTime: 'Est. Processing: Varies per request',
  },
};

export default function ConfirmServiceScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { bookTicket } = useQueue();
  const { studentId } = useSession();
  const params = useLocalSearchParams();
  const serviceTitle = (params.serviceName as string) || 'Certificate of Enrollment';

  // Kunin ang partikular na details base sa napiling service (fallback sa default kung wala)
  const details = SERVICE_DETAILS[serviceTitle] || SERVICE_DETAILS['Certificate of Enrollment'];

  const handleGetQueue = () => {
    if (!bookTicket(serviceTitle, getServiceWindow(serviceTitle))) {
      Alert.alert('Active ticket', 'Cancel your current ticket before getting another one.');
      return;
    }
    router.navigate('/tickets');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Back Button & Title */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.brandText} />
          <Text style={styles.headerTitle}>Confirm Service</Text>
        </TouchableOpacity>

        <Text style={styles.studentInfo}>Student: {studentId} (Tagum Campus)</Text>

        {/* Selected Service Detail Card */}
        <View style={styles.serviceDetailCard}>
          <Text style={styles.serviceNameTitle}>{serviceTitle}</Text>
          <Text style={styles.metaText}>Est. Waiting Time: {details.waitTime}</Text>
          <Text style={styles.metaText}>Req: {details.requirements}</Text>
        </View>

        {/* Important Reminders Box (Dynamic na nagbabago) */}
        <View style={styles.remindersCard}>
          <Text style={styles.remindersTitle}>Important Reminders</Text>

          {details.reminders.map((reminder, idx) => (
            <View key={idx} style={styles.bulletItem}>
              <Text style={styles.bulletText}>{reminder}</Text>
            </View>
          ))}

          <Text style={styles.processingTime}>{details.processingTime}</Text>
        </View>

        {/* Get Queue Number Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleGetQueue} activeOpacity={0.8}>
            <Text style={styles.confirmButtonText}>Get Queue Number</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
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
