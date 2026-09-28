import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const queueData = [
  { id: '1', number: 'R - 103', service: 'Certificate of Grades', status: 'NEXT' },
  { id: '2', number: 'R - 104', service: 'Academic Records Request', status: 'WAITING' },
  { id: '3', number: 'R - 105', service: 'Enrollment Concern', status: 'WAITING' },
];

export default function StaffQueueListScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'priority'>('all');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Waiting Queue</Text>
          <Text style={styles.subtitle}>3 Customers Waiting</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'all' && styles.activeTabBtn]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              All (3)
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
          data={queueData}
          keyExtractor={(item) => item.id}
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
                  item.status === 'NEXT' ? styles.nextBadge : styles.waitingBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    item.status === 'NEXT' ? styles.nextStatusText : styles.waitingStatusText,
                  ]}
                >
                  {item.status}
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
          <Ionicons name="list-outline" size={22} color="#003366" />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push('/staff/analytics')}
        >
          <Ionicons name="bar-chart-outline" size={22} color="#94A3B8" />
          <Text style={styles.navLabel}>Analytics</Text>
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
    color: '#003366',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
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
    backgroundColor: '#F1F5F9',
  },
  activeTabBtn: {
    backgroundColor: '#003366',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  queueCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#003366',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  nextBadge: {
    backgroundColor: '#DCFCE7',
  },
  waitingBadge: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  nextStatusText: {
    color: '#166534',
  },
  waitingStatusText: {
    color: '#64748B',
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