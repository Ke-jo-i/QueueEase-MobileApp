import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Store } from './store';

const path = resolve(process.env.QUEUE_DB_PATH ?? '.local/queueease.sqlite');
mkdirSync(dirname(path), { recursive: true });
const store = new Store(path);
try {
  if (store.db.prepare('SELECT id FROM accounts LIMIT 1').get()) {
    console.log('Accounts already exist. Setup kept the existing accounts, tickets and passwords.');
  } else {
    const credentials: string[] = ['QueueEase demonstration accounts. Use synthetic data only. Keep this file private.', ''];
    for (const [role, login, name] of [
      ['admin', 'admin', 'Project Administrator'], ['staff', 'staff1', 'Registrar Staff'], ['student', '2026-00001', 'Demo Student'],
    ] as const) {
      const password = randomBytes(12).toString('base64url');
      await store.createAccount({ login, name, email: `${login}@queueease.test`, password }, role);
      credentials.push(`${role}: ${login}\nPassword: ${password}\n`);
    }
    const credentialPath = resolve(dirname(path), 'demo-accounts.txt');
    writeFileSync(credentialPath, credentials.join('\n'), { mode: 0o600 });
    console.log('Created an empty queue and three demonstration accounts.');
    console.log('Credentials saved locally:', credentialPath);
  }
} finally { store.close(); }
