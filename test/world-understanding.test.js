import test from 'node:test';
import assert from 'node:assert/strict';
import { understandWorld } from '../src/core/world-understanding.js';

test('operational projection excludes history and cancellation without mutating connected state', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');
  const world = {
    mode: 'connected',
    commitments: [
      { id: 'old', title: 'Past', start: '2021-01-01', end: '2021-01-02' },
      { id: 'later', title: 'Later', start: '2026-10-06', end: '2026-10-07' },
      { id: 'next', title: 'Next', start: '2026-10-05', end: '2026-10-06' },
      { id: 'cancelled', status: 'cancelled', start: '2026-10-05' },
    ],
  };
  const before = JSON.stringify(world);
  const u = understandWorld(world, { now });
  assert.deepEqual(
    u.next.map((c) => c.id),
    ['next', 'later'],
  );
  assert.equal(u.next[0].importance, 'unknown');
  assert.equal(u.unknowns.length, 2);
  assert.deepEqual(u.protections, ['Observation only', 'No external actions']);
  assert.equal(JSON.stringify(world), before);
});

test('synthetic projection reflects changed rules and actual dependencies; does not invent data', () => {
  const world = {
    commitments: [{ id: 'meeting', label: 'Commitment', hour: 9 }],
    dependencies: [['flight', 'meeting']],
    settings: { maxSpend: 100, preserveMiles: true, autonomy: 'observe' },
    goals: [{ id: 'goal', label: 'Protect commitment' }],
  };
  const u = understandWorld(world);
  assert.equal(u.dependencies[0].to, 'meeting');
  assert.ok(u.protections.includes('Spending ceiling: $100'));
  assert.ok(u.protections.includes('Authority: observe'));
  world.settings.maxSpend = 0;
  assert.ok(understandWorld(world).protections.includes('Spending ceiling: $0'));
  assert.equal(understandWorld(null), null);
});
