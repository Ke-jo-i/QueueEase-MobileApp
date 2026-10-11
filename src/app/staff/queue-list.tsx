import { StaffNav } from '@/components/staff-nav';
import { MotionButton as TouchableOpacity, Reveal } from '@/components/motion';
import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { useState } from 'react';
import { useQueue } from '@/contexts/queue';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GlassSurface } from '@/components/glass-surface';

export default function StaffQueueListScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useAppTheme();
  const router = useRouter();
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const { waiting, assignedWindow } = useQueue();
  const windowWaiting = waiting.filter((ticket) => ticket.window === assignedWindow);
  const services = ['All Services', ...Array.from(new Set(windowWaiting.map((ticket) => ticket.service)))];
  const filteredTickets = serviceFilter === 'All Services'
    ? windowWaiting
    : windowWaiting.filter((ticket) => ticket.service === serviceFilter);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <Reveal style={styles.header}>
          <TouchableOpacity accessibilityLabel="Back to queue" style={styles.backButton} onPress={() => router.dismissTo('/staff/dashboard')}>
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </TouchableOpacity>
          <Text accessibilityRole="header" style={styles.title}>Waiting Queue</Text>
          <Text style={styles.subtitle}>{windowWaiting.length} {windowWaiting.length === 1 ? 'student' : 'students'} waiting · {assignedWindow.replace(' - Registrar', '') || 'No window assigned'}</Text>
        </Reveal>

        <ScrollView horizontal style={styles.filterScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
          {services.map((service) => (
            <TouchableOpacity
              key={service}
              style={[styles.tabBtn, serviceFilter === service && styles.activeTabBtn]}
              onPress={() => setServiceFilter(service)}
            >
              <Text style={[styles.tabText, serviceFilter === service && styles.activeTabText]}>
                {service === 'All Services' ? `All (${windowWaiting.length})` : service}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<GlassSurface style={{ padding: 32, borderRadius: 28, alignItems: 'center', gap: 14 }}>
            <View style={styles.emptyIcon}><Ionicons name="people-outline" size={30} color={colors.brandText} /></View>
            <Text style={{ color: colors.text, textAlign: 'center', fontSize: 18, fontWeight: '600' }}>No students waiting at this window.</Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 20 }}>New tickets will appear here automatically.</Text>
          </GlassSurface>}
          data={filteredTickets}
          keyExtractor={(item) => item.number}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.queueCard}>
              <View style={styles.cardInfo}>
                <Text style={styles.ticketNumber}>{item.number}</Text>
                <Text style={styles.serviceName}>{item.service}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  windowWaiting[0]?.number === item.number ? styles.nextBadge : styles.waitingBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    windowWaiting[0]?.number === item.number ? styles.nextStatusText : styles.waitingStatusText,
                  ]}
                >
                  {windowWaiting[0]?.number === item.number ? 'NEXT' : 'WAITING'}
                </Text>
              </View>
            </View>
          )}
        />
      </View>

      <StaffNav active="Queue" />
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 22,
  },
  header: {
    marginBottom: 20,
  },
  backButton: { width: 44, height: 44, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginBottom: 18 },
  emptyIcon: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.infoSurface },
  title: {
    fontSize: 34,
    letterSpacing: -1,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    lineHeight: 20,
  },
  filterScroll: {
    flexGrow: 0,
    maxHeight: 48,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tabBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTabBtn: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  queueCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${colors.surface}E8`,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    gap: 12,
  },
  cardInfo: {
    flex: 1,
  },
  ticketNumber: {
    fontSize: 25,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.7,
    color: colors.text,
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400',
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  nextBadge: {
    backgroundColor: colors.successSurface,
  },
  waitingBadge: {
    backgroundColor: colors.surfaceMuted,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  nextStatusText: {
    color: colors.successText,
  },
  waitingStatusText: {
    color: colors.textMuted,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDisabled,
    marginTop: 2,
  },
  activeNavLabel: {
    color: colors.brandText,
    fontWeight: '800',
  },
});
