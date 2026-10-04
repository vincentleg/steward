import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createSandbox } from '../src/public-sandbox.js';
test('public cloud startup refuses private LIVE configuration without exposing its value', () => {
  for (const name of ['AGENTMAIL_API_KEY', 'APPROVAL_EMAIL', 'APPROVAL_SECRET']) {
    const secret = 'synthetic-private-value';
    const result = spawnSync(process.execPath, ['cloud-server.js'], {
      env: { ...process.env, [name]: secret, SANDBOX_PUBLIC_URL: 'https://example.com' },
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.equal(result.stderr.includes(secret), false);
  }
});
test('cloud global capacity cannot be bypassed by spoofed proxy IP headers', async () => {
  const { server } = createSandbox({
    pace: 0,
    rateLimit: 1,
    publicBaseUrl: 'https://example.com',
    rateLimitKey: () => 'public-global',
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(origin + '/')).status, 200);
    assert.equal((await fetch(origin + '/healthz')).status, 200);
    for (const path of ['/api/runs', '/approve', '/.env', '/.git/config'])
      assert.equal((await fetch(origin + path)).status, 404);
    const create = (ip) =>
      fetch(origin + '/sandbox/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://example.com',
          'cf-connecting-ip': ip,
        },
        body: '{}',
      });
    assert.equal((await create('1.2.3.4')).status, 201);
    assert.equal((await create('5.6.7.8')).status, 429);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
