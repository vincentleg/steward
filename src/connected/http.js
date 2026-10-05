import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { CONSTITUTION } from '../core/constitution.js';
import { randomUUID } from 'node:crypto';
import { AccountInputError } from './store.js';

export function privateSurface({ store, google = null, observer = null, origin, now = Date.now }) {
  const base = new URL(origin);
  const secure = base.protocol === 'https:';
  if (!secure && !['localhost', '127.0.0.1'].includes(base.hostname)) throw Error('HTTPS required');
  const cookieName = secure ? '__Host-steward' : 'steward-local';
  const limits = new Map();
  const json = (res, status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  const cookie = (token, maxAge) =>
    `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
  async function body(req) {
    if (req.headers['content-type'] !== 'application/json') throw Error('Invalid request');
    let value = '';
    for await (const chunk of req) {
      value += chunk;
      if (Buffer.byteLength(value) > 2048) throw Error('Request too large');
    }
    const parsed = JSON.parse(value || '{}');
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object')
      throw Error('Invalid request');
    return parsed;
  }
  function fields(value, keys) {
    if (Object.keys(value).some((key) => !keys.includes(key))) throw Error('Unexpected input');
  }
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
    );
    try {
      const url = new URL(req.url, origin);
      if (
        req.method === 'GET' &&
        ['/account', '/account.js', '/account.css'].includes(url.pathname)
      ) {
        const name = url.pathname === '/account' ? 'account.html' : url.pathname.slice(1);
        res.setHeader(
          'Content-Type',
          name.endsWith('.js')
            ? 'text/javascript'
            : name.endsWith('.css')
              ? 'text/css'
              : 'text/html',
        );
        res.end(await readFile(new URL(`../../public/${name}`, import.meta.url)));
        return;
      }
      const token =
        (req.headers.cookie || '')
          .split(';')
          .map((x) => x.trim())
          .find((x) => x.startsWith(`${cookieName}=`))
          ?.slice(cookieName.length + 1) || '';
      const owner = store.owner(token);
      if (req.method === 'POST') {
        if (req.headers.origin !== base.origin) {
          json(res, 403, { error: 'Origin denied' });
          return;
        }
        const key = req.socket.remoteAddress;
        let limit = limits.get(key);
        if (!limit || limit.until <= now()) {
          limit = { count: 0, until: now() + 60000 };
          limits.set(key, limit);
        }
        if (++limit.count > 30) {
          json(res, 429, { error: 'Try again later' });
          return;
        }
        if (limits.size > 1000)
          for (const [key, value] of limits) if (value.until <= now()) limits.delete(key);
      }
      if (
        req.method === 'POST' &&
        ['/account/api/signup', '/account/api/login'].includes(url.pathname)
      ) {
        const value = await body(req);
        fields(value, ['login', 'password']);
        const key = `auth:${req.socket.remoteAddress}`;
        let entry = limits.get(key);
        if (!entry || entry.until <= now()) {
          entry = { count: 0, until: now() + 60000 };
          limits.set(key, entry);
        }
        if (++entry.count > 5) {
          json(res, 429, { error: 'Try again later' });
          return;
        }
        if (url.pathname.endsWith('signup')) store.createUser(value.login, value.password);
        const next = store.login(value.login, value.password);
        if (!next) {
          json(res, 401, { error: 'Sign-in failed' });
          return;
        }
        if (token) store.logout(token);
        res.setHeader('Set-Cookie', cookie(next, 8 * 3600));
        json(res, 200, { authenticated: true });
        return;
      }
      if (!owner) {
        json(res, 401, { error: 'Sign in required' });
        return;
      }
      const resource = url.pathname.match(
        /^\/account\/api\/(world|event|memory|decision|action|notification)\/([a-zA-Z0-9_.:-]{1,200})$/,
      );
      if (req.method === 'GET' && resource) {
        const value = store.get(owner, resource[1], resource[2]);
        json(res, value ? 200 : 404, value || { error: 'Not found' });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/account/api/reminders') {
        const value = await body(req);
        fields(value, ['id', 'title', 'deadline']);
        if (
          typeof value.title !== 'string' ||
          value.title.length < 1 ||
          value.title.length > 180 ||
          !Number.isFinite(Date.parse(value.deadline))
        )
          throw Error('Invalid reminder');
        const id = value.id || randomUUID();
        if (!/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw Error('Invalid reminder ID');
        const existing = store.get(owner, 'action', id);
        if (existing) {
          if (existing.title !== value.title || existing.deadline !== value.deadline)
            throw Error('Conflicting action retry');
          json(res, 200, existing);
          return;
        }
        const world = store.get(owner, 'world', 'connected') || {
          mode: 'connected',
          context: { id: `personal:${owner}`, principalId: owner, kind: 'personal' },
          intendedState: { overlappingCommitments: 0 },
          commitments: [],
          goals: [],
          constraints: [],
          memory: [],
        };
        world.reminders = [
          ...(world.reminders || []),
          { id, title: value.title, deadline: value.deadline },
        ];
        if (world.reminders.length > 100) throw Error('Reminder limit reached');
        store.put(owner, 'world', 'connected', world);
        const confirmed = store
          .get(owner, 'world', 'connected')
          .reminders.find((item) => item.id === id);
        const action = {
          id,
          type: 'internal.create_reminder',
          authority: 'GREEN',
          title: value.title,
          deadline: value.deadline,
          status: 'completed',
          verification:
            confirmed?.title === value.title && confirmed.deadline === value.deadline
              ? 'verified'
              : 'failed',
          scope: 'Steward internal world only; no external provider write',
        };
        store.put(owner, 'action', id, action);
        json(res, 200, action);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/account/api/me') {
        const connections = ['calendar', 'gmail'].map((provider) => {
          const c = store.connection(owner, provider);
          return {
            provider,
            status: c?.status || 'not-connected',
            scopes: c?.scopes || [],
            lastSyncAt: c?.lastSyncAt || null,
          };
        });
        json(res, 200, {
          authenticated: true,
          googleConfigured: Boolean(google),
          mode: 'connected',
          connections,
          world: store.get(owner, 'world', 'connected'),
          decisions: store.list(owner, 'decision'),
          activity: store.list(owner, 'activity'),
          actions: store.list(owner, 'action'),
          constitution: CONSTITUTION,
        });
        return;
      }
      if (
        req.method === 'GET' &&
        /^\/account\/oauth\/(calendar|gmail)\/callback$/.test(url.pathname)
      ) {
        if (!google) {
          json(res, 503, { error: 'Google private testing is not configured' });
          return;
        }
        await google.callback(
          token,
          url.pathname.split('/')[3],
          url.searchParams.get('state'),
          url.searchParams.get('code'),
        );
        res.writeHead(303, { Location: '/account' });
        res.end();
        return;
      }
      if (req.method === 'POST' && url.pathname === '/account/api/logout') {
        await body(req);
        store.logout(token);
        res.setHeader('Set-Cookie', cookie('', 0));
        json(res, 200, { loggedOut: true });
        return;
      }
      if (req.method === 'POST' && url.pathname === '/account/api/delete-data') {
        const value = await body(req);
        fields(value, []);
        if (['calendar', 'gmail'].some((provider) => store.connection(owner, provider))) {
          json(res, 409, { error: 'Disconnect providers before deleting connected data' });
          return;
        }
        store.deleteData(owner);
        json(res, 200, { deleted: true });
        return;
      }
      if (
        req.method === 'POST' &&
        ['/account/api/connect', '/account/api/disconnect', '/account/api/sync'].includes(
          url.pathname,
        )
      ) {
        const value = await body(req);
        fields(value, ['provider']);
        if (!['calendar', 'gmail'].includes(value.provider)) throw Error('Invalid provider');
        if (!google) {
          json(res, 503, { error: 'Google private testing is not configured' });
          return;
        }
        if (url.pathname.endsWith('/connect'))
          json(res, 200, { authorizationUrl: google.begin(token, value.provider) });
        else if (url.pathname.endsWith('/disconnect'))
          json(res, 200, {
            disconnected: true,
            providerRevoked: await google.disconnect(owner, value.provider),
          });
        else {
          await observer.sync(owner, value.provider);
          json(res, 200, { synced: true });
        }
        return;
      }
      json(res, 404, { error: 'Not found' });
    } catch (error) {
      if (error instanceof AccountInputError) {
        // Fixed code only: no submitted identifier, password, provider payload or stack trace.
        console.warn(`Private account request rejected: ${error.code}`);
        json(res, 400, { error: error.message, code: error.code });
      } else {
        json(res, 400, { error: 'Request could not be completed' });
      }
    }
  };
}

// Compatibility harness for focused account tests.
export function privateServer(options) {
  return http.createServer(privateSurface(options));
}
