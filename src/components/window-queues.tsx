import { useQueue } from '@/contexts/queue';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Text, View } from 'react-native';

export function WindowQueues() {
  const colors = useAppTheme();
  const { windowQueues, studentTicket, services, ready, connected } = useQueue();
  return <View style={{ gap: 12 }} testID="window-queues">
    <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>All registrar windows</Text>
    <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textMuted }}>{!ready ? 'Loading window queues…' : connected ? 'Updates as staff call and finish tickets. Each window has its own line.' : 'Showing the last update. Reconnect to see current progress.'}</Text>
    {ready && windowQueues.map(({ window, waitingCount, servingNumber, nextNumber }) => {
      const yours = studentTicket?.window === window;
      return <View key={window} testID={`queue-${window.split(' - ')[0].replace(' ', '-').toLowerCase()}`} style={{ padding: 18, gap: 12, borderRadius: 16, backgroundColor: yours ? colors.infoSurface : colors.surface,
        borderWidth: 1, borderColor: yours ? colors.brandText : colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{window.split(' - ')[0]}</Text>
          {yours && <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brandText }}>YOUR WINDOW</Text>}
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1, gap: 4 }}><Text style={{ fontSize: 11, color: colors.textMuted }}>NOW SERVING</Text>
            <Text style={{ fontSize: 23, fontWeight: '800', color: colors.brandText }}>{servingNumber ?? '—'}</Text>
          </View>
          <View style={{ gap: 4, alignItems: 'flex-end' }}><Text style={{ fontSize: 11, color: colors.textMuted }}>WAITING</Text>
            <Text style={{ fontSize: 23, fontWeight: '800', color: colors.text }}>{waitingCount}</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>{nextNumber ? `Next waiting: ${nextNumber}` : 'No tickets waiting'}</Text>
        <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textMuted }}>{services.filter(service => service.window === window && service.enabled).map(service => service.name).join(' · ') || 'No services currently available at this window'}</Text>
      </View>;
    })}
    <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textMuted }}>Ticket numbers are shared across windows. Your place depends on your window’s line, not the difference between ticket numbers. Processing time varies by request.</Text>
  </View>;
}
