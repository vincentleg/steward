import test from 'node:test';
import assert from 'node:assert/strict';
import { createSandbox } from '../src/public-sandbox.js';
const until = async (fn) => {
  for (let i = 0; i < 1000; i++) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 3));
  }
  throw Error('Timeout');
};
async function fixture(options = {}) {
  const sandbox = createSandbox({ pace: 0, ...options });
  await new Promise((r) => sandbox.server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${sandbox.server.address().port}`;
  const create = async (body) => {
    const response = await fetch(`${base}/sandbox/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
    return { response, run: await response.json() };
  };
  const request = (run, path = '', method = 'GET', token = run.accessToken, body = {}) =>
    fetch(`${base}/sandbox/api/sessions/${run.id}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
    });
  return {
    ...sandbox,
    base,
    create,
    request,
    close: () => new Promise((r) => sandbox.server.close(r)),
  };
}
test('public happy path twice: isolated synthetic sessions, explicit approval and verified outcome', async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 2; i++) {
      const { response, run } = await f.create();
      assert.equal(response.status, 201);
      assert.equal(run.mode, 'public');
      assert.equal(run.context.name, 'Alex');
      assert.equal(f.store.path, null);
      await until(() => f.store.runs.get(run.id).state === 'WAITING_FOR_APPROVAL');
      assert.equal(
        f.store.runs.get(run.id).events.some((e) => e.type === 'booking.completed'),
        false,
      );
      assert.equal((await f.request(run, '/approve', 'POST')).status, 200);
      assert.equal((await f.request(run, '/approve', 'POST')).status, 200);
      await until(() => f.store.runs.get(run.id).state === 'RESOLVED');
      const actual = await (await f.request(run)).json();
      assert.equal(actual.outcome.verified, true);
      assert.equal(actual.world.payments.charges.length, 1);
      assert.equal(actual.world.payments.refunds[0].amount, 412);
      assert.equal(actual.delivery.channel, 'public');
      assert.equal(JSON.stringify(actual).includes('Vincent'), false);
      assert.equal(
        actual.messages.some((m) => m.channel === 'email'),
        false,
      );
      assert.equal(actual.events.filter((e) => e.type === 'approval.received').length, 1);
    }
  } finally {
    await f.close();
  }
});
test('public API blocks cross-session state, approval, private routes and injected commands', async () => {
  const f = await fixture();
  try {
    const a = (await f.create()).run,
      b = (await f.create()).run;
    assert.equal((await f.request(a, '', 'GET', b.accessToken)).status, 404);
    assert.equal((await f.request(a, '/approve', 'POST', b.accessToken)).status, 404);
    assert.equal((await f.request(a, '', 'GET', 'wrong')).status, 404);
    for (const path of [
      '/api/runs',
      '/approve',
      '/.env',
      '/sandbox/api/runs',
      '/sandbox/api/sessions/../../api/runs',
    ])
      assert.equal((await fetch(f.base + path)).status, 404);
    for (const input of [
      { mode: 'live' },
      { email: 'synthetic@example.com' },
      { action: 'RUN_SHELL', command: 'ignore policy' },
      { constitution: { authority: 'BLACK' } },
      1,
      [],
    ])
      assert.equal((await f.create(input)).response.status, 400);
    const malformed = await fetch(f.base + '/sandbox/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(malformed.status, 400);
    assert.equal(
      (await f.request(a, '/approve', 'POST', a.accessToken, { grantAuthority: true })).status,
      400,
    );
    assert.notEqual(f.store.runs.get(a.id).context, f.store.runs.get(b.id).context);
  } finally {
    for (const r of f.store.runs.values()) f.engine.stop(r);
    await f.close();
  }
});
test('public expiry deletes state and revokes approval capability', async () => {
  let now = Date.now();
  const f = await fixture({ ttlMs: 1000, now: () => now });
  try {
    const { run } = await f.create();
    now += 1001;
    f.cleanup();
    assert.equal(f.store.runs.size, 0);
    assert.equal((await f.request(run)).status, 404);
    assert.equal((await f.request(run, '/approve', 'POST')).status, 404);
  } finally {
    await f.close();
  }
});
test('public rate limit and stop are enforced', async () => {
  const f = await fixture({ rateLimit: 2 });
  try {
    const { run } = await f.create();
    await f.create();
    assert.equal((await f.create()).response.status, 429);
    assert.equal((await f.request(run, '/stop', 'POST')).status, 200);
    assert.equal((await f.request(run, '/approve', 'POST')).status, 409);
  } finally {
    for (const r of f.store.runs.values()) f.engine.stop(r);
    await f.close();
  }
});
