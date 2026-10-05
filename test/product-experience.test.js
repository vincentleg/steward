import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createSandbox } from '../src/public-sandbox.js';
import { privateSurface } from '../src/connected/http.js';
import { PrivateStore } from '../src/connected/store.js';
import { conversationContext } from '../src/core/conversation-context.js';
import { LifeEngine } from '../src/core/life-engine.js';
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
test('conversation evidence is bounded, source-labeled, read-only and excludes credentials', async () => {
  const engine = new LifeEngine({ pace: 0 }),
    world = engine.create();
  world.secret = 'never-project';
  world.credentials = { accessToken: 'never-token' };
  const before = JSON.stringify(world),
    empty = conversationContext(world);
  assert.equal(JSON.stringify(world), before);
  assert.equal(JSON.stringify(empty).includes('never-'), false);
  assert.equal(empty.capability, 'evidence-only');
  assert.equal(empty.languageModel, 'not-configured');
  assert.equal(
    empty.facts.some((f) => f.status === 'verified'),
    false,
  );
  await engine.start(world, 'travel');
  const active = conversationContext(world);
  assert.ok(active.facts.some((f) => f.label === 'Worth to you'));
  assert.ok(active.facts.some((f) => f.status === 'simulated'));
  assert.equal(
    active.facts.some((f) => f.status === 'verified'),
    false,
  );
  await engine.approve(world, world.resolutions[0].id, world.revision);
  assert.ok(conversationContext(world).facts.some((f) => f.status === 'verified'));
});
test('demo pauses the same engine, stops safely and keeps normal worlds untouched', async () => {
  const engine = new LifeEngine({ pace: 0 }),
    normal = engine.create(),
    demo = engine.create();
  demo.demo = { paused: true };
  const initial = JSON.stringify(normal),
    running = engine.start(demo, 'travel');
  await delay(250);
  assert.equal(demo.resolutions[0].state, 'deviation.detected');
  engine.stop(demo, demo.resolutions[0].id);
  await running;
  assert.equal(JSON.stringify(normal), initial);
  assert.equal(demo.resolutions[0].actions.length, 0);
});
test('public evidence/export/deletion are capability-scoped; Demo has no private fallback', async () => {
  const { server, life } = createSandbox({ pace: 0 });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body = {}, token) =>
    fetch(base + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
    });
  try {
    const a = await (await post('/world/api/sessions')).json(),
      b = await (await post('/world/api/sessions', { demo: true })).json();
    assert.equal(b.world.demo.paused, false);
    assert.equal(a.world.demo, undefined);
    for (const route of ['conversation', 'export']) {
      assert.equal(
        (
          await fetch(base + `/world/api/sessions/${a.world.id}/${route}`, {
            headers: { Authorization: 'Bearer ' + b.accessToken },
          })
        ).status,
        404,
      );
      const data = await (
        await fetch(base + `/world/api/sessions/${a.world.id}/${route}`, {
          headers: { Authorization: 'Bearer ' + a.accessToken },
        })
      ).json();
      assert.equal(JSON.stringify(data).includes(a.accessToken), false);
    }
    assert.equal(
      (await post(`/world/api/sessions/${a.world.id}/demo`, { paused: true }, a.accessToken))
        .status,
      400,
    );
    await post(`/world/api/sessions/${b.world.id}/delete`, {}, b.accessToken);
    assert.equal(life.sessions.has(b.world.id), false);
    assert.equal(life.sessions.has(a.world.id), true);
    assert.equal((await fetch(base + '/account/api/conversation')).status, 404);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
test('private conversation and export use authenticated owner; tokens excluded; logout denies both', async () => {
  const store = new PrivateStore({ filename: ':memory:', encryptionKey: randomBytes(32) });
  const a = store.createUser('synthetic-a', 'synthetic-password-A-long'),
    b = store.createUser('synthetic-b', 'synthetic-password-B-long');
  const ta = store.login('synthetic-a', 'synthetic-password-A-long'),
    tb = store.login('synthetic-b', 'synthetic-password-B-long');
  store.put(a, 'world', 'connected', {
    mode: 'connected',
    commitments: [{ id: 'a', label: 'A-owned-commitment' }],
  });
  store.put(b, 'world', 'connected', {
    mode: 'connected',
    commitments: [{ id: 'b', label: 'B-owned-commitment' }],
  });
  store.connect(a, 'calendar', { status: 'connected', accessToken: 'synthetic-private-token' });
  const origin = 'http://localhost:3406',
    { server } = createSandbox({
      privateSurface: privateSurface({ store, origin, enabledProviders: ['calendar'] }),
    });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['conversation', 'export']) {
      assert.equal((await fetch(base + '/account/api/' + route)).status, 401);
      const owned = await (
        await fetch(base + '/account/api/' + route + '?user_id=' + a, {
          headers: { Cookie: 'steward-local=' + tb },
        })
      ).text();
      assert.ok(owned.includes('B-owned-commitment'));
      assert.equal(owned.includes('A-owned-commitment'), false);
      assert.equal(owned.includes('synthetic-private-token'), false);
      const privateA = await (
        await fetch(base + '/account/api/' + route, { headers: { Cookie: 'steward-local=' + ta } })
      ).text();
      assert.ok(privateA.includes('A-owned-commitment'));
      assert.equal(privateA.includes('synthetic-private-token'), false);
    }
    store.logout(ta);
    assert.equal(
      (
        await fetch(base + '/account/api/conversation', {
          headers: { Cookie: 'steward-local=' + ta },
        })
      ).status,
      401,
    );
  } finally {
    await new Promise((r) => server.close(r));
    store.close();
  }
});

test('language abstraction fails closed without a provider and rejects fabricated evidence IDs', async () => {
  const { createLanguageLayer } = await import('../public/language-layer.js');
  assert.equal(
    (await createLanguageLayer().answer({ question: 'Anything?', facts: [], mode: 'synthetic' }))
      .status,
    'unavailable',
  );
  const layer = createLanguageLayer({
    provider: {
      generate: async () => ({
        text: 'Unsupported personal claim',
        personal: true,
        evidenceIds: ['invented'],
      }),
    },
  });
  await assert.rejects(
    layer.answer({
      question: 'What happened?',
      facts: [
        { id: 'actual', label: 'No actions', status: 'observed', evidence: 'No actions occurred' },
      ],
      mode: 'synthetic',
    }),
    /Ungrounded/,
  );
});
