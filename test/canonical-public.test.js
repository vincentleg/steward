import test from 'node:test';
import assert from 'node:assert/strict';
import { createSandbox } from '../src/public-sandbox.js';
test('canonical Instagram sandbox serves public V2 and ignores tracking query; private accounts unavailable', async () => {
  const app = createSandbox({ pace: 0 });
  await new Promise((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  try {
    const direct = await fetch(base + '/sandbox', { redirect: 'manual' });
    assert.equal(direct.status, 200);
    const html = await direct.text();
    assert.ok(html.includes('/life.js'));
    const tracking = await fetch(base + '/sandbox?fbclid=test');
    assert.equal(tracking.status, 200);
    assert.equal(await tracking.text(), html);
    const alias = await fetch(base + '/life');
    assert.equal(await alias.text(), html);
    const legacy = await fetch(base + '/sandbox/travel');
    assert.ok((await legacy.text()).includes('/sandbox/app.js'));
    for (const path of [
      '/account',
      '/account.js',
      '/account.css',
      '/account/api/me',
      '/account/oauth/calendar/callback',
      '/account/oauth/gmail/callback',
      '/.env',
    ])
      assert.equal((await fetch(base + path)).status, 404, path);
  } finally {
    await new Promise((resolve) => app.server.close(resolve));
  }
});
