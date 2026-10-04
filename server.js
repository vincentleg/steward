import http from 'node:http';
import { CONSTITUTION } from './src/core/constitution.js';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { Store } from './src/store.js';
import { Workflow } from './src/workflow.js';
import { signApproval, validateApproval } from './src/approval.js';
import { sendApproval, sendWorkflowMessage, sendCancellation, mailConfigured } from './src/mail.js';
const port = Number(process.env.PORT || 3000);
const dataDir = process.env.DATA_DIR || '.data';
const store = new Store(join(dataDir, 'runs.json'));
mkdirSync(dataDir, { recursive: true });
const secret =
  process.env.APPROVAL_SECRET ||
  (() => {
    const p = join(dataDir, 'approval-secret');
    if (existsSync(p)) return readFileSync(p, 'utf8');
    const s = randomBytes(32).toString('hex');
    writeFileSync(p, s, { mode: 0o600 });
    return s;
  })();
const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
const workflow = new Workflow(store, {
  pace: Number(process.env.WORKFLOW_PACE || 1),
  sendDecision: async (run) =>
    sendApproval(run, `${baseUrl}/approve?token=${signApproval(run.id, secret)}`),
  communicate: sendWorkflowMessage,
});
const replayWorkflow = new Workflow(store, {
  pace: 0.72,
  sendDecision: async () => ({ channel: 'replay', delivery: 'simulated' }),
});
const json = (res, status, value) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
};
async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 8192) throw new Error('Request too large');
  }
  return raw ? JSON.parse(raw) : {};
}
const approvalHTML = (token, approved, error = '') =>
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Approve · STEWARD</title><link rel="stylesheet" href="/style.css"><body class="phone"><div class="phone-wrap"><div class="brand">STEW<span class="brand-a">A</span>RD<span class="brand-dot">●</span></div><div class="eyebrow">${error ? 'LINK UNAVAILABLE' : approved ? 'APPROVED BY VINCENT' : 'ONE DECISION NEEDS YOU'}</div><h1>${error ? 'Let’s get a fresh link.' : approved ? 'Your life is<br>being handled.' : 'Get home<br><em>tonight.</em>'}</h1><p>${error || (approved ? 'Put your phone down. Steward is booking your flight, protecting your refund, and keeping your meeting safe.' : 'Alternative flight · Tonight, 9:40 PM')}</p>${!error && !approved ? `<div class="phone-price">+$92 <small>NET</small></div><ul class="benefits"><li>9 AM meeting preserved</li><li>31,000 miles preserved</li><li>$412 cash refund protected</li></ul><form method="POST" action="/approve"><input type="hidden" name="token" value="${token}"><button class="primary" type="submit">Approve Steward’s plan <span>↗</span></button></form><p class="phone-note">One approval authorizes a simulated $504 booking and a $412 refund request. No real money moves.</p>` : ''}<div class="phone-footer">WHEN PLANS BREAK, STEWARD FIXES THEM.</div></div></body></html>`;
const creationTimes = [];
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, baseUrl);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (
      req.method === 'POST' &&
      url.pathname !== '/approve' &&
      req.headers.origin &&
      req.headers.origin !== new URL(baseUrl).origin &&
      req.headers.origin !== `http://${req.headers.host}`
    )
      return json(res, 403, { error: 'Origin not allowed' });
    if (req.method === 'GET' && url.pathname === '/api/constitution')
      return json(res, 200, CONSTITUTION);
    const stopMatch = url.pathname.match(/^\/api\/runs\/([a-f0-9-]{36})\/stop$/);
    if (req.method === 'POST' && stopMatch) {
      const run = store.runs.get(stopMatch[1]);
      if (!run) return json(res, 404, { error: 'Run not found' });
      workflow.stop(run);
      return json(res, 200, { stopped: true });
    }
    if (req.method === 'GET' && url.pathname === '/api/health')
      return json(res, 200, {
        ok: true,
        mail: mailConfigured(),
        publicApproval: !!process.env.PUBLIC_BASE_URL,
      });
    if (req.method === 'POST' && url.pathname === '/api/runs') {
      if (!(req.headers['content-type'] || '').startsWith('application/json'))
        return json(res, 415, { error: 'JSON body required' });
      const now = Date.now();
      while (creationTimes.length && creationTimes[0] < now - 60000) creationTimes.shift();
      if (creationTimes.length >= 12)
        return json(res, 429, { error: 'Please wait before starting another run' });
      creationTimes.push(now);
      const input = await body(req);
      const mode = input.mode === 'replay' ? 'replay' : 'live';
      const run = store.create(mode);
      json(res, 201, run);
      const engine = mode === 'replay' ? replayWorkflow : workflow;
      void (async () => {
        if (mode === 'live' && mailConfigured()) {
          try {
            const receipt = await sendCancellation(run);
            engine.emit(run, 'communication.event_received', receipt);
          } catch {
            engine.emit(run, 'communication.degraded', {
              channel: 'sandbox',
              message: 'AgentMail cancellation delivery unavailable; using direct sandbox event.',
            });
          }
        }
        await engine.analyze(run);
      })()
        .then(() => {
          if (mode === 'replay')
            setTimeout(() => engine.approve(run, 'Replay · simulated approval'), 4000);
        })
        .catch(() =>
          engine.emit(run, 'workflow.error', { message: 'Analysis paused. Start a fresh run.' }),
        );
      return;
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/runs/')) {
      const id = url.pathname.split('/')[3];
      const run = store.runs.get(id);
      if (!run) return json(res, 404, { error: 'Run not found' });
      const safe = {
        ...run,
        approvalUrl:
          run.state === 'WAITING_FOR_APPROVAL'
            ? `${baseUrl}/approve?token=${signApproval(run.id, secret)}`
            : null,
      };
      return json(res, 200, safe);
    }
    if (url.pathname === '/approve') {
      let token = url.searchParams.get('token');
      if (req.method === 'POST') {
        let raw = '';
        for await (const c of req) {
          raw += c;
          if (raw.length > 8192) throw new Error('Request too large');
        }
        token = new URLSearchParams(raw).get('token');
      }
      const payload = validateApproval(token || '', secret);
      const run = payload && store.runs.get(payload.runId);
      if (!run) {
        res.writeHead(400, {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        });
        return res.end(
          approvalHTML(
            '',
            false,
            'This approval link is invalid or has expired. Open Steward for a new link.',
          ),
        );
      }
      if (req.method === 'POST') {
        const agent = /iPhone/.test(req.headers['user-agent'] || '')
          ? 'iPhone'
          : /Android/.test(req.headers['user-agent'] || '')
            ? 'Android'
            : 'Browser';
        try {
          workflow.approve(run, agent);
        } catch {
          res.writeHead(409, { 'Content-Type': 'text/html' });
          return res.end(approvalHTML('', false, 'This decision is not ready for approval.'));
        }
      }
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy':
          "default-src 'self'; style-src 'self'; form-action 'self'; frame-ancestors 'none'",
      });
      return res.end(approvalHTML(token, run.decision.status === 'approved'));
    }
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
    if (
      req.method === 'GET' &&
      /^\/fonts\/(dm-sans|manrope)-(400|500|600|700|800)\.woff2$/.test(url.pathname)
    ) {
      const path = `public${url.pathname}`;
      if (!existsSync(path)) return json(res, 404, { error: 'Font not found' });
      res.writeHead(200, {
        'Content-Type': 'font/woff2',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      return res.end(readFileSync(path));
    }
    const files = { '/': 'index.html', '/app.js': 'app.js', '/style.css': 'style.css' };
    const file = files[url.pathname];
    if (!file) return json(res, 404, { error: 'Not found' });
    res.writeHead(200, {
      'Content-Type': file.endsWith('.css')
        ? 'text/css'
        : file.endsWith('.js')
          ? 'text/javascript'
          : 'text/html',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(readFileSync(`public/${file}`));
  } catch {
    json(res, 500, { error: 'Request could not be processed' });
  }
});
server.listen(port, '0.0.0.0', () => {
  console.log(
    `STEWARD ready on http://localhost:${port} · AgentMail ${mailConfigured() ? 'configured' : 'not configured'}`,
  );
  void workflow.resume();
});
