import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function StaffAnalyticsScreen() {
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
          <Text style={styles.activityTitle}>Today's Hourly Activity</Text>
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
          <Ionicons name="list-outline" size={22} color="#94A3B8" />
          <Text style={styles.navLabel}>Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="bar-chart" size={22} color="#003366" />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/staff/profile')}
        >
          <Ionicons name="person-outline" size={22} color="#94A3B8" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#003366',
    marginBottom: 20,
    textAlign: 'center',
  },
  totalCard: {
    backgroundColor: '#003366',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  totalLabel: {
    color: '#93C5FD',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 20,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#003366',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#64748B',
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
    backgroundColor: '#94A3B8',
    borderRadius: 6,
    marginBottom: 8,
  },
  activeBar: {
    backgroundColor: '#003366',
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  activeBarLabel: {
    color: '#003366',
    fontWeight: '800',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  activeNavLabel: {
    color: '#003366',
    fontWeight: '800',
  },
});