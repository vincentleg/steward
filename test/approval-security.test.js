import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { signApproval, validateApproval } from '../src/approval.js';
const secret = 'synthetic-signing-secret';
const signed = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
};
test('approval tokens reject missing expiry and wrong decision, tampered run or malformed signatures', () => {
  const token = signApproval('run-one', secret, 1000);
  assert.equal(validateApproval(token, secret, 1001).runId, 'run-one');
  for (const payload of [
    { runId: 'run-one', decisionId: 'flight-recovery' },
    { runId: 'run-one', decisionId: 'expand-authority', exp: 1900000 },
    { runId: 123, decisionId: 'flight-recovery', exp: 1900000 },
  ])
    assert.equal(validateApproval(signed(payload), secret, 1001), null);
  const [body, sig] = token.split('.');
  const changed = Buffer.from(
    JSON.stringify({ runId: 'other-run', decisionId: 'flight-recovery', exp: 1900000 }),
  ).toString('base64url');
  assert.equal(validateApproval(`${changed}.${sig}`, secret, 1001), null);
  assert.equal(validateApproval(`${body}.invalid`, secret, 1001), null);
  assert.equal(validateApproval(token + '.extra', secret, 1001), null);
});
