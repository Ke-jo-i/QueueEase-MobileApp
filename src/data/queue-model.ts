import { registrarServices } from '../constants/registrar-services';
import { getServiceWindow, registrarWindows } from '../constants/service-windows';

export type TicketStatus = 'WAITING' | 'SERVING' | 'HELD' | 'COMPLETED' | 'CANCELLED' | 'SKIPPED' | 'NO_SHOW';
export type TicketEventType = 'CREATED' | 'CALLED' | 'RECALLED' | 'CHECKED_IN' | 'TRANSFERRED' | 'REOPENED' | Exclude<TicketStatus, 'WAITING' | 'SERVING'>;
export type TicketEvent = { id: string; type: TicketEventType; at: string; window: string; reason?: string };
export type Ticket = {
  id: string;
  sequence: number;
  number: string;
  service: string;
  window: string;
  status: TicketStatus;
  ownerId?: string;
  createdAt: string;
  queueOrder: number;
  date?: string;
  reason?: string;
  events: TicketEvent[];
};
export type HistoryTicket = Ticket & { date: string };
export type QueueSnapshot = { version: 1; tickets: Ticket[]; nextNumber: number; nextQueueOrder: number; assignedWindow: string };
export type QueueCommand =
  | { type: 'BOOK'; ownerId: string; service: string }
  | { type: 'CANCEL'; ownerId: string; reason: string }
  | { type: 'ASSIGN'; window: string }
  | { type: 'CALL_NEXT'; window: string }
  | { type: 'ACT'; window: string; action: 'RECALLED' | 'CHECKED_IN' | 'COMPLETED' | 'HELD' | 'SKIPPED' | 'NO_SHOW'; reason?: string }
  | { type: 'TRANSFER'; window: string; targetWindow: string }
  | { type: 'REOPEN'; number: string };
export type QueueResult = { ok: true; state: QueueSnapshot; ticket?: Ticket } | { ok: false; message: string };

export function isActiveTicket(ticket: Ticket) {
  return ['WAITING', 'SERVING', 'HELD'].includes(ticket.status);
}

export function isHistoryTicket(ticket: Ticket): ticket is HistoryTicket {
  return !['WAITING', 'SERVING'].includes(ticket.status) && !!ticket.date;
}

export function waitingTickets(tickets: Ticket[], window?: string) {
  return tickets.filter((ticket) => ticket.status === 'WAITING' && (!window || ticket.window === window))
    .sort((a, b) => a.queueOrder - b.queueOrder);
}

export function ticketProgress(tickets: Ticket[], ticket: Ticket) {
  const line = waitingTickets(tickets, ticket.window);
  const waitingAhead = line.findIndex((item) => item.id === ticket.id);
  const serving = tickets.find((item) => item.status === 'SERVING' && item.window === ticket.window) ?? null;
  return {
    serving,
    peopleAhead: ticket.status === 'WAITING' ? Math.max(0, waitingAhead) + Number(!!serving) : null,
    nextInLine: ticket.status === 'WAITING' && waitingAhead === 0,
  };
}

function newTicket(sequence: number, service: string, window: string, queueOrder: number, at: string, ownerId?: string): Ticket {
  const id = `ticket-${sequence}`;
  return { id, sequence, number: `R - ${sequence}`, service, window, status: 'WAITING', ownerId, queueOrder, createdAt: at,
    events: [{ id: `${id}:1`, type: 'CREATED', at, window }] };
}

export function createDemoQueue(at: string): QueueSnapshot {
  const tickets = [
    newTicket(102, 'Certificate of Enrollment', registrarWindows[2], 1, at),
    newTicket(103, 'Certificate of Grades', registrarWindows[1], 2, at),
    newTicket(104, 'Academic Records Request', registrarWindows[0], 3, at),
    newTicket(105, 'Enrollment Concern', registrarWindows[2], 4, at),
  ];
  tickets[0] = { ...tickets[0], status: 'SERVING', events: [...tickets[0].events,
    { id: 'ticket-102:2', type: 'CALLED', at, window: registrarWindows[2] }] };
  return { version: 1, tickets, nextNumber: 106, nextQueueOrder: 5, assignedWindow: registrarWindows[0] };
}

export function applyQueueCommand(state: QueueSnapshot, command: QueueCommand, at: string): QueueResult {
  const reject = (message: string): QueueResult => ({ ok: false, message });
  if (command.type === 'ASSIGN') {
    return registrarWindows.includes(command.window)
      ? { ok: true, state: { ...state, assignedWindow: command.window } }
      : reject('Choose a valid registrar window.');
  }
  if (command.type === 'BOOK') {
    if (!command.ownerId.trim() || !registrarServices.includes(command.service)) return reject('Choose a listed registrar service.');
    if (state.tickets.some((ticket) => ticket.ownerId === command.ownerId && isActiveTicket(ticket))) {
      return reject('You already have an active ticket. Check Tickets for its status.');
    }
    const ticket = newTicket(state.nextNumber, command.service, getServiceWindow(command.service), state.nextQueueOrder, at, command.ownerId);
    return { ok: true, ticket, state: { ...state, tickets: [...state.tickets, ticket], nextNumber: state.nextNumber + 1, nextQueueOrder: state.nextQueueOrder + 1 } };
  }

  let ticket: Ticket | undefined;
  let type: TicketEventType;
  let status: TicketStatus;
  let window: string;
  let reason: string | undefined;
  let requeue = false;

  if (command.type === 'CANCEL') {
    ticket = state.tickets.find((item) => item.ownerId === command.ownerId && item.status === 'WAITING');
    reason = command.reason.trim();
    if (!ticket || !reason) return reject('Only waiting tickets can be cancelled, with a reason.');
    type = status = 'CANCELLED';
    window = ticket.window;
  } else if (command.type === 'CALL_NEXT') {
    if (state.tickets.some((item) => item.window === command.window && item.status === 'SERVING')) return reject('Finish the current ticket first.');
    ticket = waitingTickets(state.tickets, command.window)[0];
    if (!ticket) return reject('No tickets are waiting at this window.');
    type = 'CALLED';
    status = 'SERVING';
    window = ticket.window;
  } else if (command.type === 'REOPEN') {
    ticket = state.tickets.find((item) => item.number === command.number);
    if (!ticket || !['HELD', 'SKIPPED', 'NO_SHOW', 'CANCELLED'].includes(ticket.status)) return reject('This ticket cannot be reopened.');
    const { id, ownerId } = ticket;
    if (ownerId && state.tickets.some((item) => item.id !== id && item.ownerId === ownerId && isActiveTicket(item))) {
      return reject('This student already has another active ticket. Finish or cancel it before reopening this one.');
    }
    type = 'REOPENED';
    status = 'WAITING';
    window = ticket.window;
    requeue = true;
  } else {
    ticket = state.tickets.find((item) => item.window === command.window && item.status === 'SERVING');
    if (!ticket) return reject('There is no current ticket at this window.');
    window = ticket.window;
    if (command.type === 'TRANSFER') {
      if (!registrarWindows.includes(command.targetWindow) || command.targetWindow === ticket.window) return reject('Choose a different registrar window.');
      type = 'TRANSFERRED';
      status = 'WAITING';
      window = command.targetWindow;
      reason = `From ${ticket.window}`;
      requeue = true;
    } else {
      type = command.action;
      status = command.action === 'RECALLED' || command.action === 'CHECKED_IN' ? 'SERVING' : command.action;
      if (command.action === 'CHECKED_IN' && ticket.events.slice(ticket.events.map((event) => event.type).lastIndexOf('CALLED')).some((event) => event.type === 'CHECKED_IN')) return reject('Arrival is already confirmed at this window.');
      reason = command.reason?.trim() || undefined;
      if (['HELD', 'SKIPPED', 'NO_SHOW'].includes(status) && !reason) return reject('Please provide a reason.');
    }
  }
  const updated: Ticket = {
    ...ticket, status, window, reason,
    date: ['WAITING', 'SERVING'].includes(status) ? undefined : at,
    queueOrder: requeue ? state.nextQueueOrder : ticket.queueOrder,
    events: [...ticket.events, { id: `${ticket.id}:${ticket.events.length + 1}`, type, at, window, reason }],
  };
  return { ok: true, ticket: updated, state: { ...state,
    nextQueueOrder: state.nextQueueOrder + Number(requeue),
    tickets: state.tickets.map((item) => item.id === updated.id ? updated : item),
  } };
}

const statuses: TicketStatus[] = ['WAITING', 'SERVING', 'HELD', 'COMPLETED', 'CANCELLED', 'SKIPPED', 'NO_SHOW'];
const eventTypes: TicketEventType[] = ['CREATED', 'CALLED', 'RECALLED', 'CHECKED_IN', 'TRANSFERRED', 'REOPENED', 'HELD', 'COMPLETED', 'CANCELLED', 'SKIPPED', 'NO_SHOW'];
const eventStatus: Record<TicketEventType, TicketStatus> = {
  CREATED: 'WAITING', CALLED: 'SERVING', RECALLED: 'SERVING', CHECKED_IN: 'SERVING', TRANSFERRED: 'WAITING', REOPENED: 'WAITING',
  HELD: 'HELD', COMPLETED: 'COMPLETED', CANCELLED: 'CANCELLED', SKIPPED: 'SKIPPED', NO_SHOW: 'NO_SHOW',
};
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function positiveInteger(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0; }
function timestamp(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function knownWindow(value: unknown): value is string { return typeof value === 'string' && registrarWindows.includes(value); }
function optionalString(value: unknown) { return value === undefined || typeof value === 'string'; }

function validTicket(value: unknown): value is Ticket {
  if (!record(value) || !positiveInteger(value.sequence) || value.id !== `ticket-${value.sequence}` || value.number !== `R - ${value.sequence}`
    || typeof value.service !== 'string' || !registrarServices.includes(value.service) || !knownWindow(value.window)
    || !statuses.includes(value.status as TicketStatus) || !positiveInteger(value.queueOrder) || !timestamp(value.createdAt)
    || !optionalString(value.ownerId) || !optionalString(value.reason) || !Array.isArray(value.events) || !value.events.length) return false;
  if (['WAITING', 'SERVING'].includes(String(value.status)) ? value.date !== undefined : !timestamp(value.date)) return false;
  if (!value.events.every((event, index) => record(event) && event.id === `${value.id}:${index + 1}`
    && eventTypes.includes(event.type as TicketEventType) && timestamp(event.at) && knownWindow(event.window) && optionalString(event.reason))) return false;
  const first = value.events[0];
  const last = value.events[value.events.length - 1];
  return first.type === 'CREATED' && first.at === value.createdAt && last.window === value.window
    && eventStatus[last.type as TicketEventType] === value.status && (value.date === undefined || value.date === last.at);
}

export function decodeQueueSnapshot(raw: string): QueueSnapshot {
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.version !== 1 || !positiveInteger(value.nextNumber) || !positiveInteger(value.nextQueueOrder)
    || !knownWindow(value.assignedWindow) || !Array.isArray(value.tickets) || !value.tickets.every(validTicket)) throw new Error('Unsupported or invalid queue data');
  const tickets = value.tickets;
  const ids = new Set<string>();
  const orders = new Set<number>();
  const servingWindows = new Set<string>();
  const activeOwners = new Set<string>();
  for (const ticket of tickets) {
    if (ids.has(ticket.id) || orders.has(ticket.queueOrder) || ticket.sequence >= value.nextNumber || ticket.queueOrder >= value.nextQueueOrder
      || (ticket.status === 'SERVING' && servingWindows.has(ticket.window))
      || (ticket.ownerId && isActiveTicket(ticket) && activeOwners.has(ticket.ownerId))) throw new Error('Conflicting queue records');
    ids.add(ticket.id);
    orders.add(ticket.queueOrder);
    if (ticket.status === 'SERVING') servingWindows.add(ticket.window);
    if (ticket.ownerId && isActiveTicket(ticket)) activeOwners.add(ticket.ownerId);
  }
  return { version: 1, tickets, nextNumber: value.nextNumber, nextQueueOrder: value.nextQueueOrder, assignedWindow: value.assignedWindow };
}
