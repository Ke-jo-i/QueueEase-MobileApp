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
        {currentServing && <View style={{ marginBottom: 14 }}><ActionButton label={currentServing.events.slice(currentServing.events.map((event) => event.type).lastIndexOf('CALLED')).some((event) => event.type === 'CHECKED_IN') ? 'Arrival confirmed' : 'Scan / verify ticket'} disabled={busy || !connected} secondary onPress={() => router.push('/staff/scan')} /></View>}

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
            disabled={busy || !connected || !!currentServing || windowWaiting.length === 0 || !assignedWindow}
            style={[styles.callNextBtn, (busy || !connected || !!currentServing || windowWaiting.length === 0) && { opacity: 0.45 }]}
            activeOpacity={0.8}
            onPress={handleCallNext}
          >
            <Text style={styles.callNextBtnText}>CALL NEXT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={busy || !connected || !currentServing}
            style={[styles.recallBtn, (busy || !connected || !currentServing) && { opacity: 0.45 }]}
            activeOpacity={0.8}
            onPress={handleRecall}
          >
            <Text style={styles.recallBtnText}>RECALL</Text>
          </TouchableOpacity>

          <View pointerEvents={busy || !connected || !currentServing ? 'none' : 'auto'} style={[styles.secondaryActionRow, (busy || !connected || !currentServing) && { opacity: 0.45 }]}>
            <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => openAction('hold')}>
              <Text style={styles.secondaryActionText}>HOLD</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => openAction('skip')}>
              <Text style={styles.secondaryActionText}>SKIP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => openAction('noShow')}>
              <Text style={styles.secondaryActionText}>NO-SHOW</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => openAction('transfer')}>
              <Text style={styles.secondaryActionText}>TRANSFER</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            disabled={busy || !connected || !currentServing}
            style={[styles.doneBtn, (busy || !connected || !currentServing) && { opacity: 0.45 }]}
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
          {windowWaiting[0] && <Text style={styles.nextTicket}>Up next: {windowWaiting[0].number} · {windowWaiting[0].service}</Text>}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={action !== null} transparent animationType="fade" onRequestClose={() => setAction(null)}>
        <View style={styles.modalOverlay}>
          {action && <View style={styles.modalCard}>
            {currentServing?.id !== actionTicketId && <Notice text="This ticket changed while the dialog was open. Close it and review the current queue before taking another action." error />}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleGroup}>
                <Text style={styles.modalEyebrow}>TICKET {currentServing?.number}</Text>
                <Text style={styles.modalTitle}>{action === 'transfer' ? 'Transfer ticket' : `${action === 'noShow' ? 'Mark no-show' : action === 'hold' ? 'Hold ticket' : 'Skip ticket'}`}</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setAction(null)} accessibilityLabel="Close action dialog">
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
                <TouchableOpacity style={styles.dropdownButton} onPress={() => setReasonMenuOpen((open) => !open)}>
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
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setAction(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmButton, (!hasValidReason || busy) && styles.modalConfirmDisabled]} onPress={submitAction} disabled={!hasValidReason || busy}>
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>}
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  nextTicket: { color: colors.textMuted, fontSize: 11, lineHeight: 17, marginTop: 5, paddingHorizontal: 12, textAlign: 'center' },
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
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 24,
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
  actionContainer: {
    gap: 12,
    marginBottom: 28,
  },
  secondaryActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    minWidth: '22%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: colors.brandText,
    fontSize: 10,
    fontWeight: '800',
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
    textAlign: 'center',
  },
  recallBtn: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  recallBtnText: {
    color: colors.brandText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
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
    textAlign: 'center',
  },
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
