import { existsSync, readFileSync } from 'node:fs';
import type { Role } from './store';

export type DemoAccount = { role: Role; login: string; password: string };

export function loadDemoAccounts(path: string): DemoAccount[] {
  if (!existsSync(path)) return [];
  const accounts: DemoAccount[] = [];
  const contents = readFileSync(path, 'utf8');
  for (const match of contents.matchAll(/^(student|staff|admin): ([^\r\n]+)\r?\nPassword: ([^\r\n]+)/gm)) {
    accounts.push({ role: match[1] as Role, login: match[2].trim(), password: match[3] });
  }
  return accounts;
}
