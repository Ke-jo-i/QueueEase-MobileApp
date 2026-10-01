import { useSession } from '@/contexts/session';
import { applyQueueCommand, HistoryTicket, isActiveTicket, isHistoryTicket, QueueCommand, QueueResult, QueueSnapshot, Ticket, ticketProgress, waitingTickets } from '@/data/queue-model';
import { loadQueue, saveQueue } from '@/data/queue-storage';
import { useAppTheme } from '@/hooks/use-app-theme';
import { createContext, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type QueueState = {
  studentTicket: Ticket | null;
  studentHistory: HistoryTicket[];
  studentTickets: Ticket[];
  studentProgress: ReturnType<typeof ticketProgress> | null;
  bookTicket: (service: string) => boolean;
  cancelTicket: (reason: string) => boolean;
  assignedWindow: string;
  setAssignedWindow: (window: string) => void;
  waiting: Ticket[];
  currentServing: Ticket | null;
  staffHistory: HistoryTicket[];
  callNext: () => Ticket | null;
  recallCurrent: () => boolean;
  completeCurrent: () => void;
  holdCurrent: (reason: string) => boolean;
  skipCurrent: (reason: string) => boolean;
  noShowCurrent: (reason: string) => boolean;
  transferCurrent: (window: string) => boolean;
  reopenTicket: (ticketNumber: string) => boolean;
};

const QueueContext = createContext<QueueState | null>(null);

export function QueueProvider({ children }: PropsWithChildren) {
  const { studentId, role } = useSession();
  const colors = useAppTheme();
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const current = useRef<QueueSnapshot | null>(null);
  const writeVersion = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let active = true;
    loadQueue().then((saved) => {
      if (!active) return;
      current.current = saved;
      setSnapshot(saved);
      setLoadError(false);
    }).catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [loadAttempt]);

  const persist = (next: QueueSnapshot) => {
    const version = ++writeVersion.current;
    saveQueue(next).then(() => {
      if (version === writeVersion.current) setSaveError(false);
    }).catch(() => {
      if (version === writeVersion.current) setSaveError(true);
    });
  };

  const run = (command: QueueCommand): QueueResult => {
    const permittedRole = command.type === 'BOOK' || command.type === 'CANCEL' ? 'student' : 'staff';
    if (!current.current || role !== permittedRole) return { ok: false, message: 'Please sign in to continue.' };
    const result = applyQueueCommand(current.current, command, new Date().toISOString());
    if (!result.ok) {
      setActionError(result.message);
      return result;
    }
    current.current = result.state;
    setSnapshot(result.state);
    setActionError('');
    persist(result.state);
    return result;
  };

  if (!snapshot) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16 }}>
      {loadError ? <>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Could not open saved queue</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', lineHeight: 21 }}>Your saved data has been kept. Try again to load it.</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => { setLoadError(false); setLoadAttempt((attempt) => attempt + 1); }} style={{ padding: 14, backgroundColor: colors.brand, borderRadius: 10 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Retry loading queue</Text>
        </TouchableOpacity>
      </> : <><ActivityIndicator color={colors.brandText} /><Text style={{ color: colors.textMuted }}>Opening queue…</Text></>}
    </SafeAreaView>
  );

  const { tickets, assignedWindow } = snapshot;
  const studentTickets = studentId ? tickets.filter((ticket) => ticket.ownerId === studentId) : [];
  const studentTicket = studentTickets.find(isActiveTicket) ?? null;
  const staffHistory = tickets.filter(isHistoryTicket).sort((a, b) => b.date.localeCompare(a.date));
  const value: QueueState = {
    studentTicket,
    studentTickets,
    studentProgress: studentTicket ? ticketProgress(tickets, studentTicket) : null,
    studentHistory: staffHistory.filter((ticket) => ticket.ownerId === studentId && ticket.status !== 'HELD'),
    bookTicket: (service) => run({ type: 'BOOK', ownerId: studentId ?? '', service }).ok,
    cancelTicket: (reason) => run({ type: 'CANCEL', ownerId: studentId ?? '', reason }).ok,
    assignedWindow,
    setAssignedWindow: (window) => { run({ type: 'ASSIGN', window }); },
    waiting: waitingTickets(tickets),
    currentServing: tickets.find((ticket) => ticket.status === 'SERVING' && ticket.window === assignedWindow) ?? null,
    staffHistory,
    callNext: () => { const result = run({ type: 'CALL_NEXT', window: assignedWindow }); return result.ok ? result.ticket ?? null : null; },
    recallCurrent: () => run({ type: 'ACT', window: assignedWindow, action: 'RECALLED' }).ok,
    completeCurrent: () => { run({ type: 'ACT', window: assignedWindow, action: 'COMPLETED' }); },
    holdCurrent: (reason) => run({ type: 'ACT', window: assignedWindow, action: 'HELD', reason }).ok,
    skipCurrent: (reason) => run({ type: 'ACT', window: assignedWindow, action: 'SKIPPED', reason }).ok,
    noShowCurrent: (reason) => run({ type: 'ACT', window: assignedWindow, action: 'NO_SHOW', reason }).ok,
    transferCurrent: (window) => run({ type: 'TRANSFER', window: assignedWindow, targetWindow: window }).ok,
    reopenTicket: (number) => run({ type: 'REOPEN', number }).ok,
  };

  return <QueueContext.Provider value={value}>
    <View style={{ flex: 1 }}>
      {role && (saveError || !!actionError) && <SafeAreaView edges={['top']} style={{ backgroundColor: colors.warningSurface }}>
        <View style={{ padding: 12, gap: 8 }} accessibilityRole="alert">
          <Text style={{ color: colors.warningStrong }}>{saveError ? 'Changes have not been saved on this device. Keep the app open and retry.' : actionError}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => { if (saveError && current.current) persist(current.current); else setActionError(''); }}>
            <Text style={{ color: colors.warningStrong, fontWeight: '700', paddingVertical: 8 }}>{saveError ? 'Retry saving' : 'Dismiss'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>}
      {children}
    </View>
  </QueueContext.Provider>;
}

export function useQueue() {
  const queue = useContext(QueueContext);
  if (!queue) throw new Error('useQueue must be used within QueueProvider');
  return queue;
}
