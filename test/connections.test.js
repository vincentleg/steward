import test from 'node:test';
import assert from 'node:assert/strict';
import { connections, categories } from '../public/connections.js';
test('connection preview covers life domains with explicit coming-soon and permission boundaries', () => {
  for (const c of connections) {
    assert.equal(c.status, 'COMING SOON');
    assert.ok(c.see && c.understand && c.prepare && c.act);
    assert.ok(!c.authorizationUrl && !c.oauth && !c.credentials);
  }
  assert.equal(new Set(connections.map((c) => c.id)).size, connections.length);
  for (const domain of [
    'Communication',
    'Calendar',
    'Travel',
    'Transport',
    'Money',
    'Purchases',
    'Work',
    'Home',
    'Health',
    'Administration',
    'People',
  ])
    assert.ok(categories.includes(domain));
  for (const name of [
    'Gmail',
    'Partiful',
    'Air France',
    'BART',
    'Clipper',
    'Caltrain',
    'Navigo',
    'SNCF Connect',
    'Apple Health',
    'GitHub',
    'Gmail · work',
  ])
    assert.ok(connections.some((c) => c.name === name));
  assert.match(connections.find((c) => c.name === 'Gmail · work').see, /never personal/);
});
