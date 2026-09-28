import { AppPalette } from '@/constants/app-colors';
import { useQueue } from '@/contexts/queue';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LiveQueueScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { studentTicket } = useQueue();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.brandText} />
          <Text style={styles.headerTitle}>Live Queue</Text>
        </TouchableOpacity>
        <View style={styles.yourTicketCard}>
          <Text style={styles.label}>YOUR TICKET NUMBER</Text>
          <Text style={styles.ticketNumber}>{studentTicket?.number ?? 'No active ticket'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>TICKET STATUS</Text>
          <Text style={styles.status}>{studentTicket?.status === 'SERVING' ? 'Now serving' : studentTicket ? 'Waiting in line' : 'No active ticket'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.progressTitle}>Queue Progress</Text>
          <Text style={styles.detail}>
            {studentTicket ? `${studentTicket.service} · ${studentTicket.window}` : 'Get a ticket to join the queue.'}
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.detail}>Staff will call the next ticket when ready.</Text>
        </View>
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
  status: { fontSize: 24, fontWeight: 'bold', color: colors.brandText },
  progressTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  detail: { fontSize: 14, color: colors.textSecondary },
});
