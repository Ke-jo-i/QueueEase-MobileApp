import { GlassSurface, translucent } from '@/components/glass-surface';
import { MotionButton, Reveal } from '@/components/motion';
import { Notice } from '@/components/form';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueue } from '@/contexts/queue';
import { useSession } from '@/contexts/session';
import { ticketStatusLabels } from '@/constants/queue-labels';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, View } from 'react-native';

const serviceIcons = ['document-text-outline', 'school-outline', 'ribbon-outline', 'folder-open-outline', 'documents-outline', 'reader-outline'] as const;

export default function HomeScreen() {
  const colors = useAppTheme();
  const router = useRouter();
  const { studentTicket, studentProgress, services, acceptingTickets, ready, connected } = useQueue();
  const { user } = useSession();
  return <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top', 'left', 'right']} testID="student-home">
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 22, paddingBottom: 32, width: '100%', maxWidth: 720, alignSelf: 'center', gap: 26 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}><Text style={{ fontSize: 13, fontWeight: '600', color: colors.brandText }}>Queue Ease</Text>
          <Text accessibilityRole="header" style={{ fontSize: 30, letterSpacing: -0.8, fontWeight: '700', color: colors.textStrong }}>Hello, {user?.name.split(' ')[0]}.</Text>
        </View>
        <MotionButton accessibilityLabel="Open profile" onPress={() => router.push('/profile')}>
          <GlassSurface interactive style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="person-outline" size={22} color={colors.brandText} /></GlassSurface>
        </MotionButton>
      </View>
      <Reveal><GlassSurface variant="tinted" style={{ padding: 24, gap: 14, borderRadius: 30 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: connected ? colors.success : colors.textMuted }} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textSecondary }}>{!ready ? 'Connecting' : studentTicket ? ticketStatusLabels[studentTicket.status] : 'QUEUE STATUS'}</Text>
          </View>
          <Ionicons name={studentTicket ? 'ticket-outline' : 'time-outline'} size={23} color={colors.brandText} />
        </View>
        <Text style={{ fontSize: studentTicket ? 48 : 30, fontWeight: '700', letterSpacing: -1.2, color: colors.brandText }}>{!ready ? 'Loading your queue…' : studentTicket ? studentTicket.number : 'No active ticket'}</Text>
        {studentTicket && <Text style={{ fontSize: 14, lineHeight: 22, color: colors.textSecondary }}>{studentTicket.service}</Text>}
        {studentTicket && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brandText, backgroundColor: translucent(colors.surface, 0.65), paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 }}>{studentTicket.window.replace(' - Registrar', '')}</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.brandText, paddingVertical: 7 }}>{studentProgress?.peopleAhead !== null && studentProgress?.peopleAhead !== undefined
            ? `${studentProgress.peopleAhead} ${studentProgress.peopleAhead === 1 ? 'person' : 'people'} ahead`
            : studentTicket.status === 'HELD' ? 'Check staff instructions' : 'Please proceed to the window'}</Text>
        </View>}
        <MotionButton accessibilityLabel={studentTicket ? 'View queue progress' : 'View all window queues'} onPress={() => router.push('/live-status')}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: translucent(colors.brandText, 0.1), paddingTop: 16, marginTop: 2, minHeight: 46 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.brandText }}>{studentTicket ? 'View queue progress' : 'View all window queues'}</Text><Ionicons name="arrow-up-outline" size={18} color={colors.brandText} />
        </MotionButton>
      </GlassSurface></Reveal>
      <View style={{ gap: 14 }}>
        <Text accessibilityRole="header" style={{ fontSize: 22, letterSpacing: -0.4, fontWeight: '700', color: colors.textStrong }}>Registrar Services</Text>
        {ready && !acceptingTickets && <Notice text="New tickets are paused. Existing tickets remain in the queue. Please check again later." />}
        <GlassSurface style={{ borderRadius: 26 }}>
          {services.map(({ name, available, window, unavailableReason }, index) => <Reveal key={name} delay={Math.min(index * 25, 100)}>
            <MotionButton accessibilityLabel={name} accessibilityState={{ disabled: !connected || !available || !acceptingTickets }} disabled={!connected || !available || !acceptingTickets}
              onPress={() => router.push({ pathname: '/confirm-service', params: { serviceName: name } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, minHeight: 76, opacity: !available || !acceptingTickets ? 0.45 : 1 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: translucent(colors.infoSurface, 0.85), alignItems: 'center', justifyContent: 'center' }}><Ionicons name={serviceIcons[index % serviceIcons.length]} size={21} color={colors.brandText} /></View>
              <View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>{name}</Text>
                {!available && <Text style={{ fontSize: 12, lineHeight: 18, color: colors.textMuted }}>{window.replace(' - Registrar', '')} · {unavailableReason || 'Temporarily unavailable'}</Text>}
              </View><Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </MotionButton>
            {index < services.length - 1 && <View style={{ height: 1, backgroundColor: translucent(colors.borderStrong, 0.35), marginLeft: 74, marginRight: 18 }} />}
          </Reveal>)}
        </GlassSurface>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
