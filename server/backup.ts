import { backup, DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const source = resolve(process.env.QUEUE_DB_PATH ?? '.local/queueease.sqlite');
const destination = resolve('.local/backups', `queueease-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
mkdirSync(dirname(destination), { recursive: true });
const database = new DatabaseSync(source, { readOnly: true });
try { await backup(database, destination); console.log('Database backup saved:', destination); }
finally { database.close(); }
