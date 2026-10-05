import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { registrarServices } from '../src/constants/registrar-services';
import { getServiceWindow, registrarWindows } from '../src/constants/service-windows';
import { applyQueueCommand, type Ticket, type QueueCommand, type QueueSnapshot } from '../src/data/queue-model';

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
    const name = field(input.name, 'full name', 80);
    const login = field(input.login, 'ID', 40).toLowerCase();
    const email = field(input.email, 'email', 160).toLowerCase();
    check(/^[a-z0-9][a-z0-9._-]{2,39}$/.test(login), 'Use 3–40 letters, numbers, dots, underscores or dashes for your ID.');
    check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Enter a valid email address.');
    const hash = await hashPassword(password(input.password));
    const id = randomUUID();
    try { this.db.prepare('INSERT INTO accounts(id,login,email,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?,?)')
      .run(id, login, email, name, role, hash, new Date().toISOString()); }
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
  async changePassword(user: Account, input: Record<string, unknown>) {
    const row = this.db.prepare('SELECT password_hash FROM accounts WHERE id=?').get(user.id) as { password_hash: string };
    check(typeof input.currentPassword === 'string' && input.currentPassword.length <= 128 && await matches(input.currentPassword, row.password_hash), 'Current password is incorrect.', 403);
    const hash = await hashPassword(password(input.newPassword));
    this.transaction(() => {
      this.db.prepare('UPDATE accounts SET password_hash=? WHERE id=?').run(hash, user.id);
      this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(user.id);
    });
  }
  services() { return this.db.prepare('SELECT name,window,enabled FROM services ORDER BY rowid').all(); }
  snapshot(): QueueSnapshot {
    const state = this.db.prepare('SELECT * FROM queue_state WHERE id=1').get()!;
    const events = this.db.prepare('SELECT * FROM ticket_events ORDER BY rowid').all();
    const tickets = this.db.prepare('SELECT * FROM tickets ORDER BY sequence').all().map((row) => ({
      id: row.id, sequence: row.sequence, number: row.number, service: row.service, window: row.window, status: row.status,
      ownerId: row.owner_id, createdAt: row.created_at, queueOrder: row.queue_order, date: row.finished_at ?? undefined, reason: row.reason ?? undefined,
      events: events.filter((event) => event.ticket_id === row.id).map((event) => ({ id: event.id, type: event.type, at: event.at, window: event.window, reason: event.reason ?? undefined })),
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
        } else command = { type: 'CANCEL', ownerId: user.id, reason: field(input.reason, 'reason', 300) };
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
      const result = applyQueueCommand(state, command, at);
      check(result.ok, result.ok ? '' : result.message, 409);
      const ticket = result.ticket!;
      if (command.type === 'BOOK') {
        ticket.window = String(this.db.prepare('SELECT window FROM services WHERE name=?').get(ticket.service)!.window);
        ticket.events[0].window = ticket.window;
      }
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
  adminView() {
    return { accounts: this.db.prepare('SELECT id,login,email,name,role,active,window FROM accounts ORDER BY created_at').all(), services: this.services(),
      acceptingTickets: !!this.db.prepare('SELECT accepting FROM queue_state WHERE id=1').get()!.accepting,
      records: this.snapshot().tickets.slice().reverse().map((ticket) => ({ ...ticket, ownerId: this.account(ticket.ownerId!).login })),
      counts: this.db.prepare('SELECT status,COUNT(*) AS count FROM tickets GROUP BY status').all() };
  }
  async adminAction(user: Account, input: Record<string, unknown>) {
    check(user.role === 'admin', 'Administrator access is required.', 403);
    if (input.type === 'CREATE_STAFF') await this.createAccount(input, 'staff');
    else if (input.type === 'SET_ACTIVE') {
      const id = field(input.id, 'account');
      check(id !== user.id && this.account(id).role !== 'admin', 'Administrator accounts cannot be disabled here.');
      check(typeof input.active === 'boolean', 'Choose an account status.');
      this.transaction(() => {
        this.db.prepare('UPDATE accounts SET active=?,window=CASE WHEN ?=0 THEN NULL ELSE window END WHERE id=?').run(Number(input.active), Number(input.active), id);
        this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(id);
      });
    } else if (input.type === 'RELEASE_WINDOW') {
      const id = field(input.id, 'account'); const staff = this.account(id);
      check(staff.role === 'staff', 'Select a staff account.');
      check(!this.snapshot().tickets.some((ticket) => ticket.status === 'SERVING' && ticket.window === staff.window), 'Finish the window’s current ticket before releasing its assignment.', 409);
      this.db.prepare('UPDATE accounts SET window=NULL WHERE id=?').run(id);
      this.db.prepare('UPDATE queue_state SET revision=revision+1 WHERE id=1').run();
    } else if (input.type === 'RESET_PASSWORD') {
      const id = field(input.id, 'account'); this.account(id);
      const hash = await hashPassword(password(input.password));
      this.transaction(() => {
        this.db.prepare('UPDATE accounts SET password_hash=? WHERE id=?').run(hash, id);
        this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(id);
      });
    } else if (input.type === 'SET_SERVICE') {
      const name = field(input.name, 'service');
      check(registrarServices.includes(name) && registrarWindows.includes(String(input.window)) && typeof input.enabled === 'boolean', 'Choose a listed service and window.');
      this.db.prepare('UPDATE services SET window=?,enabled=? WHERE name=?').run(String(input.window), Number(input.enabled), name);
      this.db.prepare('UPDATE queue_state SET revision=revision+1 WHERE id=1').run();
    } else if (input.type === 'SET_ACCEPTING') {
      check(typeof input.accepting === 'boolean', 'Choose whether new tickets are allowed.');
      this.db.prepare('UPDATE queue_state SET accepting=?,revision=revision+1 WHERE id=1').run(Number(input.accepting));
    } else throw new RequestError(400, 'Unknown administrator action.');
    return this.adminView();
  }
}
