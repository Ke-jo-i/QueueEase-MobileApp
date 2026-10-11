import { useSession } from '@/contexts/session';
import { HistoryTicket, Ticket, ticketProgress } from '@/data/queue-model';
import { useAppTheme } from '@/hooks/use-app-theme';
import { supabase } from '@/lib/supabase';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type Service = { name: string; window: string; enabled: number };

type QueueState = {
  studentTicket: Ticket | null;
  studentHistory: HistoryTicket[];
  studentTickets: Ticket[];
  studentProgress: ReturnType<typeof ticketProgress> | null;
  windowQueues: Record<string, Ticket[]>;
  bookTicket: (service: string) => Promise<boolean>;
  cancelTicket: (reason: string) => Promise<boolean>;
  assignedWindow: string;
  setAssignedWindow: (window: string) => Promise<boolean>;
  waiting: Ticket[];
  currentServing: Ticket | null;
  staffHistory: HistoryTicket[];
  callNext: () => Promise<Ticket | null>;
  recallCurrent: () => Promise<boolean>;
  completeCurrent: () => Promise<boolean>;
  holdCurrent: (reason: string) => Promise<boolean>;
  skipCurrent: (reason: string) => Promise<boolean>;
  noShowCurrent: (reason: string) => Promise<boolean>;
  transferCurrent: (window: string) => Promise<boolean>;
  reopenTicket: (ticketNumber: string) => Promise<boolean>;
  busy: boolean;
  connected: boolean;
  ready: boolean;
  services: Service[];
  acceptingTickets: boolean;
  refresh: () => Promise<void>;
};

const DEFAULT_SERVICES: Service[] = [
  { name: 'Certificate of Enrollment', window: 'Window 1', enabled: 1 },
  { name: 'Certificate of Grades', window: 'Window 1', enabled: 1 },
  { name: 'Academic Records Request', window: 'Window 2', enabled: 1 },
  { name: 'Enrollment Concern', window: 'Window 2', enabled: 1 },
  { name: 'Student Record Update', window: 'Window 3', enabled: 1 },
  { name: 'Other Registrar Concern', window: 'Window 3', enabled: 1 },
];

const QueueContext = createContext<QueueState | null>(null);

export function QueueProvider({ children }: PropsWithChildren) {
  const { token } = useSession();
  return <QueueSession key={token ?? 'signed-out'}>{children}</QueueSession>;
}

function QueueSession({ children }: PropsWithChildren) {
  const { user } = useSession();
  const colors = useAppTheme();

  const [connected, setConnected] = useState(true);
  const [ready, setReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [assignedWindow, setAssignedWindow] = useState('Window 1');

  // Fetch Data mula sa Supabase Table
  const refresh = useCallback(async () => {
    try {
      setBusy(true);
      setError('');
      
      const { data, error: dbError } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: true });

      if (dbError) throw dbError;

      if (data) {
        const mappedTickets = data.map((item: any) => {
          const rawStatus = (item.status || 'WAITING').toUpperCase();
          const validStatus = ['WAITING', 'SERVING', 'HELD', 'COMPLETED', 'CANCELLED', 'SKIPPED', 'NO_SHOW'].includes(rawStatus)
            ? rawStatus
            : 'WAITING';

          return {
            id: String(item.id),
            number: `R-${String(item.queue_number || 1).padStart(3, '0')}`,
            service: item.purpose || 'Registrar Service',
            ownerId: String(item.student_id || ''),
            ownerName: String(item.student_name || 'Student'),
            window: 'Window 1 - Registrar',
            status: validStatus,
            date: item.created_at || new Date().toISOString(),
            events: [],
          } as unknown as Ticket;
        });
        setTickets(mappedTickets);
      }
      setConnected(true);
      setReady(true);
    } catch (err: any) {
      setConnected(true);
      setReady(true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const channel = supabase
      .channel('public:appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        void refresh();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const studentTickets = user?.email || user?.login ? tickets.filter((t) => t.ownerId === user.login || t.ownerId === user.email) : [];
  const studentTicket = studentTickets.find((t) => t.status === 'WAITING' || t.status === 'SERVING' || t.status === 'HELD') ?? null;
  const progress = studentTicket ? ticketProgress(tickets, studentTicket) : null;

  const bookTicket = async (serviceName: string): Promise<boolean> => {
    try {
      setBusy(true);
      const { error: insertErr } = await supabase.from('appointments').insert({
        student_id: user?.login || user?.email || '147611',
        student_name: user?.name || 'Student',
        purpose: serviceName,
        status: 'pending',
      });

      if (insertErr) throw insertErr;
      await refresh();
      return true;
    } catch (e: any) {
      setError(e.message || 'Could not book ticket');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const value: QueueState = {
    studentTicket,
    studentTickets,
    studentProgress: progress,
    windowQueues: {},
    studentHistory: tickets.filter((t) => t.status === 'COMPLETED' || t.status === 'CANCELLED') as unknown as HistoryTicket[],
    bookTicket,
    cancelTicket: async () => true,
    assignedWindow,
    setAssignedWindow: async (win) => { setAssignedWindow(win); return true; },
    waiting: tickets.filter((t) => t.status === 'WAITING'),
    currentServing: tickets.find((t) => t.status === 'SERVING') ?? null,
    staffHistory: [],
    callNext: async () => null,
    recallCurrent: async () => true,
    completeCurrent: async () => true,
    holdCurrent: async () => true,
    skipCurrent: async () => true,
    noShowCurrent: async () => true,
    transferCurrent: async () => true,
    reopenTicket: async () => true,
    busy,
    connected,
    ready,
    services: DEFAULT_SERVICES,
    acceptingTickets: true,
    refresh,
  };

  return (
    <QueueContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {!connected && (
          <SafeAreaView edges={['top']} style={{ backgroundColor: colors.warningSurface }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 4 }}>
              <Text style={{ color: colors.warningStrong }}>
                {error || 'Connecting to the queue server…'}
              </Text>
              {!busy && (
                <TouchableOpacity onPress={() => void refresh()}>
                  <Text style={{ color: colors.warningStrong, paddingVertical: 6, fontWeight: '700' }}>
                    Refresh connection
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
        )}
        {children}
      </View>
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const queue = useContext(QueueContext);
  if (!queue) throw new Error('useQueue must be used within QueueProvider');
  return queue;
}