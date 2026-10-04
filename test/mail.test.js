import test from 'node:test';
import assert from 'node:assert/strict';
import { sendApproval, sendCancellation, mailConfigured } from '../src/mail.js';
import { Store } from '../src/store.js';

test('official AgentMail SDK serializes approval and receives fixed cancellation protocol', async () => {
  const originalFetch = globalThis.fetch;
  const keys = ['AGENTMAIL_API_KEY', 'APPROVAL_EMAIL', 'PUBLIC_BASE_URL'];
  const original = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  process.env.AGENTMAIL_API_KEY = 'synthetic-test-credential';
  process.env.APPROVAL_EMAIL = 'vincent@example.com';
  process.env.PUBLIC_BASE_URL = 'https://steward.example.com';
  const calls = [];
  const r = new Store(null).create();
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined });
    let response;
    if (init.method === 'POST') response = { message_id: 'msg-test', thread_id: 'thread-test' };
    else if (url.includes('/messages/msg-received'))
      response = {
        inbox_id: 'steward-agent@agentmail.to',
        message_id: 'msg-received',
        thread_id: 'thread-test',
        labels: ['received'],
        timestamp: new Date().toISOString(),
        from: 'steward-agent@agentmail.to',
        to: ['steward-agent@agentmail.to'],
        size: 100,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        text: JSON.stringify({ type: 'flight.cancelled', runId: r.id, sandbox: true }),
      };
    else
      response = {
        count: 1,
        messages: [
          {
            message_id: 'msg-received',
            subject: `[STEWARD SANDBOX] Flight cancelled ${r.id}`,
            labels: ['received'],
          },
        ],
      };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    assert.equal(mailConfigured(), true);
    const result = await sendApproval(
      r,
      'https://steward.example.com/approve?token=synthetic-token',
    );
    assert.equal(result.channel, 'email');
    assert.equal(result.messageId, 'msg-test');
    assert.deepEqual(calls[0].body.to, ['vincent@example.com']);
    assert.match(calls[0].body.text, /504.*412.*92/);
    assert.match(calls[0].body.html, /APPROVE STEWARD/);
    const cancellation = await sendCancellation(r);
    assert.equal(cancellation.messageId, 'msg-received');
    assert.equal(cancellation.channel, 'agentmail');
    assert.equal(calls.at(-1).method, 'GET');
    assert.ok(
      calls.every(
        (c) =>
          c.url.includes('steward-agent%40agentmail.to') ||
          c.url.includes('steward-agent@agentmail.to'),
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
