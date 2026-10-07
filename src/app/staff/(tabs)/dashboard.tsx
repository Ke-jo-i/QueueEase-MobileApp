import { MotionButton as TouchableOpacity } from '@/components/motion';
import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueue } from '@/contexts/queue';
import { registrarWindows } from '@/constants/service-windows';
import { ActionButton, Notice } from '@/components/form';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web') globalThis.alert(`${title}\n${message}`);
  else Alert.alert(title, message);
}

const ACTION_REASONS = {
  hold: ['Student gathering documents', 'Student requested more time', 'System or payment verification', 'Other'],
  skip: ['Student not present', 'Student missed the call', 'Incorrect service queue', 'Other'],
} as const;

const TICKET_ACTIONS = [
  { id: 'hold', label: 'Hold ticket', description: 'Keep it active while the student gathers documents.', icon: 'pause-circle-outline' },
  { id: 'transfer', label: 'Transfer ticket', description: 'Move it to another window’s waiting line.', icon: 'swap-horizontal-outline' },
  { id: 'skip', label: 'Skip ticket', description: 'End this ticket as skipped.', icon: 'play-skip-forward-outline' },
  { id: 'noShow', label: 'Mark no-show', description: 'Record that the student did not respond to the call.', icon: 'person-remove-outline' },
] as const;

export default function StaffDashboardScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const [action, setAction] = useState<'hold' | 'skip' | 'noShow' | 'transfer' | null>(null);
  const [actionTicketId, setActionTicketId] = useState('');
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [reasonMenuOpen, setReasonMenuOpen] = useState(false);
  const [transferWindow, setTransferWindow] = useState('Window 1 - Registrar');
  const [menuTicketId, setMenuTicketId] = useState<string | null>(null);

  const {
    assignedWindow,
    waiting,
    currentServing,
    callNext,
    recallCurrent,
    completeCurrent,
    holdCurrent,
    skipCurrent,
    noShowCurrent,
    transferCurrent,
    busy,
    connected,
  } = useQueue();
  const windowWaiting = waiting.filter((ticket) => ticket.window === assignedWindow);
  const menuOpen = !!currentServing && menuTicketId === currentServing.id;
  if (menuTicketId && !menuOpen) setMenuTicketId(null);
  const unavailable = busy || !connected;
  const arrivalConfirmed = currentServing?.events.slice(currentServing.events.map((event) => event.type).lastIndexOf('CALLED'))
    .some((event) => event.type === 'CHECKED_IN');
  const closeActions = () => { setMenuTicketId(null); setAction(null); setReasonMenuOpen(false); };

  // Handler para sa Call Next
  const handleCallNext = async () => {
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

    const nextTicket = await callNext();
    if (!nextTicket) return;

  };

  // Handler para sa Recall
  const handleRecall = async () => {
    if (!currentServing) {
      showMessage(
        'No Active Ticket',
        'There is currently no active ticket to recall.'
      );
      return;
    }

    if (!await recallCurrent()) return;
  };

  const openAction = (nextAction: 'hold' | 'skip' | 'noShow' | 'transfer') => {
    if (!currentServing) {
      showMessage('No Active Ticket', 'There is currently no active ticket for this action.');
      return;
    }
    setReason('');
    setActionTicketId(currentServing.id);
    setSelectedReason('');
    setReasonMenuOpen(false);
    setMenuTicketId(null);
    if (nextAction === 'transfer') setTransferWindow(registrarWindows.find((window) => window !== assignedWindow)!);
    setAction(nextAction);
  };

  const submitAction = async () => {
    if (!currentServing || currentServing.id !== actionTicketId) return;
    if (action === 'transfer') {
      if (!await transferCurrent(transferWindow)) return;
    } else if (action === 'hold' || action === 'skip') {
      const actionReason = selectedReason === 'Other' ? reason.trim() : selectedReason;
      if (!actionReason) {
        showMessage('Reason Required', 'Choose a reason before continuing.');
        return;
      }
      if (action === 'hold' ? !await holdCurrent(actionReason) : !await skipCurrent(actionReason)) return;
    } else if (action === 'noShow') {
      if (!await noShowCurrent('Student did not respond to call')) return;
    }
    setAction(null);
    setReason('');
    setSelectedReason('');
    setReasonMenuOpen(false);
  };

  const hasValidReason = currentServing?.id === actionTicketId && (!(action === 'hold' || action === 'skip')
    || (!!selectedReason && (selectedReason !== 'Other' || !!reason.trim())));

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']} testID="staff-dashboard">
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Title */}
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>{assignedWindow || 'Choose an available window in Profile'}</Text>
        </View>
        {!assignedWindow && <Notice text="All windows may already be assigned. Ask the administrator to review staff assignments." />}

        {/* Currently Serving Display Box */}
        <View style={styles.servingCard}>
          <Text style={styles.servingLabel}>CURRENTLY SERVING</Text>
          <Text style={[styles.ticketNumber, !currentServing && styles.emptyTitle]}>
            {currentServing ? currentServing.number : 'No active ticket'}
          </Text>
          <Text style={styles.serviceText}>
            {currentServing ? currentServing.service : windowWaiting.length ? 'Call the next student to begin.' : 'No students waiting at this window.'}
          </Text>
          {currentServing && (arrivalConfirmed ? <View style={styles.arrivalStatus}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.successStrong} />
            <Text style={styles.arrivalStatusText}>Arrival confirmed</Text>
          </View> : <TouchableOpacity style={[styles.verifyButton, unavailable && styles.disabled]} disabled={unavailable}
            accessibilityLabel="Scan / verify ticket" onPress={() => router.push('/staff/scan')}>
            <Ionicons name="qr-code-outline" size={18} color={colors.brandText} />
            <Text style={styles.verifyText}>Scan / verify ticket</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.brandText} />
          </TouchableOpacity>)}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <ActionButton label={currentServing ? 'Mark as Done' : 'Call Next'} busy={busy}
            disabled={!connected || (!currentServing && (!assignedWindow || !windowWaiting.length))}
            onPress={currentServing ? handleMarkAsDone : handleCallNext} />
          {currentServing && <View style={styles.secondaryActionRow}>
            <TouchableOpacity style={[styles.secondaryActionBtn, unavailable && styles.disabled]} disabled={unavailable} accessibilityLabel="Recall" onPress={handleRecall}>
              <Ionicons name="volume-high-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.secondaryActionText}>Recall</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryActionBtn, unavailable && styles.disabled]} disabled={unavailable}
              accessibilityLabel="More actions" accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuTicketId(currentServing.id)}>
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
              <Text style={styles.secondaryActionText}>More actions</Text>
            </TouchableOpacity>
          </View>}
        </View>

        {/* View Waiting Queue List Link */}
        <TouchableOpacity
          style={styles.queueListBtn}
          accessibilityLabel={`View Waiting Queue List (${windowWaiting.length})`}
          activeOpacity={0.7}
          onPress={() => router.push('/staff/queue-list')}
        >
          <Ionicons name="list-outline" size={20} color={colors.textMuted} />
          <View style={styles.queueListInfo}>
            <Text style={styles.queueListBtnText}>Waiting queue</Text>
            {windowWaiting[0] && <Text style={styles.nextTicket}>Up next: {windowWaiting[0].number} · {windowWaiting[0].service}</Text>}
          </View>
          <View style={styles.waitingBadge}><Text style={styles.waitingCount}>{windowWaiting.length}</Text></View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={menuOpen || action !== null} transparent animationType="fade" onRequestClose={closeActions}>
        <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.modalOverlay, menuOpen && styles.menuOverlay]}>
          {menuOpen ? <View style={[styles.modalCard, styles.menuCard]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalEyebrow}>TICKET {currentServing?.number}</Text>
                <Text accessibilityRole="header" style={styles.modalTitle}>Ticket actions</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeActions} accessibilityLabel="Close actions">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.menuList}>
              {TICKET_ACTIONS.map((item) => <TouchableOpacity key={item.id} style={[styles.menuOption, unavailable && styles.disabled]}
                accessibilityLabel={item.label} disabled={unavailable} onPress={() => openAction(item.id)}>
                <Ionicons name={item.icon} size={22} color={item.id === 'noShow' ? colors.dangerStrong : colors.textSecondary} />
                <View style={styles.menuOptionInfo}>
                  <Text style={[styles.menuOptionTitle, item.id === 'noShow' && styles.menuOptionDanger]}>{item.label}</Text>
                  <Text style={styles.menuOptionDescription}>{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>)}
            </ScrollView>
          </View> : action && <View style={styles.modalCard}>
            {currentServing?.id !== actionTicketId && <Notice text="This ticket changed while the dialog was open. Close it and review the current queue before taking another action." error />}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalEyebrow}>TICKET {currentServing?.number}</Text>
                <Text style={styles.modalTitle}>{action === 'transfer' ? 'Transfer ticket' : `${action === 'noShow' ? 'Mark no-show' : action === 'hold' ? 'Hold ticket' : 'Skip ticket'}`}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={closeActions} accessibilityLabel="Close action dialog">
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {action === 'transfer' ? (
              <View style={styles.transferOptions}>
                {registrarWindows.filter((window) => window !== assignedWindow).map((window) => (
                  <TouchableOpacity key={window} style={[styles.transferOption, transferWindow === window && styles.transferOptionSelected]} onPress={() => setTransferWindow(window)}>
                    <Text style={styles.transferOptionText}>{window}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : action === 'hold' || action === 'skip' ? (
              <View>
                <Text style={styles.modalPrompt}>Select why this ticket is being {action === 'hold' ? 'held' : 'skipped'}.</Text>
                <TouchableOpacity style={styles.dropdownButton} accessibilityLabel={selectedReason || 'Choose a reason'}
                  accessibilityState={{ expanded: reasonMenuOpen }} onPress={() => setReasonMenuOpen((open) => !open)}>
                  <Text style={[styles.dropdownText, !selectedReason && styles.dropdownPlaceholder]}>
                    {selectedReason || 'Choose a reason'}
                  </Text>
                  <Ionicons name={reasonMenuOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {reasonMenuOpen && (
                  <View style={styles.dropdownMenu}>
                    {ACTION_REASONS[action].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[styles.dropdownOption, selectedReason === option && styles.dropdownOptionSelected]}
                        onPress={() => {
                          setSelectedReason(option);
                          setReasonMenuOpen(false);
                          if (option !== 'Other') setReason('');
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, selectedReason === option && styles.dropdownOptionTextSelected]}>{option}</Text>
                        {selectedReason === option && <Ionicons name="checkmark" size={18} color={colors.brandText} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {selectedReason === 'Other' && (
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Describe the reason"
                    placeholderTextColor={colors.textDisabled}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                  />
                )}
              </View>
            ) : action === 'noShow' ? (
              <View style={styles.noShowNotice}>
                <Ionicons name="person-remove-outline" size={24} color={colors.dangerStrong} />
                <Text style={styles.noShowNoticeText}>This marks the student as absent after the ticket was called.</Text>
              </View>
            ) : (
              <TextInput
                style={styles.reasonInput}
                placeholder="Reason is required"
                placeholderTextColor={colors.textDisabled}
                value={reason}
                onChangeText={setReason}
                multiline
              />
            )}
            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={closeActions}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmButton, (!hasValidReason || unavailable) && styles.modalConfirmDisabled]} onPress={submitAction} disabled={!hasValidReason || unavailable}>
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>}
        </SafeAreaView>
      </Modal>

      {/* Standardized Bottom Navigation */}
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  nextTicket: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 4 },
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
    backgroundColor: colors.infoSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 18,
  },
  servingLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1.2,
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
    textAlign: 'center',
  },
  emptyTitle: { fontSize: 26, color: colors.text },
  disabled: { opacity: 0.45 },
  verifyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, marginTop: 14, width: '100%', borderTopWidth: 1, borderTopColor: colors.border },
  verifyText: { color: colors.brandText, fontSize: 13, fontWeight: '700' },
  arrivalStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  arrivalStatusText: { color: colors.successStrong, fontSize: 12, fontWeight: '600' },
  actionContainer: {
    gap: 10,
    marginBottom: 20,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 48,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryActionText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  queueListBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    minHeight: 64,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  queueListInfo: { flex: 1, minWidth: 0 },
  queueListBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  waitingBadge: { minWidth: 28, minHeight: 28, paddingHorizontal: 7, borderRadius: 14, backgroundColor: colors.surfaceMuted, justifyContent: 'center', alignItems: 'center' },
  waitingCount: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  menuOverlay: { justifyContent: 'flex-end', paddingVertical: 16, paddingHorizontal: 12 },
  menuCard: { maxHeight: '90%', borderRadius: 20 },
  menuList: { flexShrink: 1 },
  menuOption: { minHeight: 76, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  menuOptionInfo: { flex: 1, minWidth: 0, gap: 4 },
  menuOptionTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  menuOptionDescription: { fontSize: 12, lineHeight: 18, color: colors.textMuted },
  menuOptionDanger: { color: colors.dangerStrong },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitleGroup: {
    flex: 1,
  },
  modalEyebrow: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  modalPrompt: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  noShowNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    backgroundColor: colors.dangerSubtle,
  },
  noShowNoticeText: {
    flex: 1,
    color: colors.textBody,
    fontSize: 13,
    lineHeight: 19,
  },
  dropdownButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
  },
  dropdownText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  dropdownPlaceholder: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  dropdownOption: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.blueSoft,
  },
  dropdownOptionText: {
    color: colors.textBody,
    fontSize: 13,
  },
  dropdownOptionTextSelected: {
    color: colors.brandText,
    fontWeight: '800',
  },
  reasonInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    textAlignVertical: 'top',
    marginBottom: 16,
    marginTop: 10,
  },
  transferOptions: {
    gap: 8,
    marginBottom: 16,
  },
  transferOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
  },
  transferOptionSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.blueSoft,
  },
  transferOptionText: {
    color: colors.text,
    fontSize: 13,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  modalCancelText: {
    color: colors.textBody,
    fontWeight: '700',
  },
  modalConfirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.brand,
  },
  modalConfirmDisabled: {
    opacity: 0.45,
  },
  modalConfirmText: {
    color: '#FFFFFF',
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
