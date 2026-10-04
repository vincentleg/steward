import test from 'node:test';
import assert from 'node:assert/strict';
import { CONSTITUTION, authorize } from '../src/core/constitution.js';
import { Store } from '../src/store.js';
import { Workflow } from '../src/workflow.js';
import { OutcomeWorkflow } from '../src/core/orchestrator.js';
import { EventStore } from '../src/core/store.js';
import { verifyOutcome } from '../src/core/world.js';
const until = async (fn) => {
  for (let i = 0; i < 1000; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 2));
  }
  throw Error('Timeout');
};
test('constitution is immutable and tools cannot grant themselves authority', () => {
  assert.throws(() => CONSTITUTION.never.push('new rule'));
  const r = new Store(null).create();
  assert.equal(authorize({ authority: 'GREEN' }, r).allowed, true);
  for (const action of [
    { authority: 'BLACK' },
    { authority: 'RED' },
    { authority: 'YELLOW', requiresApproval: true },
    { authority: 'GREEN', realMoney: true },
    { authority: 'GREEN', expandsAuthority: true },
  ])
    assert.throws(() => authorize(action, r));
  r.constitution = { autonomous: ['spend anything'] };
  assert.throws(() => authorize({ authority: 'RED' }, r));
});
test('actions can complete while the intended outcome fails verification', async () => {
  const s = new Store(null);
  const w = new Workflow(s, {
    pace: 0,
    onEvent: (r, e) => {
      if (e.type === 'refund.confirmed') r.world.payments.refunds = [];
    },
  });
  const r = s.create();
  await w.analyze(r);
  w.approve(r);
  await until(() => r.events.some((e) => e.type === 'workflow.error'));
  assert.equal(
    r.events.some((e) => e.type === 'refund.confirmed'),
    true,
  );
  assert.equal(r.outcome.verified, false);
  assert.notEqual(r.state, 'RESOLVED');
});
test('stop prevents further actions and cannot be bypassed by repeated approval', async () => {
  const s = new Store(null);
  const w = new Workflow(s, {
    pace: 0,
    onEvent: (r, e) => {
      if (e.type === 'booking.completed') w.stop(r);
    },
  });
  const r = s.create();
  await w.analyze(r);
  w.approve(r);
  await until(() => r.stopped);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.throws(() => w.approve(r));
  assert.equal(
    r.events.some((e) => e.type === 'refund.requested'),
    false,
  );
  assert.equal(r.world.payments.charges.length, 1);
});
test('generic orchestrator restores an outcome without travel concepts', async () => {
  const capability = {
    id: 'test-resource',
    resolutionEvent: 'resource.restored',
    seed: () => ({
      context: { name: 'Synthetic' },
      decision: { status: 'pending' },
      resource: { ready: false },
    }),
    analysisSteps: [
      ['deviation.detected', {}, 'MODELED', 0],
      ['decision.sent', {}, 'WAITING_FOR_APPROVAL', 0],
    ],
    executionSteps: () => [
      ['resource.updated', {}, 'EXECUTING', 0],
      ['resource.restored', {}, 'RESOLVED', 0],
    ],
    authority: () => ({ authority: 'YELLOW', requiresApproval: false }),
    apply: (r, type) => {
      if (type === 'resource.updated') r.resource.ready = true;
    },
    verify: (r) =>
      verifyOutcome(r, [
        { id: 'resource', label: 'Resource restored', check: (v) => v.resource.ready },
      ]),
  };
  const store = new EventStore(null, { seed: capability.seed });
  const engine = new OutcomeWorkflow(store, capability, { pace: 0 });
  const r = store.create();
  await engine.analyze(r);
  engine.approve(r);
  await until(() => r.state === 'RESOLVED');
  assert.equal(r.outcome.verified, true);
});
