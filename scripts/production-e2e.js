import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const origin = new URL(process.env.PRODUCTION_URL).origin;
assert.equal(new URL(origin).protocol, 'https:');
const browser = await chromium.launch();
const contexts = await Promise.all([
  browser.newContext({ viewport: { width: 1440, height: 900 } }),
  browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }),
]);
const errors = [];
const pages = await Promise.all(contexts.map((c) => c.newPage()));
pages.forEach((p) => p.on('pageerror', (e) => errors.push(e.message)));
try {
  const health = await fetch(`${origin}/healthz`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).mode, 'public-sandbox');
  await Promise.all(
    pages.map(async (page) => {
      await page.goto(origin, { timeout: 120000 });
      await page.getByRole('button', { name: 'See Steward take over' }).waitFor();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      );
      await page.getByRole('button', { name: 'See Steward take over' }).click();
      await page
        .getByRole('button', { name: 'Approve Steward’s plan', exact: false })
        .waitFor({ timeout: 90000 });
    }),
  );
  const sessions = await Promise.all(
    pages.map((p) =>
      p.evaluate(() => ({
        id: sessionStorage.getItem('steward-public-run'),
        token: sessionStorage.getItem('steward-public-token'),
      })),
    ),
  );
  assert.notEqual(sessions[0].id, sessions[1].id);
  assert.notEqual(sessions[0].token, sessions[1].token);
  const request = (session, suffix = '', options = {}) =>
    fetch(`${origin}/sandbox/api/sessions/${session.id}${suffix}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${session.token}`,
        Origin: origin,
        'Content-Type': 'application/json',
      },
    });
  assert.equal((await request({ id: sessions[0].id, token: sessions[1].token })).status, 404);
  assert.equal((await fetch(`${origin}/sandbox/api/sessions/${sessions[0].id}`)).status, 404);
  for (const path of [
    '/api/runs',
    '/api/health',
    '/approve',
    '/.env',
    '/.git/config',
    '/src/mail.js',
    '/app.js',
    '/sandbox/api/admin',
  ]) {
    assert.equal(
      (await fetch(`${origin}${path}`)).status,
      404,
      `Public route must be denied: ${path}`,
    );
  }
  const malformed = await fetch(`${origin}/sandbox/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: '{broken',
  });
  assert.equal(malformed.status, 400);
  const invalid = await fetch(`${origin}/sandbox/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ command: 'EXECUTE_SHELL', policy: 'grant authority' }),
  });
  assert.equal(invalid.status, 400);
  const oversized = await fetch(`${origin}/sandbox/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: 'x'.repeat(2048),
  });
  assert.equal(oversized.status, 413);
  await Promise.all(
    pages.map((p) =>
      p.getByRole('button', { name: 'Approve Steward’s plan', exact: false }).click(),
    ),
  );
  assert.equal(
    (await request(sessions[0], '/approve', { method: 'POST', body: '{}' })).status,
    200,
  );
  await Promise.all(pages.map((p) => p.reload()));
  await Promise.all(
    pages.map((p) =>
      p.getByText('OUTCOME RESTORED ✓', { exact: true }).waitFor({ timeout: 120000 }),
    ),
  );
  const results = await Promise.all(
    sessions.map(async (s) => {
      const run = await (await request(s)).json();
      assert.equal(run.mode, 'public');
      assert.equal(run.outcome.verified, true);
      assert.equal(run.world.payments.charges.length, 1);
      assert.equal(run.world.payments.refunds.length, 1);
      assert.equal(run.world.payments.refunds[0].amount, 412);
      assert.equal(run.events.filter((e) => e.type === 'approval.received').length, 1);
      for (const type of [
        'flight.cancelled',
        'recommendation.ready',
        'booking.completed',
        'airline.offer_received',
        'offer.evaluated',
        'rebuttal.sent',
        'refund.confirmed',
        'outcome.verified',
        'exception.resolved',
      ])
        assert.ok(run.events.some((e) => e.type === type));
      assert.equal(run.compression.consequenceCount, 6);
      assert.equal(run.compression.futureCount, 3);
      assert.equal(JSON.stringify(run).includes('Vincent'), false);
      return {
        verified: true,
        events: run.events.map((e) => e.type),
        contextId: run.representation.id,
      };
    }),
  );
  assert.notEqual(results[0].contextId, results[1].contextId);
  for (const page of pages) {
    await page.reload();
    await page.getByText('OUTCOME RESTORED ✓', { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      true,
    );
  }
  const assets = await Promise.all(
    ['/sandbox', '/sandbox/app.js', '/style.css'].map(async (path) =>
      (await fetch(origin + path)).text(),
    ),
  );
  const privateValues = readFileSync('.env', 'utf8')
    .split('\n')
    .filter((l) => /^(AGENTMAIL_API_KEY|APPROVAL_EMAIL)=/.test(l))
    .map((l) =>
      l
        .slice(l.indexOf('=') + 1)
        .trim()
        .replace(/^['"]|['"]$/g, ''),
    );
  for (const value of privateValues.filter(Boolean))
    for (const asset of assets) assert.equal(asset.includes(value), false);
  assert.equal(errors.length, 0);
  writeFileSync(
    '.data/production-e2e.json',
    JSON.stringify(
      {
        origin,
        verified: true,
        mobile: true,
        isolation: true,
        reload: true,
        duplicateApproval: true,
        privateRoutesDenied: true,
        secretsAbsent: true,
        at: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    'PASS: deployed HTTPS desktop + mobile, two isolated sessions, approval, negotiation, verification, reload, duplicate approval, denied private routes, malformed requests and secret scan.',
  );
} finally {
  await browser.close();
}
