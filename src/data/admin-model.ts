import type { Ticket } from './queue-model';

export type AdminAccount = {
  id: string;
  login: string;
  email: string;
  name: string;
  role: 'student' | 'staff' | 'admin';
  active: number;
  window: string | null;
  activeSessions: number;
};

export type AdminService = { name: string; window: string; enabled: number };
export type AdminAudit = {
  id: string;
  actorId: string;
  actorLogin: string;
  actorName: string;
  action: string;
  target: string;
  details: Record<string, string | number | boolean | null>;
  at: string;
};

export type AdminStatistics = {
  date: string;
  requestedToday: number;
  completedToday: number;
  cancelledToday: number;
  noShowsToday: number;
  waiting: number;
  serving: number;
  held: number;
  activeAccounts: number;
  staffedWindows: number;
  activeSessions: number;
  averageWaitMinutes: number | null;
  averageServiceMinutes: number | null;
};

export type AdminWindow = {
  window: string;
  staff: AdminAccount | null;
  waiting: number;
  serving: number;
  held: number;
  completedToday: number;
};

export type AdminOverviewData = {
  revision: number;
  acceptingTickets: boolean;
  statistics: AdminStatistics;
  windows: AdminWindow[];
};

export type AdminData = AdminOverviewData & {
  accounts: AdminAccount[];
  services: AdminService[];
  records: Ticket[];
  counts: { status: string; count: number }[];
  audit: AdminAudit[];
};

export type AdminHistoryPage = { records: Ticket[]; total: number; page: number; pageSize: number };
export type AdminAuditPage = { audit: AdminAudit[]; total: number; page: number; pageSize: number };
