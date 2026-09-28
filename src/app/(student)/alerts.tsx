import { AppPalette } from '@/constants/app-colors';
import { useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AlertsScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  // Active View State: 'list' | 'your-turn' | 'completed'
  const [currentView, setCurrentView] = useState<'list' | 'your-turn' | 'completed'>('list');

  const notifications = [
    {
      id: '1',
      title: 'Your Turn is Next!',
      message: 'Please proceed to Window 3 - Registrar immediately',
      time: '2 mins ago',
      unread: true,
      clickable: true, 
    },
    {
      id: '2',
      title: 'Ticket Served',
      message: 'Transaction for Certificate of Grades (B-045) is complete',
      time: 'Oct 12, 2026 • 2:30 PM',
      unread: false,
      clickable: false,
    },
    {
      id: '3',
      title: 'Queue Cancelled',
      message: 'Academic Records Request (A-088) was cancelled',
      time: 'Sep 28, 2026 • 9:15 AM',
      unread: false,
      clickable: false,
    },
  ];

  // -------------------------------------------------------------
  // SCREEN 1: YOUR TURN VIEW
  // -------------------------------------------------------------
  if (currentView === 'your-turn') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.pageTitle}>Your Turn</Text>
          <Text style={styles.subtitle}>Proceed to Window 3 - Registrar immediately</Text>

          {/* Ticket Card */}
          <View style={styles.ticketCard}>
            <Text style={styles.ticketLabel}>TICKET NUMBER</Text>
            <Text style={styles.ticketNumber}>R - 102</Text>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>PROCEED NOW</Text>
            </View>

            <View style={styles.divider} />

            <Text style={styles.serviceTitle}>Certificate of Enrollment</Text>
            <Text style={styles.serviceSub}>Tagum Campus • Window 3</Text>
          </View>

          {/* Reminder Card */}
          <View style={styles.reminderCard}>
            <Text style={styles.reminderTitle}>Important Reminder</Text>
            <Text style={styles.reminderText}>
              Please present your valid Student ID and printed Assessment Form to the Registrar Staff
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setCurrentView('completed')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>I&apos;M AT THE WINDOW</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 2: TRANSACTION COMPLETED VIEW
  // -------------------------------------------------------------
  if (currentView === 'completed') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { alignItems: 'center' }]}>
          {/* Green Check Icon */}
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark" size={44} color={'#FFFFFF'} />
          </View>

          <Text style={styles.completedTitle}>Transaction Completed!</Text>
          <Text style={styles.completedSubtitle}>
            Thank you for using QueueEase. Your request has been processed successfully.
          </Text>

          {/* Completed Ticket Details */}
          <View style={styles.ticketCard}>
            <Text style={styles.ticketLabel}>TICKET NUMBER</Text>
            <Text style={styles.ticketNumber}>R - 102</Text>

            <View style={styles.divider} />

            <Text style={styles.serviceTitle}>Certificate of Enrollment</Text>
            <Text style={styles.serviceSub}>Window 3 - Registrar</Text>
            <Text style={styles.dateSub}>Sept 26, 2026 • 10:30 AM</Text>
          </View>

          {/* Back to Home Button */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setCurrentView('list');
              router.replace('/(student)/home' as any);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryBtnText}>BACK TO HOME</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------
  // SCREEN 3: NOTIFICATIONS LIST VIEW (DEFAULT)
  // -------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {notifications.map((item) => {
          const CardComponent = item.clickable ? TouchableOpacity : View;

          return (
            <CardComponent
              key={item.id}
              style={[styles.card, item.unread && styles.unreadCard]}
              onPress={item.clickable ? () => setCurrentView('your-turn') : undefined}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeaderRow}>
                {item.unread && <View style={styles.redDot} />}
                <Text style={[styles.cardTitle, item.unread && styles.unreadTitle]}>
                  {item.title}
                </Text>
              </View>

              <Text style={styles.cardMessage}>{item.message}</Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </CardComponent>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
  },
  // Notifications List Styles
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brandText,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unreadCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textBody,
  },
  unreadTitle: {
    color: colors.brandText,
  },
  cardMessage: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 11,
    color: colors.textDisabled,
  },

  // Full Views Content Box (Your Turn & Completed)
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brandText,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
  },
  ticketCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  ticketLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  ticketNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.brandText,
    marginVertical: 8,
  },
  badge: {
    backgroundColor: colors.infoSurface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    color: colors.info,
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceMuted,
    marginVertical: 12,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textStrong,
  },
  serviceSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  dateSub: {
    fontSize: 11,
    color: colors.textDisabled,
    marginTop: 4,
  },
  reminderCard: {
    backgroundColor: colors.warningSurface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    marginBottom: 24,
  },
  reminderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.warningText,
    marginBottom: 4,
  },
  reminderText: {
    fontSize: 12,
    color: colors.warning,
    lineHeight: 16,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: colors.brandPressed,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.successFill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brandText,
    textAlign: 'center',
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
});