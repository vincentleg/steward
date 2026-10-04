import test from 'node:test';
import assert from 'node:assert/strict';
import { representationContext } from '../src/core/identity.js';
import { authorityGrant, checkAuthority } from '../src/core/authority.js';
import { memoryEntry, appendMemory, recall } from '../src/core/memory.js';
import { personalWorld, verifyOutcome } from '../src/core/world.js';
import { simulateFutures, rankFutures } from '../src/core/intelligence.js';
import { impactGraph, detectDeviation } from '../src/core/impact.js';
import { temporalWindow, windowStatus } from '../src/core/time.js';
import { Store } from '../src/store.js';
const context = (kind) =>
  representationContext({
    id: kind,
    principalId: 'synthetic',
    kind,
    mandateId: `mandate:${kind}`,
    resourceIds: [`money:${kind}`],
  });
test('context boundaries isolate resources, authority and mutable run snapshots', () => {
  const personal = context('personal'),
    professional = context('professional');
  const grant = authorityGrant({
    id: 'grant',
    context: personal,
    actionIds: ['book'],
    resourceIds: personal.resourceIds,
    spendingLimit: 504,
  });
  const action = { id: 'book', cost: 504, currency: 'USD', resourceIds: personal.resourceIds };
  assert.throws(() => checkAuthority(action, professional, grant));
  assert.throws(() =>
    checkAuthority({ ...action, resourceIds: professional.resourceIds }, personal, grant, {
      approved: true,
    }),
  );
  assert.throws(() => checkAuthority(action, personal, grant));
  assert.equal(checkAuthority(action, personal, grant, { approved: true }).allowed, true);
  assert.throws(() =>
    checkAuthority({ ...action, cost: 505 }, personal, grant, { approved: true }),
  );
  assert.throws(() =>
    checkAuthority({ ...action, modifiesConstitution: true }, personal, grant, { approved: true }),
  );
  const store = new Store(null),
    a = store.create('public'),
    b = store.create('public');
  assert.notEqual(a.representation.id, b.representation.id);
  a.representation = b.representation;
  assert.throws(() => store.core.world(a));
});
test('memory has provenance, expiry, context isolation and no implicit permanent preferences', () => {
  const world = personalWorld({ context: context('personal') });
  assert.throws(() =>
    memoryEntry({
      contextId: 'personal',
      kind: 'stable-preference',
      value: 'aisle',
      source: { type: 'observation', id: 'choice' },
    }),
  );
  const entry = memoryEntry({
    id: 'observation',
    contextId: 'personal',
    kind: 'historical-observation',
    value: 'aisle once',
    source: { type: 'observation', id: 'choice' },
  });
  assert.equal(appendMemory(world, entry), true);
  assert.equal(appendMemory(world, entry), false);
  assert.equal(recall(world).length, 1);
  assert.throws(() => appendMemory(personalWorld({ context: context('professional') }), entry));
});
test('generic future evaluation preserves reversibility and escalates unknown evidence', () => {
  const futures = simulateFutures({}, [
    { id: 'A', costs: { money: 92 }, confidence: 1, reversibility: 'irreversible' },
    { id: 'B', costs: { money: 93 }, confidence: 1, reversibility: 'reversible' },
  ]);
  assert.equal(rankFutures(futures).recommended, 'B');
  assert.equal(rankFutures(simulateFutures({}, [{ id: 'unknown' }])).requiresJudgment, true);
});
test('deviation and impact graphs are domain independent, bounded and context isolated', () => {
  assert.equal(
    detectDeviation({
      id: 'change',
      contextId: 'personal',
      intended: { attending: true },
      observed: { attending: false },
    }).status,
    'detected',
  );
  const graph = impactGraph({
    contextId: 'personal',
    sourceId: 'source',
    nodes: ['source', 'time'].map((id) => ({ id, contextId: 'personal' })),
    edges: [
      { from: 'source', to: 'time' },
      { from: 'time', to: 'source' },
    ],
  });
  assert.equal(graph.nodes.length, 1);
  assert.throws(() =>
    impactGraph({
      contextId: 'personal',
      sourceId: 'x',
      nodes: [{ id: 'x', contextId: 'professional' }],
      edges: [],
    }),
  );
});
test('verification fails closed on exceptions, missing evidence and duplicate evidence', () => {
  assert.equal(verifyOutcome({}, []).verified, false);
  assert.equal(
    verifyOutcome({}, [
      {
        id: 'a',
        check: () => {
          throw Error('Unavailable');
        },
      },
    ]).verified,
    false,
  );
  assert.equal(
    verifyOutcome({}, [
      { id: 'a', check: () => true },
      { id: 'a', check: () => true },
    ]).verified,
    false,
  );
});
test('time windows account for travel time and reject ambiguous local timestamps', () => {
  assert.throws(() => temporalWindow({ deadline: '2026-10-04T18:00:00' }));
  assert.equal(
    windowStatus(
      temporalWindow({ deadline: '2026-10-04T18:00:00Z', travelMinutes: 30 }),
      Date.parse('2026-10-04T17:45:00Z'),
    ),
    'missed',
  );
});
test('central worlds persist and verified outcomes are recorded once without permanent preference inference', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(`${tmpdir()}/steward-core-`);
  try {
    const path = `${dir}/runs.json`,
      store = new Store(path),
      run = store.create('live');
    run.deviation = { status: 'detected' };
    store.emit(run, 'changed');
    run.outcome = {
      verified: true,
      evidence: [{ id: 'confirmed', passed: true }],
      at: new Date().toISOString(),
    };
    store.emit(run, 'outcome.verified');
    store.emit(run, 'exception.resolved');
    store.emit(run, 'outcome.verified');
    const world = store.core.world(run);
    assert.equal(world.memory.length, 1);
    assert.equal(world.activeDeviations.length, 0);
    const restored = new Store(path);
    assert.equal(restored.core.world(restored.runs.get(run.id)).outcomeHistory.length, 1);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
test('one intelligence holds separate personal and professional worlds for the same principal', async () => {
  const { StewardCore } = await import('../src/core/steward.js');
  const core = new StewardCore(),
    a = { id: 'a', mode: 'live' },
    b = { id: 'b', mode: 'live' };
  const identity = { id: 'synthetic', name: 'Synthetic principal' };
  core.attach(a, { identity, context: context('personal') });
  core.attach(b, { identity, context: context('professional') });
  core.world(a).money.push({ id: 'personal-balance', amount: 412 });
  assert.equal(core.world(b).money.length, 0);
  assert.equal(core.world(a).identity.id, core.world(b).identity.id);
});
test('external contributions cannot overwrite Constitution, authority, preferences or insert credentials', () => {
  const store = new Store(null),
    run = store.create('public');
  for (const contribution of [
    { authority: { spend: 9999 } },
    { preferences: ['always accept'] },
    { constitution: {} },
    { observedState: { secret: 'synthetic forbidden' } },
  ])
    assert.throws(() => store.core.contribute(run, contribution));
  store.core.contribute(run, { observedState: { transportAvailable: false } });
  assert.equal(store.core.world(run).observedState.transportAvailable, false);
});
