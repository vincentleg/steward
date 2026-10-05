import test from 'node:test';
import assert from 'node:assert/strict';
import {
  commitmentModel,
  temporalConsequences,
  temporalFutures,
  meaningfulChange,
  graphConsequences,
  worthToYou,
} from '../src/core/outcome-intelligence.js';
import { intelligenceState } from '../src/core/intelligence-state.js';
import { impactGraph } from '../src/core/impact.js';
import { LifeEngine } from '../src/core/life-engine.js';

test('commitment facts and preferences remain separate; absence is unknown, never invented', () => {
  const model = commitmentModel({
    id: 'a',
    start: '2026-10-05T09:00:00Z',
    source: 'google-calendar',
    importance: 'unknown',
  });
  assert.equal(model.preferences.importance, null);
  assert.equal(model.preferences.travelMinutes, null);
  assert.equal(model.facts.provenance, 'google-calendar');
  assert.equal(model.financialExposure, null);
  assert.equal(model.preferenceSource, 'Unknown');
  assert.equal(
    commitmentModel({ id: 'a' }, { importance: 'must-protect', preparationMinutes: 30 })
      .preferenceSource,
    'Explicit user rule',
  );
});
test('time dependencies derive from observed times and explicit buffers, not location guesses', () => {
  const events = [
    { id: 'a', start: '2026-10-05T09:00:00Z', end: '2026-10-05T10:00:00Z' },
    { id: 'b', start: '2026-10-05T10:20:00Z', end: '2026-10-05T11:00:00Z' },
  ];
  const now = Date.parse('2026-10-04');
  assert.equal(temporalConsequences(events, {}, now).length, 0);
  const prefs = {
    a: { importance: 'optional' },
    b: { importance: 'must-protect', travelMinutes: 15, preparationMinutes: 30 },
  };
  const c = temporalConsequences(events, prefs, now)[0];
  assert.equal(c.minutes, 25);
  assert.equal(c.kind, 'inference');
  const plan = temporalFutures(c, events, prefs);
  assert.equal(plan.recommended, 'protect-next');
  assert.equal(plan.humanDecisions, 0);
  assert.equal(plan.externalActions, 0);
  assert.equal(plan.verified, false);
  assert.equal(temporalFutures(c, events, {}).humanDecisions, 1);
});
test('meaningful changes distinguish harmless metadata edits from threatened outcomes', () => {
  const base = { start: '2026-10-05T09:00:00Z', title: 'A' };
  assert.equal(meaningfulChange(base, { ...base, title: 'B' }).changed, false);
  assert.equal(
    meaningfulChange(base, { ...base, start: '2026-10-05T10:00:00Z' }).meaningful,
    false,
  );
  assert.equal(
    meaningfulChange(base, { ...base, start: '2026-10-05T10:00:00Z' }, [{ kind: 'inference' }])
      .meaningful,
    true,
  );
  assert.equal(meaningfulChange(base, { ...base, status: 'cancelled' }).meaningful, true);
});
test('graph consequences preserve typed dependencies, direct vs dependent, and uncertainty; cycles bounded', () => {
  const graph = impactGraph({
    contextId: 'personal',
    sourceId: 'flight',
    nodes: ['flight', 'meeting', 'person'].map((id) => ({ id, contextId: 'personal' })),
    edges: [
      { from: 'flight', to: 'meeting', relation: 'THREATENS' },
      { from: 'meeting', to: 'person', relation: 'INVOLVES' },
      { from: 'person', to: 'meeting' },
    ],
  });
  const consequences = graphConsequences(graph);
  assert.equal(consequences[0].direct, true);
  assert.equal(consequences[1].direct, false);
  assert.equal(consequences[1].confidence, null);
  assert.equal(consequences[1].kind, 'inference');
  assert.throws(() =>
    impactGraph({
      contextId: 'personal',
      sourceId: 'a',
      nodes: [{ id: 'a', contextId: 'personal' }],
      edges: [{ from: 'a', to: 'a', relation: 'GRANT PERMISSION' }],
    }),
  );
});
test('preparation and travel constraints change actual futures and invalidate obsolete approval', async () => {
  const e = new LifeEngine({ pace: 0 }),
    w = e.create(),
    r = await e.start(w, 'travel');
  assert.equal(r.recommended, 'B');
  assert.ok(r.worth.tradeoffs.length);
  assert.equal(r.worth.score, null);
  const oldRevision = w.revision;
  e.change(w, { settings: { meetingPreparation: 180, meetingTravel: 60 } });
  assert.equal(r.recommended, null);
  assert.equal(r.state, 'needs.information');
  await assert.rejects(e.approve(w, r.id, oldRevision));
  assert.equal(w.ledger.length, 0);
  e.change(w, { settings: { meetingImportance: 0 } });
  assert.equal(r.recommended, 'A');
  assert.equal(w.memory.at(-1).kind, 'current-constraint');
  assert.deepEqual(w.constitution, e.create().constitution); // frozen policy unchanged in substance
});
test('Core state is driven by observable workflow and priority state, never fake thoughts', () => {
  assert.equal(intelligenceState({}).state, 'stable');
  for (const [state, visual] of [
    ['impact.understood', 'modeling'],
    ['futures.simulated', 'simulating'],
    ['decision.pending', 'needs-you'],
    ['outcome.verifying', 'verifying'],
    ['outcome.restored', 'resolved'],
  ])
    assert.equal(intelligenceState({ resolutions: [{ state }] }).state, visual);
  assert.equal(intelligenceState({}, [{ status: 'needs-you' }]).state, 'needs-you');
});

test('observe-only compression needs zero human decisions and authorizes no actions', async () => {
  const engine = new LifeEngine({ pace: 0 }),
    w = engine.create();
  engine.change(w, { settings: { autonomy: 'observe' } });
  const r = await engine.start(w, 'travel');
  assert.equal(r.state, 'observing');
  assert.equal(r.compression.humanDecisions, 0);
  assert.deepEqual(r.compression.automaticActions, []);
  assert.equal(w.ledger.length, 0);
});
