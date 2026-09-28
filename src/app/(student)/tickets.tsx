import { AppPalette } from '@/constants/app-colors';
import { useThemedStyles } from '@/hooks/use-app-theme';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SERVICE_REMINDERS: Record<string, {
  window: string;
  reminders: string[];
  processingTime: string;
}> = {
  'Certificate of Enrollment': {
    window: 'Window 3 - Registrar',
    reminders: [
      'Show valid Student ID at Window 3',
      'Bring printed Assessment Form',
      'Strictly no proxy allowed',
    ],
    processingTime: 'Est. Processing: 1-2 Working Days',
  },
  'Certificate of Grades': {
    window: 'Window 2 - Registrar',
    reminders: [
      'Ensure all grades are submitted',
      'Present clearance from previous semester',
      'Pay fee at Cashier if requesting official copy',
    ],
    processingTime: 'Est. Processing: Same Day',
  },
  'Academic Records Request': {
    window: 'Window 1 - Registrar',
    reminders: [
      'Submit 2x2 ID photos with white background',
      'Clearance from Library and Accounting required',
      'Bring valid Student ID',
    ],
    processingTime: 'Est. Processing: 3-5 Working Days',
  },
  'Enrollment Concern': {
    window: 'Window 3 - Registrar',
    reminders: [
      'Prepare list of affected subject codes',
      'Bring signed endorsement from Department Head',
      'Show valid Student ID',
    ],
    processingTime: 'Est. Processing: Immediate upon review',
  },
  'Student Record Update': {
    window: 'Window 4 - Registrar',
    reminders: [
      'Bring original and photocopy of PSA Birth Certificate',
      'Submit formal letter request addressed to Registrar',
      'Affidavit of Discrepancy required for major changes',
    ],
    processingTime: 'Est. Processing: 2-3 Working Days',
  },
  'Other Registrar Concern': {
    window: 'Window 3 - Registrar',
    reminders: [
      'Prepare a clear explanation of your concern',
      'Bring any relevant documents',
      'Proceed to Information Window',
    ],
    processingTime: 'Est. Processing: Varies per request',
  },
};

export default function MyTicketsScreen() {
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams();
  const [showQrModal, setShowQrModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Active Queue State
  const [hasActiveTicket, setHasActiveTicket] = useState(true);
  const [historyTickets, setHistoryTickets] = useState([
    { id: '1', ticketNumber: 'B - 045', service: 'Certificate of Grades', status: 'COMPLETED', date: 'Oct 12, 2026' },
    { id: '2', ticketNumber: 'A - 088', service: 'Academic Records Request', status: 'CANCELLED', date: 'Sep 28, 2026' },
  ]);

  const activeService = (params.serviceName as string) || 'Certificate of Enrollment';
  const details = SERVICE_REMINDERS[activeService] || SERVICE_REMINDERS['Certificate of Enrollment'];

  // Handle Ticket Cancellation Logic
  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    setShowQrModal(false);

    // Ilipat ang Active Ticket papuntang History bilang CANCELLED
    setHasActiveTicket(false);
    setHistoryTickets((prev) => [
      {
        id: Date.now().toString(),
        ticketNumber: 'R - 102',
        service: activeService,
        status: 'CANCELLED',
        date: 'Today',
      },
      ...prev,
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Queue Tickets</Text>
          <Text style={styles.subtitle}>Manage active and past tickets</Text>
        </View>

        {/* NOW IN QUEUE Section (Ise-show lamang kapag may active ticket) */}
        {hasActiveTicket && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NOW IN QUEUE</Text>

            {/* Active Ticket Card */}
            <View style={styles.activeCard}>
              <View style={styles.activeHeader}>
                <Text style={styles.activeTicketNumber}>R - 102</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>

              <Text style={styles.activeServiceName}>{activeService}</Text>
              <Text style={styles.activeWindowText}>{details.window}</Text>

              {/* View QR Ticket Action */}
              <Pressable
                style={({ pressed }) => [
                  styles.viewQrContainer,
                  pressed && styles.pressedEffect,
                ]}
                onPress={() => setShowQrModal(true)}
              >
                {({ pressed }) => (
                  <Text style={[styles.viewQrText, pressed && styles.viewQrTextPressed]}>
                    View QR Ticket
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Ticket History Section */}
        <View style={styles.section}>
          <Text style={styles.historySectionTitle}>Ticket History</Text>

          {historyTickets.map((ticket) => (
            <View key={ticket.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTicketNumber}>{ticket.ticketNumber}</Text>
                <View style={ticket.status === 'COMPLETED' ? styles.completedBadge : styles.cancelledBadge}>
                  <Text style={ticket.status === 'COMPLETED' ? styles.completedBadgeText : styles.cancelledBadgeText}>
                    {ticket.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyServiceName}>{ticket.service}</Text>
              <Text style={styles.historyDate}>{ticket.date}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* QUEUE TICKET MODAL */}
      <Modal
        visible={showQrModal}
        animationType="slide"
        onRequestClose={() => setShowQrModal(false)}
      >
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header with Close */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.title}>Queue Ticket</Text>
                <Text style={styles.studentInfo}>Student: 2021-00123 (Tagum Campus)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQrModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Ticket Status Card */}
            <View style={styles.card}>
              <Text style={styles.ticketNumber}>R - 102</Text>
              <Text style={styles.statusLabel}>
                Status: <Text style={styles.statusValue}>Waiting in Line</Text>
              </Text>
              <Text style={styles.windowText}>{details.window}</Text>
            </View>

            {/* QR Code Card */}
            <View style={styles.cardCenter}>
              <Image
                source={{
                  uri: 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=R-102-REGISTRAR',
                }}
                style={styles.qrCodeImage}
              />
              <Text style={styles.qrSubtext}>
                Present this QR code when called at {details.window.split(' - ')[0]}
              </Text>
            </View>

            {/* Dynamic Important Reminders Card */}
            <View style={styles.card}>
              <Text style={styles.remindersTitle}>Important Reminders</Text>

              {details.reminders.map((reminder, idx) => (
                <Text key={idx} style={styles.reminderItem}>
                  • {reminder}
                </Text>
              ))}

              <Text style={styles.processingTime}>{details.processingTime}</Text>
            </View>

            {/* Cancel Queue Ticket Button */}
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={() => setShowCancelModal(true)}
            >
              <Text style={styles.cancelButtonText}>Cancel Queue Ticket</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Cancel Confirmation Alert Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Queue Ticket?</Text>
            <Text style={styles.modalSubtext}>
              Are you sure you want to cancel your ticket (R-102)? This action cannot be undone.
            </Text>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              activeOpacity={0.8}
              onPress={handleConfirmCancel}
            >
              <Text style={styles.modalCancelBtnText}>Yes, Cancel Ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalKeepBtn}
              activeOpacity={0.8}
              onPress={() => setShowCancelModal(false)}
            >
              <Text style={styles.modalKeepBtnText}>No, Keep my ticket</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.brandText,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  studentInfo: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.success,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  activeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: 16,
    padding: 18,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeTicketNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.brandText,
  },
  activeBadge: {
    backgroundColor: colors.successSurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.success,
  },
  activeServiceName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  activeWindowText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 12,
  },
  viewQrContainer: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  viewQrText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.brandText,
    textDecorationLine: 'underline',
  },
  pressedEffect: {
    opacity: 0.6,
    backgroundColor: colors.surfaceMuted,
  },
  viewQrTextPressed: {
    color: colors.info,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: colors.surfaceNeutral,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyTicketNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textBody,
  },
  completedBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  cancelledBadge: {
    backgroundColor: colors.dangerSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cancelledBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.dangerStrong,
  },
  historyServiceName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textDisabled,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardCenter: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  ticketNumber: {
    fontSize: 38,
    fontWeight: 'bold',
    color: colors.brandText,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textBody,
    marginBottom: 2,
  },
  statusValue: {
    fontWeight: 'bold',
    color: colors.brandText,
  },
  windowText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  qrCodeImage: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  qrSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  remindersTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  reminderItem: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textBody,
    marginBottom: 4,
  },
  processingTime: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.info,
    marginTop: 14,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginTop: 8,
  },
  cancelButtonPressed: {
    backgroundColor: colors.dangerSubtle,
    borderColor: colors.dangerBorder,
  },
  cancelButtonText: {
    color: colors.dangerStrong,
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.brandText,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtext: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  modalCancelBtn: {
    width: '100%',
    backgroundColor: colors.dangerFill,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalCancelBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalKeepBtn: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalKeepBtnText: {
    color: colors.textBody,
    fontSize: 15,
    fontWeight: '600',
  },
});