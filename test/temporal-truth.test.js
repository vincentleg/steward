import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recordObservation,
  currentTruth,
  operationalWindow,
  verifyExpectedOutcome,
  optionalityPlan,
} from '../src/core/temporal-truth.js';
import { LifeEngine } from '../src/core/life-engine.js';
import { intelligenceState } from '../src/core/intelligence-state.js';
const now = Date.parse('2026-10-04T12:00:00Z');
const fact = (id, value, source, directness = 'claim', at = now) => ({
  id,
  entity: 'refund',
  field: 'method',
  value,
  source,
  directness,
  observedAt: new Date(at).toISOString(),
});

test('contradictions preserve history, reject premature certainty and resolve only with adequate evidence', () => {
  const w = {};
  recordObservation(w, fact('a', 'cash', 'provider'));
  recordObservation(w, fact('b', 'credit', 'fulfillment'));
  assert.equal(currentTruth(w.observations, 'refund', 'method', now).status, 'contradicted');
  recordObservation(w, fact('c', 'cash', 'inference', 'inference', now + 1000));
  assert.equal(currentTruth(w.observations, 'refund', 'method', now + 1000).status, 'contradicted');
  recordObservation(w, fact('d', 'cash', 'receipt', 'direct', now + 2000));
  const truth = currentTruth(w.observations, 'refund', 'method', now + 2000);
  assert.equal(truth.status, 'known');
  assert.equal(truth.value, 'cash');
  assert.equal(truth.history.length, 4);
  assert.match(truth.resolution, /newer direct/);
  assert.throws(() =>
    recordObservation(w, { ...fact('d', 'credit', 'receipt', 'direct', now + 2000) }),
  );
  const equal = {};
  recordObservation(equal, fact('a', 'cash', 'a', 'direct'));
  recordObservation(equal, fact('b', 'credit', 'b', 'direct'));
  assert.equal(currentTruth(equal.observations, 'refund', 'method', now).status, 'contradicted');
});

test('past, future, expired and inferred observations do not become present verified truth', () => {
  const w = {};
  recordObservation(w, {
    ...fact('a', 'cash', 'a', 'direct'),
    validUntil: new Date(now + 1000).toISOString(),
  });
  recordObservation(w, fact('b', 'credit', 'b', 'direct', now + 2000));
  assert.equal(currentTruth(w.observations, 'refund', 'method', now).value, 'cash');
  assert.equal(currentTruth(w.observations, 'refund', 'method', now + 1500).status, 'unverified');
  assert.equal(currentTruth(w.observations, 'refund', 'method', now + 2000).value, 'credit');
  const intent = {
    id: 'outcome',
    label: 'Cash received',
    expectedBy: new Date(now + 60000).toISOString(),
    predicates: [{ entity: 'refund', field: 'method', equals: 'cash' }],
  };
  assert.equal(verifyExpectedOutcome(intent, [fact('x', 'cash', 'provider')], now).verified, false);
  assert.equal(verifyExpectedOutcome(intent, [], now).next, 'watch');
  assert.equal(verifyExpectedOutcome(intent, [], now + 60000).next, 'replan');
  assert.equal(
    verifyExpectedOutcome(intent, [fact('x', 'credit', 'receipt', 'direct')], now).status,
    'not-restored',
  );
  assert.equal(
    verifyExpectedOutcome(intent, [fact('x', 'cash', 'receipt', 'direct')], now).status,
    'restored',
  );
});

test('operational start includes preparation, travel and transition buffers; missing facts stay unknown', () => {
  const c = {
    start: '2026-10-04T14:00:00Z',
    end: '2026-10-04T15:00:00Z',
    preparationMinutes: 30,
    travelMinutes: 35,
    arrivalMinutes: 10,
  };
  assert.equal(operationalWindow(c, now).operationalStart, '2026-10-04T12:45:00.000Z');
  assert.equal(operationalWindow(c, now + 60 * 60000).status, 'preparation-at-risk');
  assert.equal(
    operationalWindow({ ...c, start: '2026-10-04T13:00:00Z', end: '2026-10-04T14:00:00Z' }, now)
      .status,
    'preparation-at-risk',
  );
  assert.equal(operationalWindow({ ...c, travelMinutes: null }, now).known, false);
  assert.throws(() => operationalWindow({ ...c, travelMinutes: -1 }, now));
  assert.throws(() => operationalWindow({ ...c, start: '2026-10-04T14:00:00' }, now));
});

test('uncertainty prefers feasible reversible plans, but cannot invent feasibility or bypass approval', () => {
  const options = [
    { id: 'commit', feasible: true, reversibility: 'irreversible', requiresApproval: true },
    { id: 'prepare', feasible: true, reversibility: 'reversible', requiresApproval: false },
  ];
  assert.equal(optionalityPlan({ uncertain: true, options }).recommended, 'prepare');
  assert.equal(optionalityPlan({ uncertain: true, options }).humanDecisions, 0);
  assert.equal(
    optionalityPlan({ uncertain: true, deadlinePassed: true, options }).humanDecisions,
    1,
  );
  assert.equal(optionalityPlan({ uncertain: true, options: [] }).humanDecisions, 1);
});

for (const scenario of ['travel', 'money', 'purchase'])
  test(`${scenario}: missing or contradictory receipt stays open, adapts at deadline and closes only after observation`, async () => {
    const engine = new LifeEngine({ pace: 0, now: () => now }),
      w = engine.create();
    engine.change(w, { settings: { confirmationMode: 'delayed' } });
    const r = await engine.start(w, scenario);
    await engine.approve(w, r.id, w.revision);
    assert.equal(r.state, 'outcome.watching');
    assert.equal(r.outcome.verified, false);
    assert.equal(w.outcomeHistory.length, 0);
    assert.equal(w.money.refunds.length, 0);
    const actions = r.actions.length,
      cash = w.resources.cash;
    engine.change(w, { observation: { id: 'clock', kind: 'advance', minutes: 25 } });
    assert.equal(r.state, 'outcome.replanning');
    assert.equal(r.verification.overdue, true);
    assert.equal(r.monitor.plan.recommended, 'evidence');
    assert.equal(r.compression.humanDecisions, 0);
    assert.equal(r.actions.length, actions);
    assert.equal(intelligenceState(w, [], now).state, 'replanning');
    assert.equal(intelligenceState(w, [], now).temporalPressure, 1);
    engine.change(w, { observation: { id: 'clock', kind: 'advance', minutes: 25 } });
    assert.equal(w.clockOffsetMinutes, 25);
    engine.change(w, { observation: { id: 'receipt', kind: 'refund-confirmed' } });
    assert.equal(r.state, 'outcome.restored');
    assert.equal(r.verification.verified, true);
    assert.equal(w.money.refunds.length, 1);
    assert.ok(w.resources.cash > cash);
    engine.change(w, { observation: { id: 'receipt', kind: 'refund-confirmed' } });
    assert.equal(w.money.refunds.length, 1);
    assert.equal(w.outcomeHistory.length, 1);
    assert.equal(r.actions.length, actions);
  });

test('conflicting provider claims remain unverified, direct receipt resolves them and never changes authority', async () => {
  const engine = new LifeEngine({ pace: 0, now: () => now }),
    w = engine.create();
  engine.change(w, { settings: { confirmationMode: 'conflicting' } });
  const constitution = JSON.stringify(w.constitution),
    r = await engine.start(w, 'travel');
  await engine.approve(w, r.id, w.revision);
  assert.equal(r.state, 'contradiction.detected');
  assert.equal(r.verification.status, 'contradicted');
  assert.equal(intelligenceState(w).state, 'contradicted');
  assert.equal(r.compression.humanDecisions, 0);
  engine.change(w, { observation: { id: 'receipt', kind: 'refund-confirmed' } });
  assert.equal(r.outcome.verified, true);
  assert.equal(w.observations.filter((o) => o.entity === `refund:${r.id}`).length, 4);
  assert.equal(JSON.stringify(w.constitution), constitution);
  assert.throws(() =>
    engine.change(w, {
      observation: { id: 'attack', kind: 'refund-confirmed', recipient: 'outside' },
    }),
  );
  assert.throws(() => engine.change(w, { observation: { id: 'attack', kind: 'send_message' } }));
});

test('verification failure re-enters planning and does not manufacture an outcome or duplicate action', async () => {
  const engine = new LifeEngine({ pace: 0, now: () => now }),
    w = engine.create();
  const apply = engine.apply.bind(engine);
  engine.apply = (world, r, op) => {
    if (op.type !== 'activate_backup') apply(world, r, op);
  };
  const r = await engine.start(w, 'home');
  await engine.approve(w, r.id, w.revision);
  assert.equal(r.outcome.verified, false);
  assert.equal(r.monitor.status, 'replanning');
  assert.equal(w.outcomeHistory.length, 0);
  assert.equal(intelligenceState(w).state, 'replanning');
  assert.equal(r.compression.humanDecisions, 0);
});

test('bounded numeric predicates verify required arrival and preparation, not merely an attempted task', () => {
  const intent = {
    id: 'meeting-outcome',
    label: 'Meeting protected',
    predicates: [
      { entity: 'trip', field: 'arrival', operator: 'lte', equals: 9 },
      { entity: 'meeting', field: 'preparation', operator: 'gte', equals: 30 },
    ],
  };
  const observations = [
    { ...fact('arrival', 8, 'trip-receipt', 'direct'), entity: 'trip', field: 'arrival' },
    { ...fact('preparation', 15, 'world', 'direct'), entity: 'meeting', field: 'preparation' },
  ];
  assert.equal(verifyExpectedOutcome(intent, observations, now).verified, false);
  assert.equal(verifyExpectedOutcome(intent, observations, now).next, 'replan');
  observations.push({
    ...fact('preparation-new', 30, 'world', 'direct', now + 1000),
    entity: 'meeting',
    field: 'preparation',
  });
  assert.equal(verifyExpectedOutcome(intent, observations, now + 1000).verified, true);
  assert.throws(() =>
    verifyExpectedOutcome(
      {
        ...intent,
        predicates: [{ entity: 'trip', field: 'arrival', operator: 'execute', equals: 9 }],
      },
      observations,
      now,
    ),
  );
});

test('unchanged settings are not a temporal deviation; changed timing retains before and after', () => {
  const engine = new LifeEngine({ pace: 0, now: () => now }),
    w = engine.create();
  engine.change(w, { settings: { meetingHour: 9, meetingPreparation: 0, meetingTravel: 60 } });
  assert.equal(w.temporalChanges?.length || 0, 0);
  engine.change(w, { settings: { meetingHour: 8.5 } });
  assert.equal(w.temporalChanges.length, 1);
  assert.equal(w.temporalChanges[0].expected.hour, 9);
  assert.equal(w.temporalChanges[0].observed.hour, 8.5);
});
