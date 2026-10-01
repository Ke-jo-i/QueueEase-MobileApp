import type { TicketEventType, TicketStatus } from '../data/queue-model';

export const ticketStatusLabels: Record<TicketStatus, string> = {
  WAITING: 'Waiting in line', SERVING: 'Your turn', HELD: 'On hold', COMPLETED: 'Completed',
  CANCELLED: 'Cancelled', SKIPPED: 'Skipped', NO_SHOW: 'No-show',
};

export const ticketEventLabels: Record<TicketEventType, string> = {
  CREATED: 'Ticket created', CALLED: 'Number called', RECALLED: 'Number called again',
  HELD: 'Ticket on hold', TRANSFERRED: 'Window changed', REOPENED: 'Returned to queue',
  COMPLETED: 'Ticket completed', CANCELLED: 'Ticket cancelled', SKIPPED: 'Ticket skipped', NO_SHOW: 'Marked as no-show',
};
