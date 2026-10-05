import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { Store } from './store';
import { createApi } from './http';

const path = resolve(process.env.QUEUE_DB_PATH ?? '.local/queueease.sqlite');
mkdirSync(dirname(path), { recursive: true });
const store = new Store(path);
const port = Number(process.env.QUEUE_PORT ?? 4100);
const server = createApi(store);
server.listen(port, '0.0.0.0', () => {
  console.log(`QueueEase API: http://localhost:${port}`);
  for (const entries of Object.values(networkInterfaces())) for (const address of entries ?? []) {
    if (address.family === 'IPv4' && !address.internal) console.log(`Phone connection: http://${address.address}:${port}`);
  }
  console.log('Keep this terminal open. Database:', path);
});
function shutdown() { server.close(() => { store.close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
