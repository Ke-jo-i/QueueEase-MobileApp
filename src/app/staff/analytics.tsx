import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StaffAnalyticsScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={styles.title}>Daily Performance</Text>

        {/* Total Served Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL SERVED TODAY</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalNumber}>42</Text>
            <Text style={styles.totalSubtext}>Customers completed</Text>
          </View>
        </View>

        {/* Stat Cards Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>AVG. HANDLING TIME</Text>
            <Text style={styles.statValue}>3.5 mins</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Avg. Wait Time</Text>
            <Text style={styles.statValue}>8.2 mins</Text>
          </View>
        </View>

        {/* Hourly Activity Card */}
        <View style={styles.activityCard}>
          <Text style={styles.activityTitle}>Today&apos;s Hourly Activity</Text>
          <Text style={styles.activitySubtitle}>Peak hours: 10:00 AM - 11:00 AM</Text>

          {/* Bar Chart Representation */}
          <View style={styles.chartContainer}>
            <View style={styles.barGroup}>
              <View style={[styles.bar, { height: 60 }]} />
              <Text style={styles.barLabel}>8-10</Text>
            </View>

            <View style={styles.barGroup}>
              <View style={[styles.bar, styles.activeBar, { height: 100 }]} />
              <Text style={[styles.barLabel, styles.activeBarLabel]}>10-12</Text>
            </View>

            <View style={styles.barGroup}>
              <View style={[styles.bar, { height: 80 }]} />
              <Text style={styles.barLabel}>1-3</Text>
            </View>

            <View style={styles.barGroup}>
              <View style={[styles.bar, { height: 50 }]} />
              <Text style={styles.barLabel}>3-5</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Standardized Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/staff/dashboard')}
        >
          <Ionicons name="list-outline" size={22} color={colors.textDisabled} />
          <Text style={styles.navLabel}>Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="bar-chart" size={22} color={colors.brandText} />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/staff/profile')}
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.brandText,
    marginBottom: 20,
    textAlign: 'center',
  },
  totalCard: {
    backgroundColor: colors.brand,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  totalLabel: {
    color: colors.blueLight,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  totalNumber: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '800',
  },
  totalSubtext: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textStrong,
  },
  activityCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brandText,
  },
  activitySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
  },
  barGroup: {
    alignItems: 'center',
  },
  bar: {
    width: 28,
    backgroundColor: colors.textDisabled,
    borderRadius: 6,
    marginBottom: 8,
  },
  activeBar: {
    backgroundColor: colors.brand,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeBarLabel: {
    color: colors.brandText,
    fontWeight: '800',
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