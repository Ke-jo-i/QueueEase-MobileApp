import { AppPalette } from '@/constants/app-colors';
import { useQueue } from '@/contexts/queue';
import { ticketEventLabels } from '@/constants/queue-labels';
import { useThemedStyles } from '@/hooks/use-app-theme';
import { GlassSurface, translucent } from '@/components/glass-surface';
import { Reveal } from '@/components/motion';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AlertsScreen() {
  const styles = useThemedStyles(createStyles);
  const { studentTicket, studentTickets, studentProgress } = useQueue();
  const notifications = studentTickets.flatMap((ticket) => ticket.events.map((event) => ({ ticket, event })))
    .reverse().sort((a, b) => b.event.at.localeCompare(a.event.at));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="student-alerts">
      <Text accessibilityRole="header" style={styles.title}>Notifications</Text>
      <ScrollView contentContainerStyle={styles.content}>
        {studentTicket && (studentProgress?.nextInLine || studentTicket.status === 'SERVING') && <Reveal><GlassSurface variant="tinted" style={[styles.card, styles.currentNotice]}>
          <Ionicons name="notifications-outline" size={26} color={styles.title.color} style={{ marginBottom: 12 }} />
          <Text style={styles.cardTitle}>{studentTicket.status === 'SERVING' ? 'Your turn' : 'You’re next in line'}</Text>
          <Text style={styles.message}>{studentTicket.status === 'SERVING'
            ? `${studentTicket.number}: Please proceed to ${studentTicket.window}.`
            : `${studentTicket.number}: Stay nearby. Staff will call your number when ready.`}</Text>
        </GlassSurface></Reveal>}
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
          <Reveal><GlassSurface style={{ alignItems: 'center', padding: 36, gap: 16, marginTop: 12 }}>
            <Ionicons name="notifications-outline" size={36} color={styles.title.color} />
            <Text style={styles.empty}>No notifications yet.</Text>
            <Text style={[styles.message, { textAlign: 'center' }]}>Your ticket updates will appear here.</Text>
          </GlassSurface></Reveal>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  currentNotice: { backgroundColor: colors.blueSoft, borderColor: colors.brandText },
  container: { flex: 1, backgroundColor: 'transparent' },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8, color: colors.textStrong, paddingHorizontal: 22, paddingTop: 24, paddingBottom: 20, width: '100%', maxWidth: 720, alignSelf: 'center' },
  content: { paddingHorizontal: 22, paddingBottom: 32, width: '100%', maxWidth: 720, alignSelf: 'center' },
  card: { backgroundColor: translucent(colors.surface, 0.75), borderRadius: 22, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: translucent(colors.border, 0.6) },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.textBody, marginBottom: 6 },
  message: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  date: { fontSize: 11, color: colors.textDisabled, marginTop: 8 },
  empty: { fontSize: 19, fontWeight: '600', color: colors.text, textAlign: 'center' },
});
