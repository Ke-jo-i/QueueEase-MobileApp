import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const directory = resolve('dist');
if (!existsSync(join(directory, 'index.html'))) throw new Error('Website build is missing. Run npm run build:web first.');
process.env.QUEUE_WEB_DIR = directory;
process.env.QUEUE_DEMO_LOGIN = '0';
await import('./index');
