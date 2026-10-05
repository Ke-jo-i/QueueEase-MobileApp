import { MotionButton as TouchableOpacity } from '@/components/motion';
import { AppPalette } from '@/constants/app-colors';
import { useThemedStyles } from '@/hooks/use-app-theme';
import { useQueue } from '@/contexts/queue';
import { useSession } from '@/contexts/session';
import { registrarReminders } from '@/constants/registrar-services';
import { ticketStatusLabels } from '@/constants/queue-labels';
import { TicketActivity } from '@/components/ticket-activity';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

function formatTicketDate(value: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function MyTicketsScreen() {
  const styles = useThemedStyles(createStyles);
  const { studentTicket, studentHistory, cancelTicket } = useQueue();
  const { studentId } = useSession();
  const [showQrModal, setShowQrModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const activeService = studentTicket?.service ?? 'Certificate of Enrollment';

  // Handle Ticket Cancellation Logic
  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) return;
    if (!await cancelTicket(cancelReason)) return;
    setShowCancelModal(false);
    setShowQrModal(false);
    setCancelReason('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="student-tickets">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Queue Tickets</Text>
          <Text style={styles.subtitle}>Manage active and past tickets</Text>
        </View>

        {/* NOW IN QUEUE Section (Ise-show lamang kapag may active ticket) */}
        {studentTicket && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{studentTicket.status === 'HELD' ? 'ON HOLD' : 'NOW IN QUEUE'}</Text>

            {/* Active Ticket Card */}
            <View style={styles.activeCard}>
              <View style={styles.activeHeader}>
                <Text style={styles.activeTicketNumber}>{studentTicket.number}</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{studentTicket.status === 'HELD' ? 'HELD' : studentTicket.status === 'SERVING' ? 'SERVING' : 'ACTIVE'}</Text>
                </View>
              </View>

              <Text style={styles.activeServiceName}>{activeService}</Text>
              <Text style={styles.activeWindowText}>{studentTicket.window}</Text>
              {studentTicket.status === 'HELD' && <Text style={styles.activeWindowText}>{studentTicket.reason} · Speak with staff when ready.</Text>}

              {/* View QR Ticket Action */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="View QR Ticket"
                style={({ pressed }) => [
                  styles.viewQrContainer,
                  pressed && styles.pressedEffect,
                ]}
                onPress={() => setShowQrModal(true)}
              >
                <Text style={styles.viewQrText}>View QR Ticket</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Ticket History Section */}
        <View style={styles.section}>
          <Text style={styles.historySectionTitle}>Ticket History</Text>

          {studentHistory.length === 0 && <Text style={styles.historyDate}>No past tickets yet.</Text>}
          {studentHistory.map((ticket) => (
            <View key={ticket.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTicketNumber}>{ticket.number}</Text>
                <View style={ticket.status === 'COMPLETED' ? styles.completedBadge : styles.cancelledBadge}>
                  <Text style={ticket.status === 'COMPLETED' ? styles.completedBadgeText : styles.cancelledBadgeText}>
                    {ticket.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.historyServiceName}>{ticket.service}</Text>
              <Text style={styles.historyDate}>{formatTicketDate(ticket.date)}</Text>
              <TouchableOpacity style={styles.activityButton} accessibilityRole="button" accessibilityLabel={`Activity for ${ticket.number}`} accessibilityState={{ expanded: expandedHistory === ticket.id }} onPress={() => setExpandedHistory(expandedHistory === ticket.id ? null : ticket.id)}>
                <Text style={styles.activityButtonText}>{expandedHistory === ticket.id ? 'Hide activity' : 'View activity'}</Text>
              </TouchableOpacity>
              {expandedHistory === ticket.id && <TicketActivity ticket={ticket} />}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* QUEUE TICKET MODAL */}
      <Modal
        visible={showQrModal && !!studentTicket}
        animationType="slide"
        onRequestClose={() => setShowQrModal(false)}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header with Close */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.title}>Queue Ticket</Text>
                <Text style={styles.studentInfo}>Student: {studentId} (Tagum Campus)</Text>
              </View>
              <TouchableOpacity accessibilityLabel="Close ticket" onPress={() => setShowQrModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Ticket Status Card */}
            <View style={styles.card}>
              <Text style={styles.ticketNumber}>{studentTicket?.number}</Text>
              <Text style={styles.statusLabel}>
                Status: <Text style={styles.statusValue}>{studentTicket ? ticketStatusLabels[studentTicket.status] : ''}</Text>
              </Text>
              <Text style={styles.windowText}>{studentTicket?.window}</Text>
            </View>

            {/* QR Code Card */}
            <View style={styles.cardCenter}>
              {studentTicket && <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 12 }}><QRCode value={`queueease:v1:${studentTicket.id}`} size={160} /></View>}
              <Text style={styles.qrSubtext}>
                Show this ticket when called at {studentTicket?.window.split(' - ')[0]}. Staff can scan it to confirm your arrival. Scanning does not skip the line.
              </Text>
            </View>

            {/* Dynamic Important Reminders Card */}
            <View style={styles.card}>
              <Text style={styles.remindersTitle}>Important Reminders</Text>

              {registrarReminders.map((reminder) => (
                <Text key={reminder} style={styles.reminderItem}>
                  • {reminder}
                </Text>
              ))}

              <Text style={styles.processingTime}>Staff will confirm the document release time.</Text>
            </View>

            {/* Cancel Queue Ticket Button */}
            {studentTicket?.status === 'WAITING' && (
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed && styles.cancelButtonPressed,
                ]}
                onPress={() => setShowCancelModal(true)}
              >
                <Text style={styles.cancelButtonText}>Cancel Queue Ticket</Text>
              </Pressable>
            )}
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
              Are you sure you want to cancel your ticket ({studentTicket?.number})? This action cannot be undone.
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Reason for cancellation"
              placeholderTextColor={styles.historyDate.color}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />

            <TouchableOpacity
              style={[styles.modalCancelBtn, !cancelReason.trim() && styles.disabledButton]}
              activeOpacity={0.8}
              onPress={handleConfirmCancel}
              disabled={!cancelReason.trim()}
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
  activityButton: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.surfaceMuted, marginTop: 12 },
  activityButtonText: { color: colors.brandText, fontSize: 12, fontWeight: '700' },
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
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  viewQrText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pressedEffect: {
    opacity: 0.6,
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
    textAlign: 'center',
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
  reasonInput: {
    width: '100%',
    minHeight: 72,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  disabledButton: {
    opacity: 0.5,
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
    textAlign: 'center',
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
    textAlign: 'center',
  },
});
