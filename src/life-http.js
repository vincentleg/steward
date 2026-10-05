import { readFileSync } from 'node:fs';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { LifeEngine } from './core/life-engine.js';
import { SCENARIOS } from './capabilities/life-library.js';
export function lifeService({
  publicBaseUrl,
  pace = 350,
  now = () => Date.now(),
  maxSessions = 150,
  ttl = 30 * 60 * 1000,
} = {}) {
  const engine = new LifeEngine({ pace, now });
  const sessions = new Map();
  const rates = new Map();
  const json = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  function clean() {
    for (const [id, s] of sessions)
      if (s.expires <= now()) {
        for (const r of s.world.resolutions) engine.stop(s.world, r.id);
        engine.worlds.delete(id);
        sessions.delete(id);
      }
    for (const [k, v] of rates) if (v.until <= now()) rates.delete(k);
  }
  function rate(key, limit) {
    const r = rates.get(key) || { count: 0, until: now() + 60000 };
    r.count++;
    rates.set(key, r);
    return r.count <= limit;
  }
  return {
    engine,
    sessions,
    async handle(req, res, url) {
      clean();
      if (req.method === 'GET' && url.pathname === '/life') {
        res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
        res.end(readFileSync('public/life.html'));
        return true;
      }
      const assets = {
        '/life.js': ['public/life.js', 'text/javascript'],
        '/life.css': ['public/life.css', 'text/css'],
        '/connections.js': ['public/connections.js', 'text/javascript'],
      };
      if (req.method === 'GET' && assets[url.pathname]) {
        const [file, type] = assets[url.pathname];
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
        res.end(readFileSync(file));
        return true;
      }
      if (!url.pathname.startsWith('/world/api/')) return false;
      try {
        if (req.method === 'GET' && url.pathname === '/world/api/scenarios') {
          json(res, 200, { scenarios: SCENARIOS });
          return true;
        }
        const create = req.method === 'POST' && url.pathname === '/world/api/sessions';
        const match = url.pathname.match(
          /^\/world\/api\/sessions\/([a-f0-9-]{36})(?:\/(start|approve|change|reset|stop))?$/,
        );
        let session;
        if (!create) {
          const token = String(req.headers.authorization || '').replace(/^Bearer /, '');
          session = match && sessions.get(match[1]);
          if (
            !session ||
            Buffer.byteLength(token) !== Buffer.byteLength(session.token) ||
            !timingSafeEqual(Buffer.from(token), Buffer.from(session.token))
          ) {
            json(res, 404, { error: 'World not found or expired' });
            return true;
          }
        }
        if (req.method === 'GET' && match && !match[2]) {
          json(res, 200, {
            world: session.world,
            expiresAt: new Date(session.expires).toISOString(),
          });
          return true;
        }
        if (req.method !== 'POST') {
          json(res, 405, { error: 'Method not allowed' });
          return true;
        }
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
          json(res, 415, { error: 'JSON required' });
          return true;
        }
        const origin = req.headers.origin;
        if (origin && origin !== publicBaseUrl && origin !== `http://${req.headers.host}`) {
          json(res, 403, { error: 'Origin not allowed' });
          return true;
        }
        if (!rate(create ? 'create' : session.world.id, create ? 40 : 80)) {
          json(res, 429, { error: 'Please wait a moment before trying again' });
          return true;
        }
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (Buffer.byteLength(raw) > 2048) {
            json(res, 413, { error: 'Request too large' });
            return true;
          }
        }
        const input = raw ? JSON.parse(raw) : {};
        if (!input || typeof input !== 'object' || Array.isArray(input))
          throw Error('Invalid request');
        const route = create ? 'create' : match[2];
        const keys = {
          create: [],
          reset: [],
          start: ['scenario'],
          approve: ['id', 'revision'],
          stop: ['id'],
          change: ['text', 'settings'],
        }[route];
        if (!keys || Object.keys(input).some((k) => !keys.includes(k)))
          throw Error('Unsupported input');
        if (create) {
          if (sessions.size >= maxSessions) {
            json(res, 429, { error: 'Public capacity reached. Try again shortly.' });
            return true;
          }
          const world = engine.create(),
            token = randomBytes(32).toString('base64url');
          sessions.set(world.id, { world, token, expires: now() + ttl });
          json(res, 201, {
            world,
            accessToken: token,
            expiresAt: new Date(now() + ttl).toISOString(),
          });
          return true;
        }
        const w = session.world;
        if (route === 'start') {
          if (typeof input.scenario !== 'string' || !SCENARIOS.some((s) => s.id === input.scenario))
            throw Error('Unknown scenario');
          const promise = engine.start(w, input.scenario); // validation occurs before the first yield
          await Promise.race([promise, new Promise((resolve) => setTimeout(resolve, 1))]);
          void promise.catch(() =>
            engine.emit(w, null, 'workflow.error', 'The resolution paused safely'),
          );
        } else if (route === 'approve') {
          if (typeof input.id !== 'string' || !Number.isInteger(input.revision))
            throw Error('Invalid decision');
          const promise = engine.approve(w, input.id, input.revision);
          await Promise.race([promise, new Promise((resolve) => setTimeout(resolve, 1))]);
          void promise.catch(() =>
            engine.emit(w, null, 'workflow.error', 'The resolution paused safely'),
          );
        } else if (route === 'change') {
          const result = engine.change(w, input);
          json(res, 200, { world: w, update: result });
          return true;
        } else if (route === 'reset') engine.reset(w);
        else if (route === 'stop') {
          if (typeof input.id !== 'string') throw Error('Invalid resolution');
          engine.stop(w, input.id);
        }
        json(res, 200, { world: w });
        return true;
      } catch (e) {
        const allowed = [
          'Finish or stop the active resolution first',
          'This event is already resolved. Reset the world to try it again.',
          'The world changed. Review the updated plan.',
          'No feasible plan',
          'Stop the partially executed resolution before changing its plan.',
          'No approval is available',
          'An authorized action is running. Stop it before changing its mandate.',
          'Stop the active resolution and wait for its action to settle before resetting',
        ];
        json(res, 400, {
          error: allowed.includes(e.message)
            ? e.message
            : 'This update cannot be applied. Use the supported synthetic controls.',
        });
        return true;
      }
    },
  };
}
