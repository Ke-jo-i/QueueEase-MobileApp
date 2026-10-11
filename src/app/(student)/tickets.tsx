import { MotionButton as TouchableOpacity, Reveal } from '@/components/motion';
import { GlassSurface, translucent } from '@/components/glass-surface';
import { Ionicons } from '@expo/vector-icons';
import { AppPalette } from '@/constants/app-colors';
import { useThemedStyles } from '@/hooks/use-app-theme';
import { useQueue } from '@/contexts/queue';
import { type Ticket } from '@/data/queue-model';
import { useSession } from '@/contexts/session';
import { ticketStatusLabels } from '@/constants/queue-labels';
import { TicketActivity } from '@/components/ticket-activity';
import { CardOverlay } from '@/components/card-overlay';
import { Disclosure } from '@/components/disclosure';
import { Notice } from '@/components/form';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

function formatTicketDate(value: string) {
  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function MyTicketsScreen() {
  const styles = useThemedStyles(createStyles);
  const { studentTicket, studentHistory, studentProgress, cancelTicket, busy, connected, actionError } = useQueue();
  const { studentId } = useSession();
  const router = useRouter();
  const [qrTicketId, setQrTicketId] = useState<string | null>(null);
  const [cancelTicketId, setCancelTicketId] = useState<string | null>(null);
  const [lastPreview, setLastPreview] = useState<Ticket | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const activeService = studentTicket?.service ?? 'Certificate of Enrollment';
  const showQrModal = !!studentTicket && qrTicketId === studentTicket.id;
  const canCancel = !!studentTicket && ['WAITING', 'HELD'].includes(studentTicket.status);
  const showCancelModal = canCancel && cancelTicketId === studentTicket.id;
  const preview = showQrModal ? studentTicket : lastPreview;
  if (showQrModal && studentTicket !== lastPreview) setLastPreview(studentTicket);
  if (qrTicketId && !showQrModal) setQrTicketId(null);
  if (cancelTicketId && !showCancelModal) { setCancelTicketId(null); setCancelReason(''); }
  const closePreview = () => { setQrTicketId(null); setCancelTicketId(null); setCancelReason(''); };

  // Handle Ticket Cancellation Logic
  const handleConfirmCancel = async () => {
    if (!showCancelModal || !cancelReason.trim() || busy || !connected) return;
    if (!await cancelTicket(cancelReason)) return;
    closePreview();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="student-tickets">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>My Queue Tickets</Text>
          <Text style={styles.subtitle}>Manage active and past tickets</Text>
        </View>

        {!studentTicket && <Reveal><GlassSurface variant="tinted" style={{ padding: 24, gap: 14, marginBottom: 26 }}>
          <Ionicons name="ticket-outline" size={32} color={styles.title.color} />
          <Text style={{ fontSize: 24, fontWeight: '700', color: styles.title.color, letterSpacing: -0.5 }}>Your ticket appears here</Text>
          <Text style={styles.activeWindowText}>Choose a registrar service to join a queue.</Text>
          <TouchableOpacity style={[styles.viewQrContainer, { alignSelf: 'flex-start' }]} onPress={() => router.navigate('/home')}><Text style={styles.viewQrText}>Choose a service</Text></TouchableOpacity>
        </GlassSurface></Reveal>}

        {/* NOW IN QUEUE Section (Ise-show lamang kapag may active ticket) */}
        {studentTicket && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{studentTicket.status === 'HELD' ? 'ON HOLD' : 'NOW IN QUEUE'}</Text>

            {/* Active Ticket Card */}
            <Reveal><GlassSurface variant="tinted" style={styles.activeCard}>
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
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="View QR Ticket"
                style={styles.viewQrContainer}
                onPress={() => { setLastPreview(studentTicket); setQrTicketId(studentTicket.id); }}
              >
                <Text style={styles.viewQrText}>View QR Ticket</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.activityButton} accessibilityLabel="View queue progress" onPress={() => router.push('/live-status')}>
                <Text style={styles.activityButtonText}>{studentTicket.status === 'WAITING' ? `${studentProgress?.peopleAhead ?? 0} ${studentProgress?.peopleAhead === 1 ? 'person' : 'people'} ahead · View progress` : 'View queue progress'}</Text>
              </TouchableOpacity>
              {canCancel && <TouchableOpacity accessibilityLabel="Cancel ticket" disabled={busy} style={styles.cancelButton} onPress={() => { setCancelReason(''); setCancelTicketId(studentTicket.id); }}>
                <Text style={styles.cancelButtonText}>Cancel ticket</Text>
              </TouchableOpacity>}
            </GlassSurface></Reveal>
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
              <Disclosure open={expandedHistory === ticket.id}><TicketActivity ticket={ticket} /></Disclosure>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* QUEUE TICKET MODAL */}
      <CardOverlay open={showQrModal} onClose={closePreview}>
        <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header with Close */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.title}>Queue Ticket</Text>
                <Text style={styles.studentInfo}>Student: {studentId}</Text>
              </View>
              <TouchableOpacity accessibilityLabel="Close ticket" onPress={closePreview} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Ticket Status Card */}
            <GlassSurface style={styles.card}>
              <Text style={styles.ticketNumber}>{preview?.number}</Text>
              <Text style={styles.statusLabel}>
                Status: <Text style={styles.statusValue}>{preview ? ticketStatusLabels[preview.status] : ''}</Text>
              </Text>
              <Text style={styles.windowText}>{preview?.window}</Text>
            </GlassSurface>

            {/* QR Code Card */}
            <GlassSurface style={styles.cardCenter}>
              {preview && <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 12 }}><QRCode value={`queueease:v1:${preview.id}`} size={160} /></View>}
              <Text style={styles.qrSubtext}>
                Show this ticket when called at {preview?.window.split(' - ')[0]}. Staff can scan it to confirm your arrival. Scanning does not skip the line.
              </Text>
            </GlassSurface>

            {/* Cancel Queue Ticket Button */}
            {preview && ['WAITING', 'HELD'].includes(preview.status) && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setCancelReason(''); setCancelTicketId(studentTicket?.id ?? null); }}
              >
                <Text style={styles.cancelButtonText}>Cancel Queue Ticket</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </CardOverlay>

      {/* Cancel Confirmation Alert Modal */}
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelTicketId(null)}
      >
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ width: '100%', maxWidth: 380, flexGrow: 0 }} contentContainerStyle={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Queue Ticket?</Text>
            <Text style={styles.modalSubtext}>
              Cancel {studentTicket?.number} and leave this queue?
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Reason for cancellation"
              accessibilityLabel="Reason for cancellation"
              placeholderTextColor={styles.historyDate.color}
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              maxLength={300}
              editable={!busy}
            />
            <Notice text={actionError} error />

            <TouchableOpacity
              style={[styles.modalCancelBtn, (!cancelReason.trim() || busy || !connected) && styles.disabledButton]}
              activeOpacity={0.8}
              onPress={handleConfirmCancel}
              disabled={!cancelReason.trim() || busy || !connected}
            >
              <Text style={styles.modalCancelBtnText}>{busy ? 'Cancelling…' : 'Yes, Cancel Ticket'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalKeepBtn}
              activeOpacity={0.8}
              onPress={() => setCancelTicketId(null)}
            >
              <Text style={styles.modalKeepBtnText}>No, Keep my ticket</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  activityButton: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, backgroundColor: translucent(colors.surface, 0.7), marginTop: 12 },
  activityButtonText: { color: colors.brandText, fontSize: 12, fontWeight: '700' },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    width: '100%', maxWidth: 720, alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 30, letterSpacing: -0.8,
    fontWeight: '700',
    color: colors.textStrong,
  },
  subtitle: {
    fontSize: 14, lineHeight: 21,
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
    borderWidth: 1,
    borderColor: translucent(colors.brandText, 0.18),
    borderRadius: 30,
    padding: 24,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeTicketNumber: {
    fontSize: 46, letterSpacing: -1,
    fontWeight: 'bold',
    color: colors.brandText,
  },
  activeBadge: {
    backgroundColor: colors.successSurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
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
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 20,
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
    backgroundColor: translucent(colors.surface, 0.7),
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    padding: 20,
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
    borderRadius: 26,
    padding: 20,
    marginBottom: 16,
  },
  cardCenter: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 26,
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
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
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
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 28,
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
