import { expect, test } from '@playwright/test';
import { applyQueueCommand, createDemoQueue, decodeQueueSnapshot, isActiveTicket, QueueCommand, QueueSnapshot, ticketProgress, waitingTickets } from '../src/data/queue-model';

const time = '2026-10-02T01:00:00.000Z';
const window1 = 'Window 1 - Registrar';
const window3 = 'Window 3 - Registrar';
const window4 = 'Window 4 - Registrar';

function execute(state: QueueSnapshot, command: QueueCommand) {
  const result = applyQueueCommand(state, command, time);
  if (!result.ok) throw new Error(result.message);
  return result.state;
}

test('booking keeps one active ticket per student and allocates distinct numbers', () => {
  const initial = createDemoQueue(time);
  const booked = execute(initial, { type: 'BOOK', ownerId: 'student-a', service: 'Student Record Update' });
  expect(booked.nextNumber).toBe(107);
  expect(initial.tickets).toHaveLength(4);
  const duplicate = applyQueueCommand(booked, { type: 'BOOK', ownerId: 'student-a', service: 'Academic Records Request' }, time);
  expect(duplicate.ok).toBe(false);
  const next = execute(booked, { type: 'BOOK', ownerId: 'student-b', service: 'Student Record Update' });
  expect(next.tickets.slice(-2).map((ticket) => ticket.number)).toEqual(['R - 106', 'R - 107']);
});

test('people ahead counts only the same window and completing does not call next', () => {
  let state = execute(createDemoQueue(time), { type: 'BOOK', ownerId: 'student-a', service: 'Certificate of Enrollment' });
  const ticket = state.tickets.at(-1)!;
  expect(ticketProgress(state.tickets, ticket)).toMatchObject({ peopleAhead: 2, nextInLine: false });
  state = execute(state, { type: 'ACT', window: window3, action: 'COMPLETED' });
  expect(state.tickets.some((item) => item.status === 'SERVING')).toBe(false);
  expect(ticketProgress(state.tickets, ticket).peopleAhead).toBe(1);
  state = execute(state, { type: 'CALL_NEXT', window: window3 });
  expect(state.tickets.find((item) => item.status === 'SERVING')?.number).toBe('R - 105');
  expect(ticketProgress(state.tickets, ticket)).toMatchObject({ peopleAhead: 1, nextInLine: true });
});

test('held tickets remain active and reopening keeps the activity trail', () => {
  let state = execute(createDemoQueue(time), { type: 'BOOK', ownerId: 'student-a', service: 'Student Record Update' });
  state = execute(state, { type: 'CALL_NEXT', window: window4 });
  state = execute(state, { type: 'ACT', window: window4, action: 'HELD', reason: 'Missing document' });
  const held = state.tickets.at(-1)!;
  expect(isActiveTicket(held)).toBe(true);
  expect(ticketProgress(state.tickets, held).peopleAhead).toBeNull();
  expect(applyQueueCommand(state, { type: 'BOOK', ownerId: 'student-a', service: 'Student Record Update' }, time).ok).toBe(false);
  state = execute(state, { type: 'BOOK', ownerId: 'student-b', service: 'Student Record Update' });
  state = execute(state, { type: 'REOPEN', number: 'R - 106' });
  expect(waitingTickets(state.tickets, window4).map((ticket) => ticket.number)).toEqual(['R - 107', 'R - 106']);
  expect(state.tickets.find((ticket) => ticket.number === 'R - 106')?.events.map((event) => event.type)).toEqual(['CREATED', 'CALLED', 'HELD', 'REOPENED']);
  expect(decodeQueueSnapshot(JSON.stringify(state))).toEqual(state);
});

test('transfers join the tail of the destination window without changing ticket identity', () => {
  let state = execute(createDemoQueue(time), { type: 'BOOK', ownerId: 'student-a', service: 'Student Record Update' });
  state = execute(state, { type: 'CALL_NEXT', window: window4 });
  expect(applyQueueCommand(state, { type: 'TRANSFER', window: window4, targetWindow: window4 }, time).ok).toBe(false);
  state = execute(state, { type: 'TRANSFER', window: window4, targetWindow: window1 });
  expect(waitingTickets(state.tickets, window1).map((ticket) => ticket.number)).toEqual(['R - 104', 'R - 106']);
  const transferred = state.tickets.at(-1)!;
  expect(transferred.id).toBe('ticket-106');
  expect(transferred.events.at(-1)).toMatchObject({ type: 'TRANSFERRED', window: window1, reason: `From ${window4}` });
});

test('reopening a past ticket cannot create a second active ticket', () => {
  let state = execute(createDemoQueue(time), { type: 'BOOK', ownerId: 'student-a', service: 'Student Record Update' });
  state = execute(state, { type: 'CANCEL', ownerId: 'student-a', reason: 'Wrong service' });
  state = execute(state, { type: 'BOOK', ownerId: 'student-a', service: 'Academic Records Request' });
  const result = applyQueueCommand(state, { type: 'REOPEN', number: 'R - 106' }, time);
  expect(result.ok).toBe(false);
  expect(state.tickets.filter((ticket) => ticket.ownerId === 'student-a' && isActiveTicket(ticket))).toHaveLength(1);
});

test('restoring rejects corrupt, unsupported, or conflicting data', () => {
  const state = createDemoQueue(time);
  expect(() => decodeQueueSnapshot('{broken')).toThrow();
  expect(() => decodeQueueSnapshot(JSON.stringify({ ...state, version: 99 }))).toThrow();
  expect(() => decodeQueueSnapshot(JSON.stringify({ ...state, nextNumber: 102 }))).toThrow();
  expect(() => decodeQueueSnapshot(JSON.stringify({ ...state, tickets: [...state.tickets, state.tickets[0]] }))).toThrow();
  expect(decodeQueueSnapshot(JSON.stringify(state))).toEqual(state);
});
