import http from 'node:http';
import { CONSTITUTION } from './core/constitution.js';
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { EventStore } from './core/store.js';
import { OutcomeWorkflow } from './core/orchestrator.js';
import { travelCapability } from './capabilities/travel.js';

export function createSandbox({
  pace = 1.5,
  ttlMs = 30 * 60 * 1000,
  now = () => Date.now(),
  rateLimit = 120,
  maxSessions = 150,
  publicBaseUrl = process.env.PUBLIC_BASE_URL,
  rateLimitKey = (req) =>
    String(req.headers['cf-connecting-ip'] || req.socket.remoteAddress || 'local'),
} = {}) {
  const store = new EventStore(null, {
    seed: (mode) => ({ capability: travelCapability.id, ...travelCapability.seed(mode) }),
  });
  const credentials = new Map();
  const limits = new Map();
  const engine = new OutcomeWorkflow(store, travelCapability, {
    pace,
    sendDecision: async () => ({ channel: 'public', delivery: 'browser-approval' }),
    communicate: async () => ({ channel: 'sandbox', delivery: 'received' }),
  });
  function cleanup() {
    for (const [id, run] of store.runs) {
      if (Date.parse(run.expiresAt) <= now()) {
        run.stopped = true;
        store.core.forget(store.runs.get(id));
        store.runs.delete(id);
        credentials.delete(id);
      }
    }
    for (const [ip, entry] of limits) if (entry.reset <= now()) limits.delete(ip);
  }
  const timer = setInterval(cleanup, 30000);
  timer.unref();
  const json = (res, status, body) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    res.end(JSON.stringify(body));
  };
  const server = http.createServer(async (req, res) => {
    try {
      cleanup();
      const url = new URL(req.url, 'http://localhost');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; form-action 'self'",
      );
      if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(302, { Location: '/sandbox', 'Cache-Control': 'no-store' });
        return res.end();
      }
      if (req.method === 'GET' && url.pathname === '/healthz')
        return json(res, 200, { ok: true, mode: 'public-sandbox' });
      if (req.method === 'GET' && ['/sandbox', '/sandbox/'].includes(url.pathname)) {
        let html = readFileSync('public/index.html', 'utf8')
          .replace('<body>', '<body data-mode="public">')
          .replace('src="/app.js"', 'src="/sandbox/app.js"')
          .replace('href="/"', 'href="/sandbox"')
          .replace('Vincent <span', 'You <span')
          .replace('/ Personal', '/ Sandbox')
          .replace('SANDBOX WORLD · LIVE AGENT', 'PUBLIC SANDBOX · SYNTHETIC WORLD');
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
        return res.end(html);
      }
      if (req.method === 'GET' && ['/sandbox/qr.svg', '/sandbox/share'].includes(url.pathname)) {
        const qr = url.pathname.endsWith('.svg');
        const file = qr ? '.data/sandbox-qr.svg' : '.data/TRY-STEWARD.html';
        if (!existsSync(file)) return json(res, 404, { error: 'Share artifact not yet generated' });
        res.writeHead(200, {
          'Content-Type': qr ? 'image/svg+xml' : 'text/html',
          'Cache-Control': 'no-store',
        });
        return res.end(readFileSync(file));
      }
      if (req.method === 'GET' && url.pathname === '/sandbox/app.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-cache' });
        return res.end(readFileSync('public/app.js'));
      }
      if (req.method === 'GET' && url.pathname === '/sandbox/api/constitution')
        return json(res, 200, CONSTITUTION);
      if (req.method === 'GET' && url.pathname === '/style.css') {
        res.writeHead(200, { 'Content-Type': 'text/css' });
        return res.end(readFileSync('public/style.css'));
      }
      if (
        req.method === 'GET' &&
        /^\/fonts\/(dm-sans|manrope)-(400|500|600|700|800)\.woff2$/.test(url.pathname)
      ) {
        res.writeHead(200, { 'Content-Type': 'font/woff2' });
        return res.end(readFileSync(`public${url.pathname}`));
      }
      if (!url.pathname.startsWith('/sandbox/api/')) return json(res, 404, { error: 'Not found' });
      if (req.method === 'POST') {
        if (!String(req.headers['content-type'] || '').startsWith('application/json'))
          return json(res, 415, { error: 'JSON required' });
        const origin = req.headers.origin;
        if (origin && origin !== publicBaseUrl && origin !== `http://${req.headers.host}`)
          return json(res, 403, { error: 'Origin not allowed' });
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 1024) return json(res, 413, { error: 'Request too large' });
        }
        const input = raw ? JSON.parse(raw) : {};
        if (
          !input ||
          typeof input !== 'object' ||
          Array.isArray(input) ||
          Object.keys(input).length
        )
          return json(res, 400, { error: 'This demo accepts no personal data or custom commands' });
      }
      if (req.method === 'POST' && url.pathname === '/sandbox/api/sessions') {
        const ip = rateLimitKey(req);
        const limit = limits.get(ip) || { count: 0, reset: now() + 10 * 60 * 1000 };
        limit.count++;
        limits.set(ip, limit);
        if (limit.count > rateLimit || store.runs.size >= maxSessions)
          return json(res, 429, { error: 'Demo capacity reached. Please try again shortly.' });
        const run = store.create('public');
        run.expiresAt = new Date(now() + ttlMs).toISOString();
        const token = randomBytes(32).toString('base64url');
        credentials.set(run.id, token);
        json(res, 201, { ...run, accessToken: token });
        void engine
          .analyze(run)
          .catch(() =>
            engine.emit(run, 'workflow.error', { message: 'Start a fresh sandbox session.' }),
          );
        return;
      }
      const match = url.pathname.match(
        /^\/sandbox\/api\/sessions\/([a-f0-9-]{36})(?:\/(approve|stop))?$/,
      );
      if (!match) return json(res, 404, { error: 'Session not found' });
      const run = store.runs.get(match[1]);
      const expected = credentials.get(match[1]);
      const actual = String(req.headers.authorization || '').replace(/^Bearer /, '');
      if (
        !run ||
        !expected ||
        Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
      )
        return json(res, 404, { error: 'Session not found or expired' });
      if (req.method === 'GET' && !match[2]) return json(res, 200, run);
      if (req.method === 'POST' && match[2] === 'approve') {
        try {
          return json(res, 200, engine.approve(run, 'Your browser'));
        } catch {
          return json(res, 409, { error: 'This decision cannot be approved' });
        }
      }
      if (req.method === 'POST' && match[2] === 'stop') {
        engine.stop(run);
        return json(res, 200, { stopped: true });
      }
      return json(res, 405, { error: 'Method not allowed' });
    } catch {
      return json(res, 400, { error: 'Request could not be processed' });
    }
  });
  server.on('close', () => clearInterval(timer));
  return { server, store, engine, cleanup };
}
