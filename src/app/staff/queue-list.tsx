import { StaffNav } from '@/components/staff-nav';
import { MotionButton as TouchableOpacity } from '@/components/motion';
import { AppPalette } from '@/constants/app-colors';
import { useThemedStyles } from '@/hooks/use-app-theme';
import { useState } from 'react';
import { useQueue } from '@/contexts/queue';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function StaffQueueListScreen() {
  const styles = useThemedStyles(createStyles);
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
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Waiting Queue</Text>
          <Text style={styles.subtitle}>{windowWaiting.length} Customers Waiting · {assignedWindow}</Text>
        </View>

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

        {/* Queue Items List */}
        <FlatList
          ListEmptyComponent={<Text style={{ color: styles.subtitle.color, textAlign: 'center', padding: 24 }}>No students waiting at this window.</Text>}
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

      {/* Bottom Navigation */}
      <StaffNav active="Queue" />
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brandText,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  filterScroll: {
    flexGrow: 0,
    maxHeight: 44,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  activeTabBtn: {
    backgroundColor: colors.brand,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  ticketNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brandText,
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
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
