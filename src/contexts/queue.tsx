import { useSession } from '@/contexts/session';
import { ApiError, request } from '@/data/api';
import { notifyTurn } from '@/data/notifications';
import { useTurnAlerts } from './turn-alerts';
import { HistoryTicket, isActiveTicket, isHistoryTicket, Ticket, ticketProgress, waitingTickets, queueByWindow } from '@/data/queue-model';
import { useAppTheme } from '@/hooks/use-app-theme';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type Service = { name: string; window: string; enabled: number };
type QueueView = { tickets: Ticket[]; assignedWindow: string; services: Service[]; acceptingTickets: boolean; revision: number; ticketId?: string };
type QueueState = {
  studentTicket: Ticket | null; studentHistory: HistoryTicket[]; studentTickets: Ticket[];
  studentProgress: ReturnType<typeof ticketProgress> | null;
  windowQueues: ReturnType<typeof queueByWindow>;
  bookTicket: (service: string) => Promise<boolean>; cancelTicket: (reason: string) => Promise<boolean>;
  assignedWindow: string; setAssignedWindow: (window: string) => Promise<boolean>;
  waiting: Ticket[]; currentServing: Ticket | null; staffHistory: HistoryTicket[];
  callNext: () => Promise<Ticket | null>; recallCurrent: () => Promise<boolean>; completeCurrent: () => Promise<boolean>;
  holdCurrent: (reason: string) => Promise<boolean>; skipCurrent: (reason: string) => Promise<boolean>;
  noShowCurrent: (reason: string) => Promise<boolean>; transferCurrent: (window: string) => Promise<boolean>;
  reopenTicket: (ticketNumber: string) => Promise<boolean>;
  busy: boolean; connected: boolean; ready: boolean; services: Service[]; acceptingTickets: boolean;
  refresh: () => Promise<void>;
};
const empty: QueueView = { tickets: [], assignedWindow: '', services: [], acceptingTickets: false, revision: -1 };
const QueueContext = createContext<QueueState | null>(null);

export function QueueProvider({ children }: PropsWithChildren) {
  const { token } = useSession();
  return <QueueSession key={token ?? 'signed-out'}>{children}</QueueSession>;
}

function QueueSession({ children }: PropsWithChildren) {
  const { studentId, role, token, expire } = useSession();
  const colors = useAppTheme();
  const { enabled: turnAlertsEnabled } = useTurnAlerts();
  const lastAlert = useRef<string | null>(null);
  const [snapshot, setSnapshot] = useState<QueueView>(empty);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const generation = useRef(0);
  const active = useRef(true);
  const revision = useRef(-1);
  const accept = useCallback((value: QueueView) => {
    if (value.revision >= revision.current) { revision.current = value.revision; setSnapshot(value); }
    setConnected(true);
  }, []);
  const refresh = useCallback(async () => {
    if (!token) return;
    const version = generation.current;
    try {
      const value = await request<QueueView>('/queue', token);
      if (active.current && version === generation.current) accept(value);
    } catch (failure) {
      if (!active.current || version !== generation.current) return;
      setConnected(false);
      if (failure instanceof ApiError && failure.status === 401) expire();
    }
  }, [token, accept, expire]);
  useEffect(() => {
    generation.current++; active.current = true;
    if (!token) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (AppState.currentState !== 'background') await refresh();
      if (!stopped) timer = setTimeout(poll, 2000);
    };
    timer = setTimeout(poll, 0);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => { stopped = true; active.current = false; clearTimeout(timer); listener.remove(); };
  }, [token, refresh]);

  const run = async (command: object): Promise<QueueView | null> => {
    if (!token || lock.current) return null;
    lock.current = true; setBusy(true); setError('');
    const version = generation.current;
    try {
      const result = await request<QueueView>('/queue/command', token, command, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      if (!active.current || version !== generation.current) return null;
      accept(result); return result;
    } catch (failure) {
      if (active.current && version === generation.current) {
        setError(failure instanceof Error ? failure.message : 'Action could not be completed.');
        if (failure instanceof ApiError && failure.status === 401) expire();
        else await refresh();
      }
      return null;
    } finally { if (active.current && version === generation.current) { lock.current = false; setBusy(false); } }
  };
  const { tickets, assignedWindow } = snapshot;
  const studentTickets = studentId ? tickets.filter((ticket) => ticket.ownerId === studentId) : [];
  const studentTicket = studentTickets.find(isActiveTicket) ?? null;
  const progress = studentTicket ? ticketProgress(tickets, studentTicket) : null;
  const alertKey = studentTicket ? `${studentTicket.id}:${studentTicket.events.at(-1)?.id}:${progress?.nextInLine}` : '';
  useEffect(() => {
    if (snapshot.revision < 0) { lastAlert.current = null; return; }
    const previous = lastAlert.current; lastAlert.current = alertKey;
    if (!turnAlertsEnabled || !studentTicket || previous === null || previous === alertKey) return;
    if (studentTicket.status === 'SERVING' && ['CALLED', 'RECALLED'].includes(studentTicket.events.at(-1)?.type ?? '')) void notifyTurn('Your turn', `${studentTicket.number}: proceed to ${studentTicket.window}.`).catch(() => {});
    else if (progress?.nextInLine) void notifyTurn('You’re next in line', `${studentTicket.number}: stay near ${studentTicket.window}.`).catch(() => {});
  }, [alertKey, turnAlertsEnabled, studentTicket, progress?.nextInLine, snapshot.revision]);
  const staffHistory = tickets.filter(isHistoryTicket).sort((a, b) => b.date.localeCompare(a.date));
  const currentServing = tickets.find((ticket) => ticket.status === 'SERVING' && ticket.window === assignedWindow) ?? null;
  const act = async (action: string, reason?: string) => !!await run({ type: 'ACT', action, reason, expectedTicketId: currentServing?.id });
  const value: QueueState = {
    studentTicket, studentTickets, studentProgress: progress, windowQueues: queueByWindow(tickets),
    studentHistory: staffHistory.filter((ticket) => ticket.ownerId === studentId && ticket.status !== 'HELD'),
    bookTicket: async (service) => !!await run({ type: 'BOOK', service }), cancelTicket: async (reason) => !!await run({ type: 'CANCEL', reason }),
    assignedWindow, setAssignedWindow: async (window) => !!await run({ type: 'ASSIGN', window }), waiting: waitingTickets(tickets), currentServing, staffHistory,
    callNext: async () => { const result = await run({ type: 'CALL_NEXT' }); return result?.tickets.find((ticket) => ticket.id === result.ticketId) ?? null; },
    recallCurrent: () => act('RECALLED'), completeCurrent: () => act('COMPLETED'), holdCurrent: (reason) => act('HELD', reason),
    skipCurrent: (reason) => act('SKIPPED', reason), noShowCurrent: (reason) => act('NO_SHOW', reason),
    transferCurrent: async (targetWindow) => !!await run({ type: 'TRANSFER', targetWindow, expectedTicketId: currentServing?.id }),
    reopenTicket: async (number) => !!await run({ type: 'REOPEN', number }),
    busy, connected, ready: snapshot.revision >= 0, services: snapshot.services, acceptingTickets: snapshot.acceptingTickets, refresh,
  };
  return <QueueContext.Provider value={value}><View style={{ flex: 1 }}>
    {role && (!connected || !!error) && <SafeAreaView edges={['top']} style={{ backgroundColor: colors.warningSurface }}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 4 }} accessibilityLiveRegion="polite">
        <Text style={{ color: colors.warningStrong }}>{error || (snapshot.revision < 0 ? 'Connecting to the queue server…' : 'Connection lost. Showing the last update; actions need a connection.')}</Text>
        {!busy && <TouchableOpacity accessibilityRole="button" onPress={() => { setError(''); void refresh(); }}><Text style={{ color: colors.warningStrong, paddingVertical: 6, fontWeight: '700' }}>Refresh connection</Text></TouchableOpacity>}
      </View>
    </SafeAreaView>}
    {children}
  </View></QueueContext.Provider>;
}
export function useQueue() {
  const queue = useContext(QueueContext);
  if (!queue) throw new Error('useQueue must be used within QueueProvider');
  return queue;
}
