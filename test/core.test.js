import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { context, evaluateRecovery, evaluateOffer, searchFlights } from '../src/domain.js';
import { signApproval, validateApproval } from '../src/approval.js';
import { Store } from '../src/store.js';
import { Workflow } from '../src/workflow.js';
import { airlineCommand } from '../src/simulator.js';
const until = async (predicate) => {
  for (let i = 0; i < 1000; i++) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 2));
  }
  throw Error('Timed out');
};
test('economic engine protects meeting, cash and December rewards', () => {
  const r = evaluateRecovery();
  assert.equal(searchFlights().length, 7);
  assert.equal(searchFlights().find((f) => f.id === 'sold-out-430').preservesMeeting, false);
  assert.equal(r.options.length, 3);
  assert.equal(r.recommended, 'B');
  assert.equal(r.options[1].price, 504);
  assert.equal(context.trip.fare, 412);
  assert.equal(r.net, 92);
  assert.equal(r.options[0].preservesMeeting, false);
  assert.equal(r.options[1].preservesMeeting, true);
  assert.equal(r.milesPreserved, 31000);
  assert.equal(context.rewards.plannedValue, 560);
});
test('cash beats credit for Vincent, preference changes with usage', () => {
  const r = evaluateOffer();
  assert.equal(r.preferred, 'cash');
  assert.equal(r.expectedCreditValue, 158);
  assert.equal(r.cash, 412);
  assert.equal(
    evaluateOffer(450, { ...context, voucher: { usageProbability: 1 } }).preferred,
    'credit',
  );
});
test('approval requires valid signature, decision, expiry and secret', () => {
  const token = signApproval('run-1', 'secret', 1000);
  assert.equal(validateApproval(token, 'secret', 1001).runId, 'run-1');
  assert.equal(validateApproval(token, 'wrong', 1001), null);
  assert.equal(validateApproval(token, 'secret', 1801000), null);
  assert.equal(validateApproval(`${token}x`, 'secret', 1001), null);
  assert.equal(validateApproval('broken', 'secret'), null);
});
test('sandbox refuses unapproved bookings and unknown commands', () => {
  const s = new Store(null);
  const r = s.create();
  assert.throws(() => airlineCommand(r, 'ACCEPT_BOOKING', { option: 'B', price: 504 }));
  assert.throws(() => airlineCommand(r, 'DELETE_EVERYTHING'));
});
for (const mode of ['live', 'replay'])
  test(`${mode}: full happy path twice, approval gate and idempotency`, async () => {
    for (let i = 0; i < 2; i++) {
      const s = new Store(null);
      const w = new Workflow(s, { pace: 0 });
      const r = s.create(mode);
      assert.throws(() => w.approve(r));
      await w.analyze(r);
      assert.equal(r.state, 'WAITING_FOR_APPROVAL');
      assert.equal(
        r.events.some((e) => e.type === 'booking.completed'),
        false,
      );
      w.approve(r, 'iPhone');
      assert.equal(w.approve(r).alreadyApproved, true);
      await until(() => r.state === 'RESOLVED');
      assert.equal(r.events.filter((e) => e.type === 'approval.received').length, 1);
      assert.equal(r.events.filter((e) => e.type === 'booking.completed').length, 1);
      assert.equal(r.actions.refund.amount, 412);
      assert.equal(r.airline.state, 'REFUNDED');
      assert.equal(r.world.calendar.status, 'safe');
      assert.equal(r.world.people.sarahInbox.length, 1);
      assert.equal(r.world.payments.charges[0].amount - r.world.payments.refunds[0].amount, 92);
      assert.equal(r.events.at(-1).type, 'exception.resolved');
      assert.equal(r.events.find((e) => e.type === 'offer.evaluated').data.preferred, 'cash');
      assert.deepEqual(
        r.events.map((e) => e.sequence),
        r.events.map((_, j) => j + 1),
      );
      await w.execute(r);
      assert.equal(r.events.filter((e) => e.type === 'booking.completed').length, 1);
    }
  });
test('persisted approval and event log restore after restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'steward-test-'));
  try {
    const s = new Store(join(dir, 'runs.json'));
    const w = new Workflow(s, { pace: 0 });
    const r = s.create();
    await w.analyze(r);
    const restored = new Store(join(dir, 'runs.json'));
    const rr = restored.runs.get(r.id);
    assert.equal(rr.state, 'WAITING_FOR_APPROVAL');
    assert.equal(rr.events.length, r.events.length);
    const resumed = new Workflow(restored, { pace: 0 });
    resumed.approve(rr, 'iPhone');
    await until(() => rr.state === 'RESOLVED');
    const final = new Store(join(dir, 'runs.json')).runs.get(r.id);
    assert.equal(final.state, 'RESOLVED');
    assert.equal(final.actions.refund.amount, 412);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('mail failure preserves local approval and does not break recovery', async () => {
  const s = new Store(null);
  const w = new Workflow(s, {
    pace: 0,
    sendDecision: async () => {
      throw Error('Offline');
    },
  });
  const r = s.create();
  await w.analyze(r);
  assert.equal(r.state, 'WAITING_FOR_APPROVAL');
  assert.equal(r.delivery.channel, 'local');
  w.approve(r);
  await until(() => r.state === 'RESOLVED');
});
test('interrupted approved recovery resumes without duplicate side effects', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'steward-resume-'));
  try {
    const path = join(dir, 'runs.json');
    const s = new Store(path);
    const w = new Workflow(s, {
      pace: 0,
      onEvent: (r, e) => {
        if (e.type === 'refund.requested') throw Error('Simulated interruption');
      },
    });
    const r = s.create();
    await w.analyze(r);
    w.approve(r);
    await until(() => r.events.some((e) => e.type === 'workflow.error'));
    const restored = new Store(path);
    const rr = restored.runs.get(r.id);
    const resumed = new Workflow(restored, { pace: 0 });
    await resumed.resume();
    await until(() => rr.state === 'RESOLVED');
    assert.equal(rr.world.payments.charges.length, 1);
    assert.equal(rr.world.payments.refunds.length, 1);
    assert.equal(rr.world.people.sarahInbox.length, 1);
    assert.equal(rr.events.filter((e) => e.type === 'approval.received').length, 1);
    assert.equal(rr.events.filter((e) => e.type === 'refund.requested').length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
