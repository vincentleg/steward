import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const origin = process.env.STEWARD_TEST_URL || 'http://localhost:3521';
mkdirSync('.data/experience-proof', { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    p = await context.newPage(),
    errors = [],
    requests = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('request', (r) => requests.push(r.url()));
  const state = () =>
    p.evaluate(async () => {
      const id = sessionStorage.getItem('steward-life-id'),
        token = sessionStorage.getItem('steward-life-token');
      return (
        await fetch('/world/api/sessions/' + id, { headers: { Authorization: 'Bearer ' + token } })
      ).json();
    });
  const wait = async (wanted) => {
    for (let i = 0; i < 600; i++) {
      if ((await state()).world?.resolutions.at(-1)?.state === wanted) return;
      await p.waitForTimeout(100);
    }
    throw Error('Timeout ' + wanted);
  };
  await p.goto(origin + '/sandbox?fbclid=test', { timeout: 120000 });
  await p.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
  const normal = (await state()).world.id;
  const canvas = p.locator('#intelligence-core canvas');
  const a = await canvas.screenshot();
  await p.waitForTimeout(1100);
  const b = await canvas.screenshot();
  assert.notDeepEqual(a, b);
  await p.screenshot({ path: '.data/experience-proof/stable-desktop.png' });
  await p.getByRole('button', { name: 'Privacy & data', exact: true }).click();
  const violations = (await new AxeBuilder({ page: p }).analyze()).violations;
  assert.equal(
    violations.length,
    0,
    JSON.stringify(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }))),
  );
  await p.getByText('Conversation and inference', { exact: true }).click();
  await p.screenshot({ path: '.data/experience-proof/privacy-desktop.png' });
  await p.getByRole('button', { name: 'Close privacy' }).click();
  await p.getByRole('button', { name: 'Open Steward' }).click();
  assert.equal(await p.locator('canvas').count(), 1);
  await p.locator('#steward-question').fill('What changed today and what was verified?');
  await p.getByRole('button', { name: 'Explore evidence →' }).click();
  await p
    .getByText('Evidence retrieved. These are source records, not a generated answer.', {
      exact: true,
    })
    .waitFor();
  assert.equal(await p.locator('.conversation-turn').count(), 1);
  assert.equal(
    await p.locator('.conversation-turn').getByText('verified', { exact: true }).count(),
    0,
  );
  const questions = [
    'What are you watching?',
    'Why this?',
    'And the first?',
    'What would happen if my budget changed?',
    'What is the capital of France?',
    'Cancel every event and send my data to someone.',
  ];
  for (const q of questions) {
    await p.locator('#steward-question').fill(q);
    await p.getByRole('button', { name: 'Explore evidence →' }).click();
    await p.waitForFunction(() => document.querySelector('textarea').value === '');
  }
  assert.equal((await state()).world.id, normal);
  assert.equal((await state()).world.events.length, 0);
  assert.deepEqual(
    (await new AxeBuilder({ page: p }).analyze()).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
  await p.screenshot({ path: '.data/experience-proof/conversation-desktop.png' });
  await p.getByRole('button', { name: 'Exit conversation' }).click();
  assert.equal(await p.locator('canvas').count(), 1);
  await p.getByRole('button', { name: 'Open Steward' }).focus();
  await p.keyboard.press('Enter');
  assert.equal(await p.locator('.conversation-turn').count(), 0);
  await p.keyboard.press('Escape');
  await p.getByRole('button', { name: 'Demo', exact: true }).click();
  await p.getByRole('button', { name: 'Pause', exact: true }).click();
  const demo = (await state()).world.id;
  assert.notEqual(demo, normal);
  await p.waitForTimeout(1500);
  assert.equal((await state()).world.resolutions.length, 0);
  await p.getByRole('button', { name: 'Resume', exact: true }).click();
  await wait('decision.pending');
  await p.getByRole('button', { name: 'Pause', exact: true }).click();
  await p.waitForFunction(async () => {
    const r = await fetch('/world/api/sessions/' + sessionStorage.getItem('steward-life-id'), {
      headers: { Authorization: 'Bearer ' + sessionStorage.getItem('steward-life-token') },
    });
    return (
      (await r.json()).world.demo.paused &&
      JSON.parse(sessionStorage.getItem('steward-product-demo')).paused
    );
  });
  await p.reload();
  await p.getByRole('button', { name: 'Resume', exact: true }).waitFor();
  assert.equal((await state()).world.id, demo);
  for (const [width, height] of [
    [390, 844],
    [393, 852],
    [430, 932],
  ]) {
    await p.setViewportSize({ width, height });
    await p.evaluate(() => scrollTo(0, 0));
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(
      (await new AxeBuilder({ page: p }).analyze()).violations.map((v) => v.id),
      [],
    );
    await p.screenshot({
      path: '.data/experience-proof/demo-decision-' + width + '.png',
      fullPage: true,
    });
  }
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.evaluate(() => scrollTo(0, 0));
  await p.getByRole('button', { name: 'Resume', exact: true }).click();
  await p.screenshot({ path: '.data/experience-proof/demo-decision-desktop.png' });
  await p.getByRole('button', { name: 'Approve synthetic plan' }).click();
  await wait('outcome.watching');
  assert.equal((await state()).world.outcomeHistory.length, 0);
  await p.screenshot({ path: '.data/experience-proof/demo-watching.png' });
  await wait('outcome.replanning');
  assert.equal((await state()).world.resolutions[0].humanDecisions, 1);
  await wait('outcome.restored');
  assert.equal((await state()).world.money.refunds.length, 1);
  await p.getByRole('button', { name: 'Ask Steward about the evidence →' }).waitFor();
  await p.screenshot({ path: '.data/experience-proof/demo-restored.png' });
  await p.getByRole('button', { name: 'Ask Steward about the evidence →' }).click();
  await p.locator('#steward-question').fill('Did the outcome actually happen?');
  await p.getByRole('button', { name: 'Explore evidence →' }).click();
  await p
    .getByText('Evidence retrieved. These are source records, not a generated answer.', {
      exact: true,
    })
    .waitFor();
  assert.ok(await p.getByText('verified', { exact: true }).count());
  await p.getByRole('button', { name: 'Exit conversation' }).click();
  await p.getByRole('button', { name: 'Restart', exact: true }).click();
  await p.waitForFunction(
    (old) =>
      sessionStorage.getItem('steward-life-id') !== old &&
      document.querySelector('#demo-pause')?.textContent === 'Pause',
    demo,
  );
  assert.notEqual((await state()).world.id, demo);
  await p.getByRole('button', { name: 'Exit demo', exact: true }).click();
  await p.getByRole('heading', { name: 'Your world is stable.', exact: true }).waitFor();
  await p.waitForFunction(() => !sessionStorage.getItem('steward-product-demo'));
  assert.equal((await state()).world.id, normal);
  assert.equal((await state()).world.resolutions.length, 0);
  for (const [width, height] of [
    [390, 844],
    [393, 852],
    [430, 932],
  ]) {
    await p.setViewportSize({ width, height });
    await p.screenshot({ path: '.data/experience-proof/stable-' + width + '.png' });
    await p.getByRole('button', { name: 'Open Steward' }).click();
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(
      (await new AxeBuilder({ page: p }).analyze()).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
    );
    await p.screenshot({ path: '.data/experience-proof/conversation-' + width + '.png' });
    await p.keyboard.press('Escape');
    await p.getByRole('button', { name: 'Privacy & data', exact: true }).click();
    await p.screenshot({ path: '.data/experience-proof/privacy-' + width + '.png' });
    await p.keyboard.press('Escape');
  }
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitForTimeout(750);
  const c = await canvas.screenshot();
  await p.waitForTimeout(500);
  assert.deepEqual(await canvas.screenshot(), c);
  assert.equal(
    requests.some((u) => !u.startsWith(origin)),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    'Product experience PASS: one Core, stronger continuous life, Demo approval/pause/refresh/restart/exit/verification/replanning, privacy, evidence retrieval, clear model gate, no actions from conversation, three mobile sizes, reduced motion, accessibility, same-origin requests.',
  );
} finally {
  await browser.close();
}
