import { createReadStream, realpathSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.otf': 'font/otf',
};

export function serveWeb(request: IncomingMessage, response: ServerResponse, directory: string) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'HEAD'].includes(request.method ?? '')) {
    response.setHeader('Allow', 'GET, HEAD');
    response.writeHead(405).end('Method not allowed.');
    return;
  }
  let pathname: string;
  try { pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname); }
  catch { response.writeHead(400).end('Invalid path.'); return; }
  const root = realpathSync(directory);
  const candidate = resolve(root, `.${pathname}`);
  const within = (path: string) => path === root || path.startsWith(`${root}${sep}`);
  if (!within(candidate) || pathname.includes('\0')) { response.writeHead(403).end('Forbidden.'); return; }
  const findFile = (paths: string[]) => {
    for (const path of paths) {
      try {
        const actual = realpathSync(path);
        if (within(actual) && statSync(actual).isFile()) return actual;
      } catch {}
    }
    return null;
  };
  let file = findFile([candidate, `${candidate}.html`, join(candidate, 'index.html')]);
  if (!file) {
    response.statusCode = 404;
    file = findFile([join(root, '+not-found.html')]);
    if (!file) { response.end('Page not found.'); return; }
  }
  response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
  response.setHeader('Content-Length', statSync(file).size);
  if (response.statusCode === 200 && file.includes(`${sep}_expo${sep}static${sep}`)) {
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  if (request.method === 'HEAD') { response.end(); return; }
  createReadStream(file).on('error', () => {
    if (response.headersSent) response.destroy();
    else response.writeHead(500).end('Could not load this page.');
  }).pipe(response);
}
