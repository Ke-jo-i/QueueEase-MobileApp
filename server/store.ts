import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { registrarServices } from '../src/constants/registrar-services';
import { getServiceWindow, registrarWindows } from '../src/constants/service-windows';
import { applyQueueCommand, type Ticket, type QueueCommand, type QueueSnapshot } from '../src/data/queue-model';
import type { AdminAccount, AdminAudit, AdminData, AdminOverviewData, AdminHistoryPage, AdminAuditPage, AdminService } from '../src/data/admin-model';

const derive = promisify(scrypt);
export type Role = 'student' | 'staff' | 'admin';
export type Account = { id: string; login: string; email: string; name: string; role: Role; active: number; window: string | null };
type AccountRow = Account & { password_hash: string };
export class RequestError extends Error { constructor(public status: number, message: string) { super(message); } }
export function check(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) throw new RequestError(status, message);
}
export function field(value: unknown, label: string, max = 120) {
  check(typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max, `Enter a valid ${label}.`);
  return value.trim();
}
export function password(value: unknown) {
  check(typeof value === 'string' && value.length >= 10 && value.length <= 128, 'Use a password with 10–128 characters.');
  return value;
}
async function hashPassword(value: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(value, salt, 64) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}
async function matches(value: string, encoded: string) {
  const [salt, digest] = encoded.split(':');
  const key = await derive(value, salt, 64) as Buffer;
  return timingSafeEqual(key, Buffer.from(digest, 'hex'));
}
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const publicAccount = ({ id, login, email, name, role, active, window }: Account): Account => ({ id, login, email, name, role, active, window });
const statuses = ['WAITING', 'SERVING', 'HELD', 'COMPLETED', 'CANCELLED', 'SKIPPED', 'NO_SHOW'];
const day = (value: string) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const averageMinutes = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length / 6000) / 10 : null;
function accountFields(input: Record<string, unknown>) {
  const name = field(input.name, 'full name', 80);
  const login = field(input.login, 'ID', 40).toLowerCase();
  const email = validEmail(input.email);
  check(/^[a-z0-9][a-z0-9._-]{2,39}$/.test(login), 'Use 3–40 letters, numbers, dots, underscores or dashes for your ID.');
  return { name, login, email };
}
function validEmail(value: unknown) {
  const email = field(value, 'email', 160).toLowerCase();
  check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a valid email address.');
  return email;
}
function pageFields(input: Record<string, unknown>) {
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined || value === '') return fallback;
    const number = Number(value);
    check(Number.isInteger(number) && number >= 1 && number <= max, 'Choose a valid page and page size.');
    return number;
  };
  return { page: integer(input.page, 1, 1000000), pageSize: integer(input.pageSize, 25, 100) };
}
function dateField(value: unknown, label: string) {
  if (value === undefined || value === '') return undefined;
  const date = field(value, label, 10);
  const parsed = new Date(`${date}T00:00:00Z`);
  check(/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date, `Enter a valid ${label}.`);
  return date;
}

export class Store {
  db: DatabaseSync;
  private dummyHash = hashPassword(randomBytes(24).toString('hex'));
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
    for (const name of registrarServices) this.db.prepare('INSERT OR IGNORE INTO services(name,window) VALUES(?,?)').run(name, getServiceWindow(name));
  }
  close() { this.db.close(); }
  transaction<T>(operation: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = operation(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  async createAccount(input: Record<string, unknown>, role: Role = 'student') {
    const values = accountFields(input);
    const hash = await hashPassword(password(input.password));
    return this.insertAccount(values, role, hash);
  }
  private insertAccount(values: ReturnType<typeof accountFields>, role: Role, hash: string, window: string | null = null) {
    const id = randomUUID();
    try { this.db.prepare('INSERT INTO accounts(id,login,email,name,role,password_hash,created_at,window) VALUES(?,?,?,?,?,?,?,?)')
      .run(id, values.login, values.email, values.name, role, hash, new Date().toISOString(), window); }
    catch (error) { if (String(error).includes('UNIQUE')) throw new RequestError(409, 'That ID or email is already registered.'); throw error; }
    return this.account(id);
  }
  account(id: string): Account {
    const row = this.db.prepare('SELECT * FROM accounts WHERE id=?').get(id) as AccountRow | undefined;
    check(row, 'Account not found.', 404);
    return publicAccount(row);
  }
  async login(input: Record<string, unknown>) {
    const login = field(input.login, 'ID or email', 160).toLowerCase();
    check(typeof input.password === 'string' && input.password.length <= 128, 'Enter your password.');
    const row = this.db.prepare('SELECT * FROM accounts WHERE login=? OR email=?').get(login, login) as AccountRow | undefined;
    const valid = await matches(input.password, row?.password_hash ?? await this.dummyHash);
    check(valid && row?.active, 'Incorrect ID or password, or account unavailable.', 401);
    const latest = this.db.prepare('SELECT active,password_hash FROM accounts WHERE id=?').get(row.id)!;
    check(latest.active && latest.password_hash === row.password_hash, 'Account credentials changed. Please try again.', 401);
    check(input.portal === 'student' ? row.role === 'student' : input.portal === 'staff' && row.role !== 'student', 'Use the correct portal for this account.', 403);
    if (row.role === 'staff' && !row.window) {
      const occupied = this.db.prepare("SELECT window FROM accounts WHERE role='staff' AND active=1 AND window IS NOT NULL").all().map((item) => item.window);
      const window = registrarWindows.find((item) => !occupied.includes(item));
      if (window) this.db.prepare('UPDATE accounts SET window=? WHERE id=?').run(window, row.id);
    }
    const token = randomBytes(32).toString('hex');
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(tokenHash(token), row.id, Date.now() + 12 * 60 * 60 * 1000);
    return { token, user: this.account(row.id) };
  }
  authenticate(token: string) {
    const row = this.db.prepare('SELECT a.* FROM accounts a JOIN sessions s ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? AND a.active=1')
      .get(tokenHash(token), Date.now()) as AccountRow | undefined;
    check(row, 'Your session has ended. Please sign in again.', 401);
    return publicAccount(row);
  }
  logout(token: string) { this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token)); }
  async changePassword(user: Account, input: Record<string, unknown>, token?: string) {
    const requireSession = () => {
      const current = token === undefined ? this.account(user.id) : this.authenticate(token);
      check(current.id === user.id && current.active, 'Your session has ended. Please sign in again.', 401);
    };
    requireSession();
    const row = this.db.prepare('SELECT password_hash FROM accounts WHERE id=?').get(user.id) as { password_hash: string };
    check(typeof input.currentPassword === 'string' && input.currentPassword.length <= 128 && await matches(input.currentPassword, row.password_hash), 'Current password is incorrect.', 403);
    const hash = await hashPassword(password(input.newPassword));
    this.transaction(() => {
      requireSession();
      const latest = this.db.prepare('SELECT password_hash FROM accounts WHERE id=?').get(user.id) as { password_hash: string };
      check(latest.password_hash === row.password_hash, 'Account credentials changed. Please sign in again.', 409);
      this.db.prepare('UPDATE accounts SET password_hash=? WHERE id=?').run(hash, user.id);
      this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(user.id);
    });
  }
  services() { return this.db.prepare('SELECT name,window,enabled FROM services ORDER BY rowid').all(); }
  snapshot(): QueueSnapshot {
    const state = this.db.prepare('SELECT * FROM queue_state WHERE id=1').get()!;
    const events = this.db.prepare('SELECT * FROM ticket_events ORDER BY rowid').all();
    const timelines = new Map<string, typeof events>();
    for (const event of events) {
      const key = String(event.ticket_id);
      const timeline = timelines.get(key) ?? [];
      timeline.push(event); timelines.set(key, timeline);
    }
    const tickets = this.db.prepare('SELECT * FROM tickets ORDER BY sequence').all().map((row) => ({
      id: row.id, sequence: row.sequence, number: row.number, service: row.service, window: row.window, status: row.status,
      ownerId: row.owner_id, createdAt: row.created_at, queueOrder: row.queue_order, date: row.finished_at ?? undefined, reason: row.reason ?? undefined,
      events: (timelines.get(String(row.id)) ?? []).map((event) => ({ id: event.id, type: event.type, at: event.at, window: event.window, reason: event.reason ?? undefined })),
    })) as Ticket[];
    return { version: 1, tickets, nextNumber: Number(state.next_number), nextQueueOrder: Number(state.next_order), assignedWindow: registrarWindows[0] };
  }
  view(user: Account) {
    const state = this.db.prepare('SELECT revision,accepting FROM queue_state WHERE id=1').get()!;
    const tickets = this.snapshot().tickets.filter((ticket) => user.role !== 'student' || ticket.ownerId === user.id || ['WAITING', 'SERVING'].includes(ticket.status))
      .map((ticket) => user.role === 'student' && ticket.ownerId !== user.id
        ? { ...ticket, ownerId: undefined, events: [], reason: undefined }
        : { ...ticket, ownerId: this.account(ticket.ownerId!).login });
    return { tickets, assignedWindow: this.account(user.id).window ?? '', services: this.services(), acceptingTickets: !!state.accepting, revision: Number(state.revision) };
  }
  command(user: Account, input: Record<string, unknown>, requestId: string) {
    check(requestId.length >= 8 && requestId.length <= 120, 'A request identifier is required.');
    return this.transaction(() => {
      const prior = this.db.prepare('SELECT ticket_id FROM requests WHERE account_id=? AND request_id=?').get(user.id, requestId);
      if (prior) return { ...this.view(user), ticketId: prior.ticket_id };
      const state = this.snapshot();
      const at = new Date().toISOString();
      const freshUser = this.account(user.id);
      let command: QueueCommand;
      if (input.type === 'BOOK' || input.type === 'CANCEL') {
        check(user.role === 'student', 'Only students can request or cancel their own ticket.', 403);
        if (input.type === 'BOOK') {
          const service = field(input.service, 'service');
          const configured = this.db.prepare('SELECT * FROM services WHERE name=? AND enabled=1').get(service);
          check(configured, 'This service is currently unavailable.');
          check(this.db.prepare('SELECT accepting FROM queue_state WHERE id=1').get()!.accepting, 'New tickets are paused. Please check again later.', 409);
          command = { type: 'BOOK', service, ownerId: user.id };
        } else {
          if (input.expectedTicketId !== undefined) check(state.tickets.some(ticket => ticket.id === input.expectedTicketId && ticket.ownerId === user.id && ['WAITING', 'HELD'].includes(ticket.status)), 'This ticket has changed. Refresh and try again.', 409);
          command = { type: 'CANCEL', ownerId: user.id, reason: field(input.reason, 'reason', 300) };
        }
      } else {
        check(user.role === 'staff', 'Staff access is required.', 403);
        if (input.type === 'ASSIGN') {
          const window = field(input.window, 'window');
          check(registrarWindows.includes(window), 'Choose a listed registrar window.');
          check(!this.db.prepare('SELECT id FROM accounts WHERE window=? AND id!=? AND active=1').get(window, user.id), 'Another staff member is assigned to that window.', 409);
          check(!state.tickets.some((ticket) => ticket.window === freshUser.window && ticket.status === 'SERVING'), 'Finish or transfer your current ticket before changing windows.', 409);
          this.db.prepare('UPDATE accounts SET window=? WHERE id=?').run(window, user.id);
          this.db.prepare('UPDATE queue_state SET revision=revision+1 WHERE id=1').run();
          return { ...this.view(user), ticketId: undefined };
        }
        check(freshUser.window, 'Select an available window in Profile first.', 409);
        const window = freshUser.window;
        if (input.type === 'CALL_NEXT') command = { type: 'CALL_NEXT', window };
        else if (input.type === 'REOPEN') {
          const number = field(input.number, 'ticket number');
          check(state.tickets.some((ticket) => ticket.number === number && ticket.window === window), 'Only the assigned window can reopen this ticket.', 403);
          command = { type: 'REOPEN', number };
        } else {
          const current = state.tickets.find((ticket) => ticket.status === 'SERVING' && ticket.window === window);
          check(current && current.id === input.expectedTicketId, 'This ticket has changed. Refresh and try again.', 409);
          if (input.type === 'TRANSFER') command = { type: 'TRANSFER', window, targetWindow: field(input.targetWindow, 'target window') };
          else {
            check(input.type === 'ACT' && ['RECALLED', 'CHECKED_IN', 'COMPLETED', 'HELD', 'SKIPPED', 'NO_SHOW'].includes(String(input.action)), 'Unknown queue action.');
            command = { type: 'ACT', window, action: input.action as 'COMPLETED', reason: input.reason === undefined ? undefined : field(input.reason, 'reason', 300) };
          }
        }
      }
      const result = applyQueueCommand(state, command, at, this.services().filter(service => service.enabled).map(service => ({ name: String(service.name), window: String(service.window) })));
      check(result.ok, result.ok ? '' : result.message, 409);
      const ticket = result.ticket!;
      this.db.prepare(`INSERT INTO tickets VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
        window=excluded.window,status=excluded.status,queue_order=excluded.queue_order,finished_at=excluded.finished_at,reason=excluded.reason`)
        .run(ticket.id, ticket.sequence, ticket.number, ticket.service, ticket.window, ticket.status, ticket.ownerId!, ticket.createdAt, ticket.queueOrder, ticket.date ?? null, ticket.reason ?? null);
      const event = ticket.events[ticket.events.length - 1];
      this.db.prepare('INSERT INTO ticket_events VALUES(?,?,?,?,?,?,?)').run(event.id, ticket.id, event.type, event.at, event.window, event.reason ?? null, user.id);
      this.db.prepare('UPDATE queue_state SET next_number=?,next_order=?,revision=revision+1 WHERE id=1').run(result.state.nextNumber, result.state.nextQueueOrder);
      this.db.prepare('INSERT INTO requests VALUES(?,?,?,?)').run(user.id, requestId, ticket.id, Date.now());
      this.db.prepare('DELETE FROM requests WHERE created_at < ?').run(Date.now() - 86400000);
      return { ...this.view(user), ticketId: ticket.id };
    });
  }
  private requireAdmin(user: Account, token?: string) {
    const current = token === undefined ? this.account(user.id) : this.authenticate(token);
    check(current.id === user.id && current.active && current.role === 'admin', 'Administrator access is required.', 403);
    return current;
  }
  private audit(user: Account, action: string, target: string, details: AdminAudit['details']) {
    this.db.prepare('INSERT INTO admin_audit(id,actor_id,action,target,details,at) VALUES(?,?,?,?,?,?)')
      .run(randomUUID(), user.id, action, target, JSON.stringify(details), new Date().toISOString());
  }
  private availableWindow(window: unknown, id?: string) {
    const selected = field(window, 'window');
    check(registrarWindows.includes(selected), 'Choose a listed registrar window.');
    check(!this.db.prepare('SELECT id FROM accounts WHERE window=? AND id!=?').get(selected, id ?? ''), 'Another staff member is assigned to that window.', 409);
    return selected;
  }
  private idleWindow(staff: Account) {
    check(!staff.window || !this.db.prepare("SELECT id FROM tickets WHERE window=? AND status='SERVING'").get(staff.window), 'Finish or transfer the current ticket before changing this window assignment.', 409);
  }
  private readAdminRecords(where = '', values: SQLInputValue[] = [], limit?: number, offset = 0): Ticket[] {
    const rows = this.db.prepare(`SELECT t.*,a.login AS owner_login FROM tickets t JOIN accounts a ON a.id=t.owner_id ${where}
      ORDER BY t.sequence DESC ${limit === undefined ? '' : 'LIMIT ? OFFSET ?'}`)
      .all(...values, ...(limit === undefined ? [] : [limit, offset]));
    const events = this.db.prepare('SELECT id,type,at,window,reason FROM ticket_events WHERE ticket_id=? ORDER BY rowid');
    return rows.map(row => ({
      id: row.id, sequence: row.sequence, number: row.number, service: row.service, window: row.window, status: row.status,
      ownerId: row.owner_login, createdAt: row.created_at, queueOrder: row.queue_order, date: row.finished_at ?? undefined, reason: row.reason ?? undefined,
      events: events.all(row.id).map(event => ({ id: event.id, type: event.type, at: event.at, window: event.window, reason: event.reason ?? undefined })),
    })) as Ticket[];
  }
  private readAdminAudit(where = '', values: SQLInputValue[] = [], limit = 100, offset = 0): AdminAudit[] {
    return this.db.prepare(`SELECT j.*,a.login AS actor_login,a.name AS actor_name FROM admin_audit j JOIN accounts a ON a.id=j.actor_id
      ${where} ORDER BY j.rowid DESC LIMIT ? OFFSET ?`).all(...values, limit, offset).map(row => ({
      id: String(row.id), actorId: String(row.actor_id), actorLogin: String(row.actor_login), actorName: String(row.actor_name),
      action: String(row.action), target: String(row.target), details: JSON.parse(String(row.details)), at: String(row.at),
    }));
  }
  adminOverview(): AdminOverviewData {
    const now = Date.now();
    const accounts = this.db.prepare(`SELECT a.id,a.login,a.email,a.name,a.role,a.active,a.window,
      (SELECT COUNT(*) FROM sessions s WHERE s.account_id=a.id AND s.expires_at>?) AS activeSessions FROM accounts a ORDER BY a.created_at`).all(now) as AdminAccount[];
    const today = day(new Date(now).toISOString());
    const start = new Date(`${today}T00:00:00`);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const bounds = [start.toISOString(), end.toISOString()];
    const completed = this.db.prepare("SELECT id,created_at FROM tickets WHERE status='COMPLETED' AND finished_at>=? AND finished_at<?").all(...bounds);
    const events = this.db.prepare("SELECT e.* FROM ticket_events e JOIN tickets t ON t.id=e.ticket_id WHERE t.status='COMPLETED' AND t.finished_at>=? AND t.finished_at<? ORDER BY e.rowid").all(...bounds);
    const timelines = new Map<string, typeof events>();
    for (const event of events) {
      const key = String(event.ticket_id);
      const timeline = timelines.get(key) ?? [];
      timeline.push(event); timelines.set(key, timeline);
    }
    const waits: number[] = [];
    const durations: number[] = [];
    for (const ticket of completed) {
      const timeline = timelines.get(String(ticket.id)) ?? [];
      const firstCall = timeline.find(event => event.type === 'CALLED');
      const lastCompletion = timeline.findLastIndex(event => event.type === 'COMPLETED');
      const finalCall = timeline.slice(0, lastCompletion).findLast(event => event.type === 'CALLED');
      if (firstCall) waits.push(Math.max(0, Date.parse(String(firstCall.at)) - Date.parse(String(ticket.created_at))));
      if (finalCall && lastCompletion >= 0) durations.push(Math.max(0, Date.parse(String(timeline[lastCompletion].at)) - Date.parse(String(finalCall.at))));
    }
    const loads = this.db.prepare(`SELECT window,status,COUNT(*) AS count FROM tickets WHERE status IN ('WAITING','SERVING','HELD') OR (finished_at>=? AND finished_at<?) GROUP BY window,status`).all(...bounds);
    const count = (status: string, window?: string) => loads.filter(row => row.status === status && (!window || row.window === window)).reduce((total, row) => total + Number(row.count), 0);
    const state = this.db.prepare('SELECT accepting,revision FROM queue_state WHERE id=1').get()!;
    return {
      revision: Number(state.revision), acceptingTickets: !!state.accepting,
      statistics: {
        date: today, requestedToday: Number(this.db.prepare('SELECT COUNT(*) AS count FROM tickets WHERE created_at>=? AND created_at<?').get(...bounds)!.count),
        completedToday: completed.length, cancelledToday: count('CANCELLED'), noShowsToday: count('NO_SHOW'),
        waiting: count('WAITING'), serving: count('SERVING'), held: count('HELD'), activeAccounts: accounts.filter(account => account.active).length,
        staffedWindows: accounts.filter(account => account.active && account.role === 'staff' && account.window).length,
        activeSessions: accounts.filter(account => account.active).reduce((total, account) => total + account.activeSessions, 0),
        averageWaitMinutes: averageMinutes(waits), averageServiceMinutes: averageMinutes(durations),
      },
      windows: registrarWindows.map(window => ({
        window, staff: accounts.find(account => account.active && account.role === 'staff' && account.window === window) ?? null,
        waiting: count('WAITING', window), serving: count('SERVING', window), held: count('HELD', window), completedToday: count('COMPLETED', window),
      })),
    };
  }
  adminView(): AdminData {
    const now = Date.now();
    return {
      ...this.adminOverview(),
      accounts: this.db.prepare(`SELECT a.id,a.login,a.email,a.name,a.role,a.active,a.window,
        (SELECT COUNT(*) FROM sessions s WHERE s.account_id=a.id AND s.expires_at>?) AS activeSessions FROM accounts a ORDER BY a.created_at`).all(now) as AdminAccount[],
      services: this.services() as AdminService[], records: this.readAdminRecords(),
      counts: this.db.prepare('SELECT status,COUNT(*) AS count FROM tickets GROUP BY status').all() as AdminData['counts'],
      audit: this.readAdminAudit(),
    };
  }
  adminHistory(user: Account, input: Record<string, unknown>): AdminHistoryPage {
    this.requireAdmin(user);
    const { page, pageSize } = pageFields(input);
    const clauses: string[] = [];
    const values: SQLInputValue[] = [];
    if (input.status !== undefined && input.status !== '') {
      check(statuses.includes(String(input.status)), 'Choose a valid ticket status.');
      clauses.push('t.status=?'); values.push(String(input.status));
    }
    if (input.window !== undefined && input.window !== '') {
      check(registrarWindows.includes(String(input.window)), 'Choose a listed registrar window.');
      clauses.push('t.window=?'); values.push(String(input.window));
    }
    if (input.service !== undefined && input.service !== '') {
      const service = field(input.service, 'service');
      check(this.db.prepare('SELECT name FROM services WHERE name=?').get(service), 'Choose a listed registrar service.');
      clauses.push('t.service=?'); values.push(service);
    }
    if (input.search !== undefined && input.search !== '') {
      const query = field(input.search, 'search', 100).replace(/[\\%_]/g, '\\$&');
      clauses.push("(t.number LIKE ? ESCAPE '\\' OR a.login LIKE ? ESCAPE '\\' OR a.name LIKE ? ESCAPE '\\')");
      values.push(...Array<SQLInputValue>(3).fill(`%${query}%`));
    }
    const from = dateField(input.from, 'start date');
    const to = dateField(input.to, 'end date');
    check(!from || !to || from <= to, 'The start date must come before the end date.');
    if (from) { clauses.push('t.created_at>=?'); values.push(new Date(`${from}T00:00:00`).toISOString()); }
    if (to) {
      const end = new Date(`${to}T00:00:00`); end.setDate(end.getDate() + 1);
      clauses.push('t.created_at<?'); values.push(end.toISOString());
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const total = Number(this.db.prepare(`SELECT COUNT(*) AS total FROM tickets t JOIN accounts a ON a.id=t.owner_id ${where}`).get(...values)!.total);
    return { records: this.readAdminRecords(where, values, pageSize, (page - 1) * pageSize), total, page, pageSize };
  }
  adminAudit(user: Account, input: Record<string, unknown>): AdminAuditPage {
    this.requireAdmin(user);
    const { page, pageSize } = pageFields(input);
    const clauses: string[] = [];
    const values: SQLInputValue[] = [];
    if (input.action !== undefined && input.action !== '') { clauses.push('j.action=?'); values.push(field(input.action, 'action', 40)); }
    if (input.search !== undefined && input.search !== '') {
      const query = field(input.search, 'search', 100).replace(/[\\%_]/g, '\\$&');
      clauses.push("(j.target LIKE ? ESCAPE '\\' OR a.login LIKE ? ESCAPE '\\' OR a.name LIKE ? ESCAPE '\\')");
      values.push(...Array<SQLInputValue>(3).fill(`%${query}%`));
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const total = Number(this.db.prepare(`SELECT COUNT(*) AS total FROM admin_audit j JOIN accounts a ON a.id=j.actor_id ${where}`).get(...values)!.total);
    return { audit: this.readAdminAudit(where, values, pageSize, (page - 1) * pageSize), total, page, pageSize };
  }
  async adminAction(user: Account, input: Record<string, unknown>, token?: string) {
    this.requireAdmin(user, token);
    let prepared: { values: ReturnType<typeof accountFields>; role: 'staff' | 'admin'; hash: string } | undefined;
    let resetHash: string | undefined;
    if (input.type === 'CREATE_STAFF' || input.type === 'CREATE_ACCOUNT') {
      const role = input.type === 'CREATE_STAFF' ? 'staff' : input.role;
      check(role === 'staff' || role === 'admin', 'Choose a staff or administrator account.');
      const values = accountFields(input);
      prepared = { values, role, hash: await hashPassword(password(input.password)) };
    } else if (input.type === 'RESET_PASSWORD') {
      check(field(input.id, 'account') !== user.id, 'Change your own password in Profile.');
      resetHash = await hashPassword(password(input.password));
    }
    this.transaction(() => {
      const actor = this.requireAdmin(user, token);
      if (prepared) {
        check(prepared.role === 'staff' || !input.window, 'Administrator accounts do not have a window assignment.');
        const window = input.window ? this.availableWindow(input.window) : null;
        const account = this.insertAccount(prepared.values, prepared.role, prepared.hash, window);
        this.audit(actor, 'CREATE_ACCOUNT', account.login, { role: account.role, window });
      } else if (input.type === 'UPDATE_ACCOUNT') {
        const account = this.account(field(input.id, 'account'));
        const name = field(input.name, 'full name', 80);
        const email = validEmail(input.email);
        try { this.db.prepare('UPDATE accounts SET name=?,email=? WHERE id=?').run(name, email, account.id); }
        catch (error) { if (String(error).includes('UNIQUE')) throw new RequestError(409, 'That email is already registered.'); throw error; }
        this.audit(actor, 'UPDATE_ACCOUNT', account.login, { name, email });
      } else if (input.type === 'SET_ACTIVE') {
        const account = this.account(field(input.id, 'account'));
        check(typeof input.active === 'boolean', 'Choose an account status.');
        if (!input.active) {
          check(account.id !== actor.id, 'You cannot disable your own account.', 409);
          if (account.role === 'admin' && account.active) check(Number(this.db.prepare("SELECT COUNT(*) AS count FROM accounts WHERE role='admin' AND active=1").get()!.count) > 1, 'Keep at least one active administrator.', 409);
          if (account.role === 'staff') this.idleWindow(account);
          if (account.role === 'student') check(!this.db.prepare("SELECT id FROM tickets WHERE owner_id=? AND status IN ('WAITING','SERVING','HELD')").get(account.id), 'Finish or cancel this student’s active ticket before disabling the account.', 409);
        }
        this.db.prepare('UPDATE accounts SET active=?,window=CASE WHEN ?=0 THEN NULL ELSE window END WHERE id=?').run(Number(input.active), Number(input.active), account.id);
        this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(account.id);
        this.audit(actor, 'SET_ACTIVE', account.login, { active: input.active });
      } else if (input.type === 'ASSIGN_WINDOW' || input.type === 'RELEASE_WINDOW') {
        const account = this.account(field(input.id, 'account'));
        check(account.role === 'staff' && account.active, 'Select an active staff account.');
        this.idleWindow(account);
        const window = input.type === 'RELEASE_WINDOW' ? null : this.availableWindow(input.window, account.id);
        this.db.prepare('UPDATE accounts SET window=? WHERE id=?').run(window, account.id);
        this.audit(actor, input.type, account.login, { window, previousWindow: account.window });
      } else if (input.type === 'RESET_PASSWORD' && resetHash) {
        const account = this.account(field(input.id, 'account'));
        this.db.prepare('UPDATE accounts SET password_hash=? WHERE id=?').run(resetHash, account.id);
        this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(account.id);
        this.audit(actor, 'RESET_PASSWORD', account.login, { sessionsRevoked: true });
      } else if (input.type === 'CREATE_SERVICE' || input.type === 'SET_SERVICE') {
        const name = field(input.name, 'service');
        const window = field(input.window, 'window');
        check(registrarWindows.includes(window) && typeof input.enabled === 'boolean', 'Choose a listed registrar window and service status.');
        if (input.type === 'CREATE_SERVICE') {
          check(!this.db.prepare('SELECT name FROM services WHERE name=? COLLATE NOCASE').get(name), 'That service already exists.', 409);
          this.db.prepare('INSERT INTO services(name,window,enabled) VALUES(?,?,?)').run(name, window, Number(input.enabled));
        } else {
          check(this.db.prepare('SELECT name FROM services WHERE name=?').get(name), 'Service not found.', 404);
          this.db.prepare('UPDATE services SET window=?,enabled=? WHERE name=?').run(window, Number(input.enabled), name);
        }
        this.audit(actor, input.type, name, { window, enabled: input.enabled });
      } else if (input.type === 'SET_ACCEPTING') {
        check(typeof input.accepting === 'boolean', 'Choose whether new tickets are allowed.');
        this.db.prepare('UPDATE queue_state SET accepting=? WHERE id=1').run(Number(input.accepting));
        this.audit(actor, 'SET_ACCEPTING', 'Registrar queue', { accepting: input.accepting });
      } else throw new RequestError(400, 'Unknown administrator action.');
      this.db.prepare('UPDATE queue_state SET revision=revision+1 WHERE id=1').run();
    });
    return this.adminView();
  }
}
