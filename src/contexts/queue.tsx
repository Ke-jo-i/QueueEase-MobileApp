import { useSession } from '@/contexts/session';
import { createContext, PropsWithChildren, useContext, useState } from 'react';

export type Ticket = {
  number: string;
  service: string;
  window: string;
  status: 'WAITING' | 'SERVING' | 'COMPLETED' | 'CANCELLED';
  ownerId?: string;
  date?: string;
};

type HistoryTicket = Ticket & { date: string };

type QueueState = {
  studentTicket: Ticket | null;
  studentHistory: HistoryTicket[];
  bookTicket: (service: string, window: string) => boolean;
  cancelTicket: () => void;
  assignedWindow: string;
  setAssignedWindow: (window: string) => void;
  waiting: Ticket[];
  currentServing: Ticket | null;
  staffHistory: HistoryTicket[];
  callNext: () => Ticket | null;
  completeCurrent: () => void;
};

const QueueContext = createContext<QueueState | null>(null);

const initialTickets: Ticket[] = [
  { number: 'R - 102', service: 'Certificate of Enrollment', window: 'Window 3 - Registrar', status: 'SERVING' },
  { number: 'R - 103', service: 'Certificate of Grades', window: 'Window 2 - Registrar', status: 'WAITING' },
  { number: 'R - 104', service: 'Academic Records Request', window: 'Window 1 - Registrar', status: 'WAITING' },
  { number: 'R - 105', service: 'Enrollment Concern', window: 'Window 3 - Registrar', status: 'WAITING' },
];

function isHistoryTicket(ticket: Ticket): ticket is HistoryTicket {
  return (ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED') && !!ticket.date;
}

export function QueueProvider({ children }: PropsWithChildren) {
  const { studentId } = useSession();
  const [tickets, setTickets] = useState(initialTickets);
  const [nextNumber, setNextNumber] = useState(106);
  const [assignedWindow, setAssignedWindow] = useState('Window 3 - Registrar');

  const studentTicket = studentId
    ? tickets.find((ticket) => ticket.ownerId === studentId && (ticket.status === 'WAITING' || ticket.status === 'SERVING')) ?? null
    : null;
  const studentHistory = studentId
    ? tickets.filter((ticket): ticket is HistoryTicket => ticket.ownerId === studentId && isHistoryTicket(ticket)).reverse()
    : [];
  const waiting = tickets.filter((ticket) => ticket.status === 'WAITING');
  const currentServing = tickets.find((ticket) => ticket.status === 'SERVING' && ticket.window === assignedWindow) ?? null;
  const staffHistory = tickets.filter(isHistoryTicket).filter((ticket) => ticket.status === 'COMPLETED').reverse();

  const value: QueueState = {
    studentTicket,
    studentHistory,
    bookTicket: (service, window) => {
      if (!studentId || studentTicket) return false;
      setTickets((items) => {
        if (items.some((ticket) => ticket.ownerId === studentId && (ticket.status === 'WAITING' || ticket.status === 'SERVING'))) return items;
        return [...items, { number: `R - ${nextNumber}`, service, window, status: 'WAITING', ownerId: studentId }];
      });
      setNextNumber((number) => number + 1);
      return true;
    },
    cancelTicket: () => {
      if (!studentTicket || studentTicket.status !== 'WAITING') return;
      setTickets((items) => items.map((ticket) => ticket.number === studentTicket.number
        ? { ...ticket, status: 'CANCELLED', date: 'Today' }
        : ticket));
    },
    assignedWindow,
    setAssignedWindow,
    waiting,
    currentServing,
    staffHistory,
    callNext: () => {
      if (currentServing) return null;
      const next = waiting.find((ticket) => ticket.window === assignedWindow);
      if (!next) return null;
      setTickets((items) => items.map((ticket) => ticket.number === next.number
        ? { ...ticket, status: 'SERVING' }
        : ticket));
      return next;
    },
    completeCurrent: () => {
      if (!currentServing) return;
      setTickets((items) => items.map((ticket) => ticket.number === currentServing.number
        ? { ...ticket, status: 'COMPLETED', date: 'Today' }
        : ticket));
    },
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueue() {
  const queue = useContext(QueueContext);
  if (!queue) throw new Error('useQueue must be used within QueueProvider');
  return queue;
}
