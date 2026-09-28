import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useQueue } from '@/contexts/queue';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StaffQueueListScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'priority'>('all');
  const { waiting, assignedWindow } = useQueue();
  const windowWaiting = waiting.filter((ticket) => ticket.window === assignedWindow);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Waiting Queue</Text>
          <Text style={styles.subtitle}>{windowWaiting.length} Customers Waiting · {assignedWindow}</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.activeTabBtn]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              All ({windowWaiting.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'priority' && styles.activeTabBtn]}
            onPress={() => setActiveTab('priority')}
          >
            <Text style={[styles.tabText, activeTab === 'priority' && styles.activeTabText]}>
              Priority (0)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Queue Items List */}
        <FlatList
          data={activeTab === 'all' ? windowWaiting : []}
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
