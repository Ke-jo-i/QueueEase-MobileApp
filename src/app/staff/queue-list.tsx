import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useQueue } from '@/contexts/queue';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StaffQueueListScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [serviceFilter, setServiceFilter] = useState('All Services');
  const { waiting, assignedWindow } = useQueue();
  const windowWaiting = waiting.filter((ticket) => ticket.window === assignedWindow);
  const services = ['All Services', ...Array.from(new Set(windowWaiting.map((ticket) => ticket.service)))];
  const filteredTickets = serviceFilter === 'All Services'
    ? windowWaiting
    : windowWaiting.filter((ticket) => ticket.service === serviceFilter);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Waiting Queue</Text>
          <Text style={styles.subtitle}>{windowWaiting.length} Customers Waiting · {assignedWindow}</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
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
                  filteredTickets[0]?.number === item.number ? styles.nextBadge : styles.waitingBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    filteredTickets[0]?.number === item.number ? styles.nextStatusText : styles.waitingStatusText,
                  ]}
                >
                  {filteredTickets[0]?.number === item.number ? 'NEXT' : 'WAITING'}
                </Text>
              </View>
            </View>
          )}
        />
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace('/staff/dashboard')}
        >
          <Ionicons name="list-outline" size={22} color={colors.brandText} />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace('/staff/history')}
        >
          <Ionicons name="time-outline" size={22} color={colors.textDisabled} />
          <Text style={styles.navLabel}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace('/staff/profile')}
        >
          <Ionicons name="person-outline" size={22} color={colors.textDisabled} />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
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
  tabContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
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
