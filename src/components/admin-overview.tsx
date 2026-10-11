import { type AdminData } from '@/data/admin-model';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { AdminPanel } from './admin-controls';
import { Disclosure } from './disclosure';
import { ActionButton, Notice } from './form';
import { GlassSurface } from './glass-surface';
import { MotionButton } from './motion';

export function AdminOverview({ data, busy, error, toggle }: { data: AdminData; busy: boolean; error: string; toggle: () => void }) {
  const colors = useAppTheme();
  const wide = useWindowDimensions().width >= 850;
  const [details, setDetails] = useState(false);
  const stats = data.statistics;
  const load = data.windows.reduce((total, window) => total + window.waiting, 0);
  return <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'flex-start', gap: 20 }}>
    <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', gap: 20 }}>
    <GlassSurface variant="tinted" style={{ padding: 24, gap: 18, borderRadius: 28 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>REGISTRAR QUEUE</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: data.acceptingTickets ? colors.successStrong : colors.warningStrong }} /><Text style={{ color: colors.textMuted, fontSize: 12 }}>{data.acceptingTickets ? 'Open' : 'Paused'}</Text></View></View>
      <View style={{ gap: 4 }}><Text style={{ color: colors.textStrong, fontSize: 36, letterSpacing: -1.2, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{stats.waiting + stats.serving + stats.held}</Text><Text style={{ color: colors.textMuted, fontSize: 14 }}>Active requests · {stats.staffedWindows} staffed {stats.staffedWindows === 1 ? 'window' : 'windows'}</Text></View>
      <Notice text={error} error />
      <ActionButton label={data.acceptingTickets ? 'Pause new tickets' : 'Open queue'} disabled={busy} secondary={data.acceptingTickets} onPress={toggle} />
    </GlassSurface>
    <View style={{ flexDirection: 'row', gap: 10 }}>{[
      ['Waiting', stats.waiting, colors.brandText], ['Serving', stats.serving, colors.successStrong], ['On hold', stats.held, colors.warningStrong],
    ].map(([label, value, color]) => <GlassSurface key={String(label)} style={{ flex: 1, padding: 16, gap: 7, borderRadius: 22 }}><Text style={{ color: String(color), fontSize: 27, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text></GlassSurface>)}</View>
    <AdminPanel title="Today">
      <View style={{ flexDirection: 'row', gap: 20 }}>{[['Requested', stats.requestedToday], ['Completed', stats.completedToday]].map(([label, value]) => <View key={String(label)} style={{ flex: 1, gap: 5 }}><Text style={{ color: colors.textStrong, fontSize: 25, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{value}</Text><Text style={{ color: colors.textMuted, fontSize: 12 }}>{label}</Text></View>)}</View>
      <MotionButton accessibilityLabel="More statistics" accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 }}><Ionicons name="stats-chart-outline" size={16} color={colors.brandText} /><Text style={{ color: colors.brandText, fontSize: 13, fontWeight: '600' }}>More statistics</Text><Ionicons name={details ? 'chevron-up' : 'chevron-down'} size={14} color={colors.brandText} /></MotionButton>
      <Disclosure open={details} style={{ gap: 9 }}>
        {[['Cancelled', stats.cancelledToday], ['No-show', stats.noShowsToday], ['Active accounts', stats.activeAccounts], ['Active sessions', stats.activeSessions], ['Average wait', stats.averageWaitMinutes === null ? '—' : `${stats.averageWaitMinutes} min`], ['Average service', stats.averageServiceMinutes === null ? '—' : `${stats.averageServiceMinutes} min`]].map(([label, value]) => <View key={String(label)} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text><Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{value}</Text></View>)}
      </Disclosure>
    </AdminPanel>
    </View>
    <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}><AdminPanel title="Window workload">
      {data.windows.map(window => <View key={window.window} style={{ gap: 9, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>{window.window.replace(' - Registrar', '')}</Text><Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: 12, flexShrink: 1 }}>{window.staff?.name ?? 'Unassigned'}</Text></View>
        <View style={{ height: 5, backgroundColor: colors.surfaceMuted, borderRadius: 3, overflow: 'hidden' }}><View style={{ height: 5, width: `${load ? window.waiting / load * 100 : 0}%`, backgroundColor: colors.brandText, borderRadius: 3 }} /></View>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{window.waiting} waiting · {window.serving} serving · {window.held} held</Text>
      </View>)}
    </AdminPanel></View>
  </View>;
}
