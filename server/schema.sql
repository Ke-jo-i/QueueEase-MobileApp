PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  login TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','staff','admin')),
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  window TEXT UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS services (
  name TEXT PRIMARY KEY,
  window TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS queue_state (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  next_number INTEGER NOT NULL DEFAULT 1,
  next_order INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 0,
  accepting INTEGER NOT NULL DEFAULT 1
);
INSERT OR IGNORE INTO queue_state(id) VALUES(1);
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  sequence INTEGER NOT NULL UNIQUE,
  number TEXT NOT NULL UNIQUE,
  service TEXT NOT NULL REFERENCES services(name),
  window TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('WAITING','SERVING','HELD','COMPLETED','CANCELLED','SKIPPED','NO_SHOW')),
  owner_id TEXT NOT NULL REFERENCES accounts(id),
  created_at TEXT NOT NULL,
  queue_order INTEGER NOT NULL UNIQUE,
  finished_at TEXT,
  reason TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_ticket ON tickets(owner_id) WHERE status IN ('WAITING','SERVING','HELD');
CREATE UNIQUE INDEX IF NOT EXISTS one_serving_window ON tickets(window) WHERE status = 'SERVING';
CREATE TABLE IF NOT EXISTS ticket_events (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  type TEXT NOT NULL,
  at TEXT NOT NULL,
  window TEXT NOT NULL,
  reason TEXT,
  actor_id TEXT NOT NULL REFERENCES accounts(id)
);
CREATE INDEX IF NOT EXISTS events_by_ticket ON ticket_events(ticket_id, at);
CREATE TABLE IF NOT EXISTS requests (
  account_id TEXT NOT NULL REFERENCES accounts(id),
  request_id TEXT NOT NULL,
  ticket_id TEXT REFERENCES tickets(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY(account_id, request_id)
);
