import { ticketEventLabels } from '@/constants/queue-labels';
import type { Ticket } from '@/data/queue-model';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Text, View } from 'react-native';

export function TicketActivity({ ticket }: { ticket: Ticket }) {
  const colors = useAppTheme();
  return <View style={{ marginTop: 16 }}>
    <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 14 }}>Ticket activity</Text>
    {ticket.events.slice().reverse().map((event, index) => <View key={event.id} style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 12, alignItems: 'center' }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, marginTop: 4, backgroundColor: index === 0 ? colors.brandText : colors.borderStrong }} />
        {index < ticket.events.length - 1 && <View style={{ flex: 1, width: 1, backgroundColor: colors.border, marginVertical: 4 }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: 18 }}>
        <Text style={{ color: colors.textBody, fontSize: 13, fontWeight: '700' }}>{ticketEventLabels[event.type]}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 3 }}>{event.window.replace(' - Registrar', '')} · {new Date(event.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text>
        {event.reason && <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{event.reason}</Text>}
      </View>
    </View>)}
  </View>;
}
