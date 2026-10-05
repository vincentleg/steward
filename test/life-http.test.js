import test from 'node:test';
import assert from 'node:assert/strict';
import { createSandbox } from '../src/public-sandbox.js';
async function fixture(options = {}) {
  const service = createSandbox({ pace: 0, ...options });
  await new Promise((r) => service.server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${service.server.address().port}`;
  const post = (path, body = {}, token) =>
    fetch(url + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
    });
  const create = async () => (await post('/world/api/sessions')).json();
  return {
    ...service,
    url,
    post,
    create,
    close: () => new Promise((r) => service.server.close(r)),
  };
}
test('public life service isolates worlds, validates updates, denies private paths, and expires tokens', async () => {
  let now = Date.now();
  const f = await fixture({ now: () => now, ttlMs: 1000 });
  try {
    const a = await f.create(),
      b = await f.create();
    assert.equal(
      (
        await fetch(f.url + '/world/api/sessions/' + a.world.id, {
          headers: { Authorization: 'Bearer ' + b.accessToken },
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await f.post(
          '/world/api/sessions/' + a.world.id + '/change',
          { settings: { maxSpend: 100 } },
          a.accessToken,
        )
      ).status,
      200,
    );
    assert.equal(f.life.sessions.get(b.world.id).world.settings.maxSpend, 250);
    for (const body of [
      { settings: { constitution: [] } },
      { settings: { autonomy: 'god' } },
      { settings: { maxSpend: -1 } },
      { text: 'hello', recipient: 'arbitrary' },
    ])
      assert.equal(
        (await f.post('/world/api/sessions/' + a.world.id + '/change', body, a.accessToken)).status,
        400,
      );
    for (const route of ['/presentation', '/api/runs', '/.env', '/src/mail.js', '/.git/config'])
      assert.equal((await fetch(f.url + route)).status, 404);
    const html = await (await fetch(f.url + '/')).text();
    assert.ok(html.includes('Preparing your world'));
    assert.ok(!html.includes('Vincent'));
    now += 1001;
    assert.equal(
      (
        await fetch(f.url + '/world/api/sessions/' + a.world.id, {
          headers: { Authorization: 'Bearer ' + a.accessToken },
        })
      ).status,
      404,
    );
    assert.equal(f.life.engine.worlds.size, 0);
  } finally {
    await f.close();
  }
});
test('life API has no mail relay, wrong-origin writes, oversized inputs or replayed actions', async () => {
  const f = await fixture();
  try {
    const a = await f.create(),
      path = '/world/api/sessions/' + a.world.id;
    assert.equal((await f.post(path + '/start', { scenario: 'shell' }, a.accessToken)).status, 400);
    assert.equal(
      (await f.post(path + '/change', { text: 'x'.repeat(3000) }, a.accessToken)).status,
      413,
    );
    assert.equal(
      (
        await fetch(f.url + path + '/reset', {
          method: 'POST',
          headers: {
            Origin: 'https://evil.example',
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + a.accessToken,
          },
          body: '{}',
        })
      ).status,
      403,
    );
    assert.equal((await f.post(path + '/start', { scenario: 'money' }, a.accessToken)).status, 200);
    for (
      let i = 0;
      i < 100 &&
      f.life.sessions.get(a.world.id).world.resolutions.at(-1)?.state !== 'decision.pending';
      i++
    )
      await new Promise((r) => setTimeout(r, 2));
    const w = f.life.sessions.get(a.world.id).world,
      r = w.resolutions.at(-1);
    assert.equal(
      (await f.post(path + '/approve', { id: r.id, revision: w.revision }, a.accessToken)).status,
      200,
    );
    for (let i = 0; i < 100 && r.state !== 'outcome.restored'; i++)
      await new Promise((r) => setTimeout(r, 2));
    assert.equal(r.outcome.verified, true);
    assert.equal(
      (await f.post(path + '/approve', { id: r.id, revision: w.revision }, a.accessToken)).status,
      200,
    );
    assert.equal(w.money.refunds.length, 1);
  } finally {
    await f.close();
  }
});
