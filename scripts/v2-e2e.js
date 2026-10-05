import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const origin = process.env.STEWARD_TEST_URL || 'http://localhost:3503';
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await context.newPage(),
  errors = [];
p.on('pageerror', (e) => errors.push(e.message));
const state = () =>
  p.evaluate(async () => {
    const id = sessionStorage.getItem('steward-life-id'),
      token = sessionStorage.getItem('steward-life-token');
    return (
      await fetch('/world/api/sessions/' + id, { headers: { Authorization: 'Bearer ' + token } })
    ).json();
  });
const waitState = async (wanted) => {
  for (let i = 0; i < 200; i++) {
    const r = await state();
    if (r.world?.resolutions.at(-1)?.state === wanted) return;
    await p.waitForTimeout(100);
  }
  throw Error('Timed out waiting for ' + wanted);
};
await p.goto(origin + '/sandbox', { timeout: 120000 });
await p.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
await p.getByRole('button', { name: 'Try Steward →', exact: true }).click();
await p.locator('[data-scenario=travel]').click();
await waitState('decision.pending');
assert.equal((await state()).world.resolutions.at(-1).recommended, 'B');
await p.getByRole('button', { name: 'Change the world ↗' }).click();
await p.locator('#world-update').fill("My meeting isn't important anymore.");
await p.getByRole('button', { name: 'Update world →' }).click();
await p.waitForFunction(() => !document.querySelector('dialog').open);
assert.equal((await state()).world.resolutions.at(-1).recommended, 'A');
await p.getByRole('button', { name: 'Change the world ↗' }).click();
await p.locator('#world-update').fill('My meeting is important.');
await p.getByRole('button', { name: 'Update world →' }).click();
await p.waitForFunction(() => !document.querySelector('dialog').open);
assert.equal((await state()).world.resolutions.at(-1).recommended, 'B');
await p.getByRole('button', { name: 'Approve plan', exact: true }).click();
await waitState('outcome.restored');
await p.getByRole('heading', { name: 'Outcome restored.' }).waitFor();
assert.equal((await state()).world.resources.cash, 4908);
assert.equal((await state()).world.resources.miles, 31000);
console.log(
  'Travel, changed recommendation, approval, counteroffer, negotiation, verification PASS',
);
await p.reload();
await p.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
assert.equal((await state()).world.resources.cash, 4908);
console.log('Reload preserves shared world PASS');
for (const scenario of [
  'events',
  'money',
  'purchase',
  'benefits',
  'work',
  'home',
  'admin',
  'people',
  'opportunity',
]) {
  await p.locator('nav [data-view=try]').click();
  await p.locator('[data-scenario=' + scenario + ']').click();
  await waitState('decision.pending');
  await p.getByRole('button', { name: 'Approve plan', exact: true }).click();
  await waitState('outcome.restored');
  await p.getByRole('heading', { name: 'Outcome restored.' }).waitFor();
  console.log('Scenario', scenario, 'PASS');
}
const final = (await state()).world;
assert.equal(final.outcomeHistory.length, 10);
assert.equal(final.memory.filter((m) => m.kind === 'resolution-history').length, 10);
await p.locator('nav [data-view=connect]').click();
await p.getByRole('heading', { name: 'Connect my life.' }).waitFor();
await p.getByRole('searchbox', { name: 'Search connections' }).fill('Air France');
assert.equal(await p.locator('.connection').count(), 1);
await p.getByRole('button', { name: 'Connect Air France', exact: true }).click();
await p.getByRole('heading', { name: 'Air France for Steward' }).waitFor();
assert.equal(await p.locator('dialog input').count(), 0);
assert.equal(await p.locator('dialog a').count(), 0);
await p.getByRole('button', { name: 'Got it', exact: true }).click();
await p.getByRole('searchbox', { name: 'Search connections' }).fill('');
await p.getByRole('button', { name: 'Transport', exact: true }).click();
assert.ok((await p.locator('.connection').count()) >= 10);
await p.getByRole('button', { name: 'Connect BART', exact: true }).click();
await p.getByRole('button', { name: 'Got it', exact: true }).click();
await p.getByRole('button', { name: 'All', exact: true }).click();
await p.getByRole('button', { name: 'Connect Gmail', exact: true }).click();
await p.getByRole('button', { name: 'Got it', exact: true }).click();
console.log('Connections, search, filters, neutral coming-soon permission sheets, no OAuth PASS');
await p.locator('nav [data-view=home]').click();
await p.locator('[data-reset]').click();
await p.locator('#confirm-reset').click();
await p.waitForFunction(() => !document.querySelector('dialog').open);
await p.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
const changed = p.waitForResponse(
  (r) => r.url().endsWith('/change') && r.request().method() === 'POST',
);
await p.locator('#autonomy').selectOption('rules');
await changed;
assert.equal((await state()).world.settings.autonomy, 'rules');
await p.locator('nav [data-view=try]').click();
await p.locator('[data-scenario=money]').click();
await waitState('outcome.restored');
assert.equal((await state()).world.resolutions.at(-1).humanDecisions, 0);
assert.equal((await state()).world.resources.cash, 5249);
console.log('Reset, safe autonomous recovery, zero approval PASS');
const other = await browser.newContext();
const p2 = await other.newPage();
await p2.goto(origin + '/sandbox', { timeout: 120000 });
await p2.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
const isolated = await p2.evaluate(async () => {
  const id = sessionStorage.getItem('steward-life-id'),
    t = sessionStorage.getItem('steward-life-token');
  return (
    await fetch('/world/api/sessions/' + id, { headers: { Authorization: 'Bearer ' + t } })
  ).json();
});
assert.equal(isolated.world.resources.cash, 5000);
assert.equal(isolated.world.memory.length, 0);
assert.notEqual(isolated.world.id, (await state()).world.id);
const foreignStatus = await p2.evaluate(
  async (foreignId) =>
    (
      await fetch('/world/api/sessions/' + foreignId, {
        headers: { Authorization: 'Bearer ' + sessionStorage.getItem('steward-life-token') },
      })
    ).status,
  (await state()).world.id,
);
assert.equal(foreignStatus, 404);
await other.close();
for (const route of [
  '/presentation',
  '/api/runs',
  '/.env',
  '/.git/config',
  '/approve',
  '/src/mail.js',
])
  assert.equal((await p.request.get(origin + route)).status(), 404);
mkdirSync('.data/v2-proof', { recursive: true });
for (const viewport of [
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 430, height: 932 },
]) {
  await p.setViewportSize(viewport);
  await p.locator('nav [data-view=home]').click();
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await p.locator('nav [data-view=connect]').click();
  await p.getByRole('searchbox', { name: 'Search connections' }).fill('Gmail');
  await p.getByRole('button', { name: 'Connect Gmail', exact: true }).click();
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await p.screenshot({ path: `.data/v2-proof/mobile-${viewport.width}.png` });
  await p.getByRole('button', { name: 'Got it', exact: true }).click();
  await p.locator('nav [data-view=home]').click();
  await p.screenshot({ path: `.data/v2-proof/home-${viewport.width}.png` });
}
assert.deepEqual(errors, []);
writeFileSync(
  '.data/v2-proof/' + (origin.startsWith('https') ? 'production' : 'local') + '.json',
  JSON.stringify({
    origin,
    scenarios: 10,
    changedRecommendation: true,
    worldMutation: true,
    approval: true,
    negotiation: true,
    verification: true,
    reload: true,
    memory: true,
    connections: true,
    noOauth: true,
    isolation: true,
    mobile: [390, 393, 430],
    errors,
  }),
);
await browser.close();
console.log('V2 browser gates PASS:', origin);
