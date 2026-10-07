import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/expo/bin/cli', import.meta.url)), 'export', '--platform', 'web', '--max-workers', '2', ...process.argv.slice(2)], {
  stdio: 'inherit', windowsHide: true, env: { ...process.env, EXPO_PUBLIC_API_URL: '/api' },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
