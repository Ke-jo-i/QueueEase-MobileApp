import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueue } from '@/contexts/queue';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') globalThis.alert(`${title}\n${message}`);
  else Alert.alert(title, message);
}

export default function StaffDashboardScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const { assignedWindow, waiting, currentServing, callNext, completeCurrent } = useQueue();
  const windowWaiting = waiting.filter((ticket) => ticket.window === assignedWindow);

  // Handler para sa Call Next
  const handleCallNext = () => {
    if (currentServing) {
      showMessage('Finish Current Ticket', 'Mark the current ticket as done before calling the next one.');
      return;
    }
    if (windowWaiting.length === 0) {
      showMessage(
        'No Pending Queue',
        `There are currently no waiting tickets for ${assignedWindow}.`
      );
      return;
    }

    const nextTicket = callNext();
    if (!nextTicket) return;

    showMessage(
      'Calling Next Ticket',
      `Now serving Ticket ${nextTicket.number} for ${nextTicket.service}.`
    );
  };

  // Handler para sa Recall
  const handleRecall = () => {
    if (!currentServing) {
      showMessage(
        'No Active Ticket',
        'There is currently no active ticket to recall.'
      );
      return;
    }

    showMessage(
      'Ticket Recalled',
      `Re-calling Ticket ${currentServing.number} for ${currentServing.service}.`
    );
  };

  // Handler para sa Mark as Done
  const handleMarkAsDone = () => {
    if (!currentServing) {
      showMessage(
        'No Active Ticket',
        'There is currently no active ticket to complete.'
      );
      return;
    }

    if (Platform.OS === 'web') {
      if (globalThis.confirm(`Mark Ticket ${currentServing.number} as completed?`)) completeCurrent();
      return;
    }

    Alert.alert(
      'Complete Transaction',
      `Are you sure you want to mark Ticket ${currentServing.number} as completed?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Complete',
          onPress: completeCurrent,
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} testID="staff-dashboard">
      <View style={styles.content}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>{assignedWindow}</Text>
        </View>

        {/* Currently Serving Display Box */}
        <View style={styles.servingCard}>
          <Text style={styles.servingLabel}>CURRENTLY SERVING</Text>
          <Text style={styles.ticketNumber}>
            {currentServing ? currentServing.number : 'NO QUEUE'}
          </Text>
          <Text style={styles.serviceText}>
            {currentServing ? currentServing.service : 'Tap Call Next when ready'}
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
            View Waiting Queue List ({windowWaiting.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Standardized Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
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
    alignItems: 'center',
    marginBottom: 24,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  servingCard: {
    backgroundColor: colors.neutralMuted,
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 24,
  },
  servingLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.successStrong,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  ticketNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.brandText,
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  actionContainer: {
    gap: 12,
    marginBottom: 28,
  },
  callNextBtn: {
    backgroundColor: colors.brand,
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
    backgroundColor: colors.warningSoft,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  recallBtnText: {
    color: colors.warningStrong,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  doneBtn: {
    backgroundColor: colors.successSurface,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: colors.successText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  queueListBtn: {
    borderWidth: 1.5,
    borderColor: colors.brandText,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  queueListBtnText: {
    color: colors.brandText,
    fontSize: 13,
    fontWeight: '700',
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
