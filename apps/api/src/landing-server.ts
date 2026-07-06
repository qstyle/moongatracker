import { createServer } from 'http';
import { existsSync, readFileSync, statSync } from 'fs';
import { extname, join, normalize } from 'path';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Serves the built landing (apps/landing/dist) on its OWN port, so a single
 * image exposes two ports: PORT (the app: api + web) and LANDING_PORT (the
 * marketing landing). Zero external deps — plain Node http.
 *
 * `APP_URL` is injected into index.html at runtime (window.__APP_URL__), so the
 * same image runs on any domain without a rebuild — the landing's «Начать/Войти»
 * links point at whatever APP_URL is set in the environment. Empty → relative.
 *
 * If the landing bundle isn't present (e.g. local api-only run), it no-ops.
 */
export function startLandingServer(): void {
  const dist = join(process.cwd(), 'apps/landing/dist');
  const indexPath = join(dist, 'index.html');
  if (!existsSync(indexPath)) {
    console.log('landing dist not found — landing server skipped');
    return;
  }

  const appUrl = process.env.APP_URL ?? '';
  const indexHtml = readFileSync(indexPath, 'utf8').replace(
    '</head>',
    `<script>window.__APP_URL__=${JSON.stringify(appUrl)};</script></head>`,
  );
  const port = process.env.LANDING_PORT
    ? Number(process.env.LANDING_PORT)
    : 8080;

  createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const rel = normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = join(dist, rel);

    // Serve a real static file if it exists and stays inside dist.
    if (
      filePath.startsWith(dist) &&
      existsSync(filePath) &&
      statSync(filePath).isFile()
    ) {
      const type =
        CONTENT_TYPES[extname(filePath).toLowerCase()] ??
        'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type });
      res.end(readFileSync(filePath));
      return;
    }

    // SPA fallback → index.html (with the injected runtime APP_URL).
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(indexHtml);
  }).listen(port, '0.0.0.0', () => {
    console.log(`landing listening on http://localhost:${port}`);
  });
}
