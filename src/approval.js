import { createHmac, timingSafeEqual } from 'node:crypto';
export function signApproval(runId, secret, now = Date.now()) {
  const body = Buffer.from(
    JSON.stringify({ runId, decisionId: 'flight-recovery', exp: now + 30 * 60 * 1000 }),
  ).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}
export function validateApproval(token, secret, now = Date.now()) {
  try {
    const [body, sig, ...rest] = token.split('.');
    if (rest.length || !body || !sig) return null;
    const expected = createHmac('sha256', secret).update(body).digest();
    const actual = Buffer.from(sig, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (
      !Number.isFinite(payload.exp) ||
      payload.exp <= now ||
      payload.decisionId !== 'flight-recovery' ||
      typeof payload.runId !== 'string'
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}
