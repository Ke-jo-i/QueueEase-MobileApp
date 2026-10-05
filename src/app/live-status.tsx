import { MotionButton as TouchableOpacity } from '@/components/motion';
import { AppPalette } from '@/constants/app-colors';
import { TicketActivity } from '@/components/ticket-activity';
import { ticketStatusLabels } from '@/constants/queue-labels';
import { useQueue } from '@/contexts/queue';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function LiveQueueScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { studentTicket, studentProgress } = useQueue();

  return (
    <SafeAreaView style={styles.container} testID="live-queue">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.brandText} />
          <Text style={styles.headerTitle}>Live Queue</Text>
        </TouchableOpacity>
        {!studentTicket ? <View style={styles.card}>
          <Text style={styles.progressTitle}>No active ticket</Text>
          <Text style={styles.detail}>Choose a registrar service to join the queue.</Text>
          <TouchableOpacity style={styles.ticketButton} onPress={() => router.replace('/home')}><Text style={styles.ticketButtonText}>Choose a service</Text></TouchableOpacity>
        </View> : <>
        <View style={styles.yourTicketCard}>
          <Text style={styles.label}>YOUR TICKET NUMBER</Text>
          <Text style={styles.ticketNumber}>{studentTicket.number}</Text>
          <Text style={styles.detail}>{studentTicket.service}</Text>
          <Text style={styles.window}>{studentTicket.window}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.status}>{ticketStatusLabels[studentTicket.status]}</Text>
          {studentTicket.status === 'WAITING' && <>
            <View style={styles.statsRow}>
              <View style={styles.stat}><Text style={styles.label}>PEOPLE AHEAD</Text><Text style={styles.statValue}>{studentProgress?.peopleAhead}</Text></View>
              <View style={styles.stat}><Text style={styles.label}>NOW SERVING</Text><Text style={styles.statValue}>{studentProgress?.serving?.number ?? '—'}</Text></View>
            </View>
            <Text style={styles.detail}>{studentProgress?.nextInLine ? 'You’re next in line. Stay nearby and wait for staff to call your number.' : 'Your place updates as staff work through this window’s queue.'}</Text>
          </>}
          {studentTicket.status === 'SERVING' && <Text style={styles.detail}>Please proceed to {studentTicket.window.replace(' - Registrar', '')} with your student ID and request documents.</Text>}
          {studentTicket.status === 'HELD' && <>
            <Text style={styles.detail}>{studentTicket.reason}</Text>
            <Text style={styles.detail}>Speak with staff when you are ready. They can return this ticket to the waiting line.</Text>
          </>}
        </View>
        <View style={styles.card}>
          <TicketActivity ticket={studentTicket} />
        </View>
        <TouchableOpacity style={styles.ticketButton} accessibilityRole="button" onPress={() => router.navigate('/tickets')}><Text style={styles.ticketButtonText}>Open my ticket</Text></TouchableOpacity>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.brandText, marginLeft: 8 },
  yourTicketCard: { backgroundColor: colors.surfaceMuted, borderRadius: 16, padding: 20, marginBottom: 16 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 20, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: 'bold', color: colors.textMuted, letterSpacing: 0.8, marginBottom: 6 },
  ticketNumber: { fontSize: 36, fontWeight: 'bold', color: colors.brandText },
  window: { fontSize: 13, color: colors.brandText, fontWeight: '700', marginTop: 12 },
  statsRow: { flexDirection: 'row', gap: 12, marginVertical: 18 },
  stat: { flex: 1 },
  statValue: { color: colors.brandText, fontSize: 26, fontWeight: '800' },
  ticketButton: { alignItems: 'center', borderRadius: 10, padding: 15, backgroundColor: colors.brand, marginTop: 8 },
  ticketButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  status: { fontSize: 22, fontWeight: 'bold', color: colors.brandText, marginBottom: 10 },
  progressTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  detail: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginTop: 4 },
});
