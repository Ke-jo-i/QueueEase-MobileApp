import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface QueueItem {
  ticketNumber: string;
  serviceName: string;
}

export default function StaffDashboardScreen() {
  const router = useRouter();

  // Initial queue state
  const [queue, setQueue] = useState<QueueItem[]>([
    { ticketNumber: 'R - 103', serviceName: 'Certificate of Grades' },
    { ticketNumber: 'R - 104', serviceName: 'Transcript of Records' },
    { ticketNumber: 'R - 105', serviceName: 'Diploma Request' },
  ]);

  // Current active ticket state
  const [currentServing, setCurrentServing] = useState<QueueItem | null>({
    ticketNumber: 'R - 102',
    serviceName: 'Certificate of Enrollment',
  });

  // Handler para sa Call Next
  const handleCallNext = () => {
    if (queue.length === 0) {
      Alert.alert(
        'No Pending Queue',
        'There are currently no waiting tickets in the queue.'
      );
      return;
    }

    const nextTicket = queue[0];
    const remainingQueue = queue.slice(1);

    setCurrentServing(nextTicket);
    setQueue(remainingQueue);

    Alert.alert(
      'Calling Next Ticket',
      `Now serving Ticket ${nextTicket.ticketNumber} for ${nextTicket.serviceName}.`
    );
  };

  // Handler para sa Recall
  const handleRecall = () => {
    if (!currentServing) {
      Alert.alert(
        'No Active Ticket',
        'There is currently no active ticket to recall.'
      );
      return;
    }

    Alert.alert(
      'Ticket Recalled',
      `Re-calling Ticket ${currentServing.ticketNumber} for ${currentServing.serviceName}.`
    );
  };

  // Handler para sa Mark as Done
  const handleMarkAsDone = () => {
    if (!currentServing) {
      Alert.alert(
        'No Active Ticket',
        'There is currently no active ticket to complete.'
      );
      return;
    }

    Alert.alert(
      'Complete Transaction',
      `Are you sure you want to mark Ticket ${currentServing.ticketNumber} as completed?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Complete',
          onPress: () => {
            if (queue.length > 0) {
              const nextTicket = queue[0];
              setCurrentServing(nextTicket);
              setQueue(queue.slice(1));
            } else {
              setCurrentServing(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Staff Portal</Text>
          <Text style={styles.headerSubtitle}>Window 3 - Registrar</Text>
        </View>

        {/* Currently Serving Display Box */}
        <View style={styles.servingCard}>
          <Text style={styles.servingLabel}>CURRENTLY SERVING</Text>
          <Text style={styles.ticketNumber}>
            {currentServing ? currentServing.ticketNumber : 'NO QUEUE'}
          </Text>
          <Text style={styles.serviceText}>
            {currentServing ? currentServing.serviceName : 'Waiting for next tickets...'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.callNextBtn}
            activeOpacity={0.8}
            onPress={handleCallNext}
          >
            <Text style={styles.callNextBtnText}>CALL NEXT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recallBtn}
            activeOpacity={0.8}
            onPress={handleRecall}
          >
            <Text style={styles.recallBtnText}>RECALL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneBtn}
            activeOpacity={0.8}
            onPress={handleMarkAsDone}
          >
            <Text style={styles.doneBtnText}>MARK AS DONE</Text>
          </TouchableOpacity>
        </View>

        {/* View Waiting Queue List Link */}
        <TouchableOpacity
          style={styles.queueListBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/staff/queue-list')}
        >
          <Text style={styles.queueListBtnText}>
            View Waiting Queue List ({queue.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Standardized Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
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
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#003366',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  servingCard: {
    backgroundColor: '#D9D9D9',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  servingLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: '#003366',
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  actionContainer: {
    gap: 12,
    marginBottom: 28,
  },
  callNextBtn: {
    backgroundColor: '#003366',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  callNextBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  recallBtn: {
    backgroundColor: '#FEF9C3',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  recallBtnText: {
    color: '#854D0E',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  doneBtn: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  queueListBtn: {
    borderWidth: 1.5,
    borderColor: '#003366',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  queueListBtnText: {
    color: '#003366',
    fontSize: 13,
    fontWeight: '700',
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