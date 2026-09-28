import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LiveQueueScreen() {
  const router = useRouter();

  const queueList = [
    { number: 'R-102', status: 'Serving at Window 3', isServing: true },
    { number: 'R-103', status: 'Waiting in Line', isServing: false },
    { number: 'R-104', status: 'Waiting in Line', isServing: false },
    { number: 'R-105', status: 'Waiting in Line', isServing: false },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back Header */}
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#003366" />
          <Text style={styles.headerTitle}>Live Queue</Text>
        </TouchableOpacity>

        {/* Your Ticket Number Box */}
        <View style={styles.yourTicketCard}>
          <Text style={styles.yourTicketLabel}>YOUR TICKET NUMBER</Text>
          <Text style={styles.yourTicketNumber}>R-102</Text>
        </View>

        {/* Now Serving Box */}
        <View style={styles.nowServingCard}>
          <Text style={styles.nowServingLabel}>NOW SERVING (Window 3)</Text>
          <Text style={styles.nowServingNumber}>R-102</Text>
        </View>

        {/* Queue Progress List Card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Queue Progress</Text>

          <View style={styles.queueListContainer}>
            {queueList.map((item, index) => (
              <Text
                key={index}
                style={[
                  styles.queueItemText,
                  item.isServing && styles.servingText,
                ]}
              >
                {item.number} • {item.status}
              </Text>
            ))}
          </View>
        </View>

        {/* Estimated Waiting Time Footer Box */}
        <View style={styles.estTimeCard}>
          <Text style={styles.estTimeText}>Estimated Waiting Time: 10 - 15 mins</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#003366',
    marginLeft: 8,
  },

  // Your Ticket Card
  yourTicketCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  yourTicketLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  yourTicketNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#003366',
  },

  // Now Serving Card
  nowServingCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  nowServingLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#16A34A',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  nowServingNumber: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#003366',
  },

  // Queue Progress Card
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    minHeight: 220,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  queueListContainer: {
    gap: 14,
  },
  queueItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  servingText: {
    color: '#16A34A',
    fontWeight: 'bold',
  },

  // Est Time Card
  estTimeCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
});