import { AppPalette } from '@/constants/app-colors';
import { useQueue } from '@/contexts/queue';
import { useThemedStyles } from '@/hooks/use-app-theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AlertsScreen() {
  const styles = useThemedStyles(createStyles);
  const { studentTicket, studentHistory } = useQueue();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="student-alerts">
      <Text style={styles.title}>Notifications</Text>
      <ScrollView contentContainerStyle={styles.content}>
        {studentTicket && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{studentTicket.status === 'SERVING' ? 'Your turn' : 'Ticket created'}</Text>
            <Text style={styles.message}>
              {studentTicket.status === 'SERVING'
                ? `${studentTicket.number}: Please proceed to ${studentTicket.window}.`
                : `${studentTicket.number} for ${studentTicket.service} is waiting in line.`}
            </Text>
          </View>
        )}
        {studentHistory.map((ticket) => (
          <View key={ticket.number} style={styles.card}>
            <Text style={styles.cardTitle}>Ticket {ticket.status.toLowerCase()}</Text>
            <Text style={styles.message}>{ticket.number} for {ticket.service}</Text>
            <Text style={styles.date}>{ticket.date}</Text>
          </View>
        ))}
        {!studentTicket && studentHistory.length === 0 && (
          <Text style={styles.empty}>No notifications yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceSubtle },
  title: { fontSize: 22, fontWeight: '800', color: colors.brandText, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textBody, marginBottom: 4 },
  message: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  date: { fontSize: 11, color: colors.textDisabled, marginTop: 8 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
