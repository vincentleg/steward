import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const origin = process.env.STEWARD_TEST_URL || 'http://localhost:3518';
const browser = await chromium.launch();
mkdirSync('.data/living-proof', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    p = await context.newPage(),
    errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(origin + '/sandbox');
  await p.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
  const frame = () => p.locator('#intelligence-core canvas').evaluate((c) => c.toDataURL());
  const first = await frame();
  await p.waitForTimeout(1100);
  assert.notEqual(await frame(), first);
  assert.equal(await p.locator('#intelligence-core').getAttribute('data-state'), 'stable');
  await p.locator('#intelligence-core').hover();
  await p.mouse.move(1200, 300);
  const a11y = await new AxeBuilder({ page: p }).analyze();
  assert.equal(a11y.violations.length, 0);
  await p.screenshot({ path: '.data/living-proof/desktop.png' });
  const measure = await p.evaluate(async () => {
    let count = 0,
      total = 0;
    const context = document.querySelector('#intelligence-core canvas').getContext('2d');
    const original = context.clearRect;
    context.clearRect = function (...args) {
      count++;
      const t = performance.now();
      const result = original.apply(this, args);
      total += performance.now() - t;
      return result;
    };
    await new Promise((r) => setTimeout(r, 1200));
    context.clearRect = original;
    return { draws: count, total };
  });
  assert.ok(measure.draws >= 5 && measure.draws <= 40, JSON.stringify(measure));
  await p.getByRole('button', { name: 'Try Steward →', exact: true }).click();
  await p.locator('[data-scenario=travel]').click();
  await p.getByRole('button', { name: 'Approve plan', exact: true }).waitFor();
  assert.equal(await p.locator('#intelligence-core').getAttribute('data-state'), 'needs-you');
  await p.getByRole('heading', { name: 'The commitment over $92 additional cost.' }).waitFor();
  await p.getByRole('button', { name: 'Change the world ↗', exact: true }).click();
  await p.locator('[name=meetingPreparation]').fill('180');
  await p.getByRole('button', { name: 'Apply rules', exact: true }).click();
  await p
    .getByText('No plan meets every constraint. Change the world to resolve the conflict.')
    .waitFor();
  assert.equal(await p.getByRole('button', { name: 'Approve plan', exact: true }).count(), 0);
  await p.getByRole('button', { name: 'Change the world ↗', exact: true }).click();
  await p.locator('[name=meetingPreparation]').fill('30');
  await p.getByRole('button', { name: 'Apply rules', exact: true }).click();
  await p.getByRole('button', { name: 'Approve plan', exact: true }).click();
  await p.getByRole('heading', { name: 'Outcome restored.', exact: true }).waitFor();
  await p.waitForTimeout(8500);
  assert.equal(await p.locator('#intelligence-core').getAttribute('data-state'), 'stable');
  await p.reload();
  await p.getByRole('button', { name: 'Try Steward →', exact: true }).waitFor();
  assert.ok(await p.locator('#intelligence-core canvas').count());
  for (const width of [390, 393, 430]) {
    await p.setViewportSize({ width, height: width === 430 ? 932 : 852 });
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  await p.screenshot({ path: '.data/living-proof/mobile.png' });
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitForTimeout(750); // allow the one-time mode-change redraw to settle
  const reduced = await frame();
  await p.waitForTimeout(700);
  assert.equal(await frame(), reduced);
  assert.equal(await p.locator('.core-caption').textContent(), 'STEWARD IS WATCHING');
  assert.deepEqual(errors, []);
  console.log(
    'Living Core PASS: continuous life, workflow state, constraint-driven plan change, return to calm, reload, three phone widths, reduced motion, axe, bounded draw rate.',
  );
} finally {
  await browser.close();
}
