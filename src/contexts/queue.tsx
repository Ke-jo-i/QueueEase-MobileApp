import { useSession } from '@/contexts/session';
import { createContext, PropsWithChildren, useContext, useState } from 'react';

export type Ticket = {
  number: string;
  service: string;
  window: string;
  status: 'WAITING' | 'SERVING' | 'HELD' | 'COMPLETED' | 'CANCELLED' | 'SKIPPED' | 'NO_SHOW';
  ownerId?: string;
  date?: string;
  reason?: string;
  recallCount?: number;
  lastAction?: string;
};

type HistoryTicket = Ticket & { date: string };

type QueueState = {
  studentTicket: Ticket | null;
  studentHistory: HistoryTicket[];
  bookTicket: (service: string, window: string) => boolean;
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

const initialTickets: Ticket[] = [
  { number: 'R - 102', service: 'Certificate of Enrollment', window: 'Window 3 - Registrar', status: 'SERVING' },
  { number: 'R - 103', service: 'Certificate of Grades', window: 'Window 2 - Registrar', status: 'WAITING' },
  { number: 'R - 104', service: 'Academic Records Request', window: 'Window 1 - Registrar', status: 'WAITING' },
  { number: 'R - 105', service: 'Enrollment Concern', window: 'Window 3 - Registrar', status: 'WAITING' },
];

function isHistoryTicket(ticket: Ticket): ticket is HistoryTicket {
  return ['HELD', 'COMPLETED', 'CANCELLED', 'SKIPPED', 'NO_SHOW'].includes(ticket.status) && !!ticket.date;
}

function timestamp() {
  return new Date().toISOString();
}

export function QueueProvider({ children }: PropsWithChildren) {
  const { studentId } = useSession();
  const [tickets, setTickets] = useState(initialTickets);
  const [nextNumber, setNextNumber] = useState(106);
  const [assignedWindow, setAssignedWindow] = useState('Window 1 - Registrar');

  const studentTicket = studentId
    ? tickets.find((ticket) => ticket.ownerId === studentId && (ticket.status === 'WAITING' || ticket.status === 'SERVING')) ?? null
    : null;
  const studentHistory = studentId
    ? tickets.filter((ticket): ticket is HistoryTicket => ticket.ownerId === studentId && ['COMPLETED', 'CANCELLED', 'SKIPPED', 'NO_SHOW'].includes(ticket.status) && !!ticket.date).reverse()
    : [];
  const waiting = tickets.filter((ticket) => ticket.status === 'WAITING');
  const currentServing = tickets.find((ticket) => ticket.status === 'SERVING' && ticket.window === assignedWindow) ?? null;
  const staffHistory = tickets.filter(isHistoryTicket).reverse();

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
    cancelTicket: (reason) => {
      const trimmedReason = reason.trim();
      if (!studentTicket || studentTicket.status !== 'WAITING' || !trimmedReason) return false;
      setTickets((items) => items.map((ticket) => ticket.number === studentTicket.number
        ? { ...ticket, status: 'CANCELLED', date: timestamp(), reason: trimmedReason, lastAction: 'CANCELLED' }
        : ticket));
      return true;
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
        ? { ...ticket, status: 'SERVING', lastAction: 'CALLED' }
        : ticket));
      return next;
    },
    recallCurrent: () => {
      if (!currentServing) return false;
      setTickets((items) => items.map((ticket) => ticket.number === currentServing.number
        ? { ...ticket, recallCount: (ticket.recallCount ?? 0) + 1, lastAction: 'RECALLED' }
        : ticket));
      return true;
    },
    completeCurrent: () => {
      if (!currentServing) return;
      setTickets((items) => items.map((ticket) => ticket.number === currentServing.number
        ? { ...ticket, status: 'COMPLETED', date: timestamp(), lastAction: 'COMPLETED' }
        : ticket));
    },
    holdCurrent: (reason) => {
      const trimmedReason = reason.trim();
      if (!currentServing || !trimmedReason) return false;
      setTickets((items) => items.map((ticket) => ticket.number === currentServing.number
        ? { ...ticket, status: 'HELD', date: timestamp(), reason: trimmedReason, lastAction: 'HELD' }
        : ticket));
      return true;
    },
    skipCurrent: (reason) => {
      const trimmedReason = reason.trim();
      if (!currentServing || !trimmedReason) return false;
      setTickets((items) => items.map((ticket) => ticket.number === currentServing.number
        ? { ...ticket, status: 'SKIPPED', date: timestamp(), reason: trimmedReason, lastAction: 'SKIPPED' }
        : ticket));
      return true;
    },
    noShowCurrent: (reason) => {
      const trimmedReason = reason.trim();
      if (!currentServing || !trimmedReason) return false;
      setTickets((items) => items.map((ticket) => ticket.number === currentServing.number
        ? { ...ticket, status: 'NO_SHOW', date: timestamp(), reason: trimmedReason, lastAction: 'NO_SHOW' }
        : ticket));
      return true;
    },
    transferCurrent: (window) => {
      if (!currentServing || !window || window === currentServing.window) return false;
      setTickets((items) => items.map((ticket) => ticket.number === currentServing.number
        ? { ...ticket, status: 'WAITING', window, lastAction: `TRANSFERRED TO ${window}` }
        : ticket));
      return true;
    },
    reopenTicket: (ticketNumber) => {
      const ticket = tickets.find((item) => item.number === ticketNumber);
      if (!ticket || !['HELD', 'SKIPPED', 'NO_SHOW', 'CANCELLED'].includes(ticket.status)) return false;
      setTickets((items) => items.map((item) => item.number === ticketNumber
        ? { ...item, status: 'WAITING', date: undefined, reason: undefined, lastAction: 'REOPENED' }
        : item));
      return true;
    },
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueue() {
  const queue = useContext(QueueContext);
  if (!queue) throw new Error('useQueue must be used within QueueProvider');
  return queue;
}
