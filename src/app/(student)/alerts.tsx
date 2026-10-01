import { AppPalette } from '@/constants/app-colors';
import { useQueue } from '@/contexts/queue';
import { ticketEventLabels } from '@/constants/queue-labels';
import { useThemedStyles } from '@/hooks/use-app-theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AlertsScreen() {
  const styles = useThemedStyles(createStyles);
  const { studentTicket, studentTickets, studentProgress } = useQueue();
  const notifications = studentTickets.flatMap((ticket) => ticket.events.map((event) => ({ ticket, event })))
    .reverse().sort((a, b) => b.event.at.localeCompare(a.event.at));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="student-alerts">
      <Text style={styles.title}>Notifications</Text>
      <ScrollView contentContainerStyle={styles.content}>
        {studentTicket && (studentProgress?.nextInLine || studentTicket.status === 'SERVING') && <View style={[styles.card, styles.currentNotice]}>
          <Text style={styles.cardTitle}>{studentTicket.status === 'SERVING' ? 'Your turn' : 'You’re next in line'}</Text>
          <Text style={styles.message}>{studentTicket.status === 'SERVING'
            ? `${studentTicket.number}: Please proceed to ${studentTicket.window}.`
            : `${studentTicket.number}: Stay nearby. Staff will call your number when ready.`}</Text>
        </View>}
        {notifications.map(({ ticket, event }) => (
          <View key={event.id} style={styles.card}>
            <Text style={styles.cardTitle}>{ticketEventLabels[event.type]}</Text>
            <Text style={styles.message}>{event.type === 'CREATED'
              ? `${ticket.number} for ${ticket.service} joined the waiting line.`
              : `${ticket.number} · ${event.window.replace(' - Registrar', '')}`}</Text>
            {event.reason && <Text style={styles.message}>{event.reason}</Text>}
            <Text style={styles.date}>{new Date(event.at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
          </View>
        ))}
        {notifications.length === 0 && (
          <Text style={styles.empty}>No notifications yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  currentNotice: { backgroundColor: colors.blueSoft, borderColor: colors.brandText },
  container: { flex: 1, backgroundColor: colors.surfaceSubtle },
  title: { fontSize: 22, fontWeight: '800', color: colors.brandText, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textBody, marginBottom: 4 },
  message: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  date: { fontSize: 11, color: colors.textDisabled, marginTop: 8 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});
