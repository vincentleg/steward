import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
const origin = process.env.STEWARD_TEST_URL || 'http://localhost:3519';
const browser = await chromium.launch();
mkdirSync('.data/temporal-proof', { recursive: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    p = await context.newPage(),
    errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const state = () =>
    p.evaluate(async () =>
      (
        await fetch('/world/api/sessions/' + sessionStorage.getItem('steward-life-id'), {
          headers: { Authorization: 'Bearer ' + sessionStorage.getItem('steward-life-token') },
        })
      ).json(),
    );
  const wait = async (wanted) => {
    for (let i = 0; i < 300; i++) {
      if ((await state()).world?.resolutions.at(-1)?.state === wanted) return;
      await p.waitForTimeout(100);
    }
    throw Error('Timeout: ' + wanted);
  };
  await p.goto(origin + '/sandbox?fbclid=test', { timeout: 120000 });
  await p.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
  await p.getByRole('button', { name: 'Change the world', exact: true }).click();
  await p.locator('[name=confirmationMode]').selectOption('delayed');
  await p.getByRole('button', { name: 'Apply rules', exact: true }).click();
  await p.waitForFunction(() => !document.querySelector('dialog').open);
  await p.getByRole('button', { name: 'Try Steward →', exact: true }).click();
  await p.locator('[data-scenario=travel]').click();
  await wait('decision.pending');
  await p.getByRole('button', { name: 'Change the world ↗', exact: true }).click();
  await p.locator('[name=meetingHour]').fill('8.5');
  await p.getByRole('button', { name: 'Apply rules', exact: true }).click();
  await p.waitForFunction(() => !document.querySelector('dialog').open);
  await p.getByRole('heading', { name: 'The time changed. The dependencies follow.' }).waitFor();
  assert.equal((await state()).world.temporalChanges.at(-1).observed.hour, 8.5);
  await p.getByRole('button', { name: 'Approve plan', exact: true }).click();
  await wait('outcome.watching');
  await p.getByRole('heading', { name: 'Requested is not received.' }).waitFor();
  await p.waitForTimeout(900);
  assert.equal(await p.locator('#intelligence-core').getAttribute('data-state'), 'watching');
  const pending = (await state()).world;
  assert.equal(pending.outcomeHistory.length, 0);
  assert.equal(pending.money.refunds.length, 0);
  await p.screenshot({ path: '.data/temporal-proof/watching-desktop.png', fullPage: true });
  await p.getByRole('button', { name: 'Let 25 minutes pass', exact: true }).click();
  await wait('outcome.replanning');
  await p.waitForTimeout(700);
  assert.equal(await p.locator('#intelligence-core').getAttribute('data-state'), 'replanning');
  assert.equal(
    (await state()).world.resolutions.at(-1).actions.length,
    pending.resolutions.at(-1).actions.length,
  );
  const a11y = await new AxeBuilder({ page: p }).analyze();
  assert.equal(a11y.violations.length, 0, JSON.stringify(a11y.violations.map((v) => v.id)));
  await p.reload();
  await p.getByRole('heading', { name: 'Your world needs attention.' }).waitFor();
  await p.locator('[data-resolution]').first().click();
  await p.getByRole('heading', { name: 'Requested is not received.' }).waitFor();
  await p.getByRole('button', { name: 'Introduce cash receipt', exact: true }).click();
  await wait('outcome.restored');
  await p.getByRole('heading', { name: 'Evidence closes the loop.' }).waitFor();
  assert.equal((await state()).world.money.refunds.length, 1);
  await p.screenshot({ path: '.data/temporal-proof/resolved-desktop.png', fullPage: true });
  await p.getByRole('button', { name: 'Reset world', exact: true }).click();
  await p.getByRole('button', { name: 'Reset world', exact: true }).last().click();
  await p.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
  await p.getByRole('button', { name: 'Change the world', exact: true }).click();
  await p.locator('[name=confirmationMode]').selectOption('conflicting');
  await p.getByRole('button', { name: 'Apply rules', exact: true }).click();
  await p.waitForFunction(() => !document.querySelector('dialog').open);
  await p.getByRole('button', { name: 'Try Steward →', exact: true }).click();
  await p.locator('[data-scenario=money]').click();
  await wait('decision.pending');
  await p.getByRole('button', { name: 'Approve plan', exact: true }).click();
  await wait('contradiction.detected');
  await p.waitForTimeout(700);
  assert.equal(await p.locator('#intelligence-core').getAttribute('data-state'), 'contradicted');
  await p.getByText('Evidence & conflicting claims', { exact: true }).click();
  assert.ok(await p.getByText('provider-status', { exact: true }).count());
  assert.ok(await p.getByText('fulfillment-status', { exact: true }).count());
  await p.screenshot({ path: '.data/temporal-proof/contradiction-desktop.png', fullPage: true });
  for (const [width, height] of [
    [390, 844],
    [393, 852],
    [430, 932],
  ]) {
    await p.setViewportSize({ width, height });
    await p.waitForTimeout(200);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await p.locator('.continuity-panel').scrollIntoViewIfNeeded();
    await p.screenshot({ path: '.data/temporal-proof/contradiction-' + width + '.png' });
    assert.equal((await new AxeBuilder({ page: p }).analyze()).violations.length, 0);
  }
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitForTimeout(100);
  const image = await p.locator('#intelligence-core canvas').evaluate((c) => c.toDataURL());
  await p.waitForTimeout(700);
  assert.ok(
    (await p.locator('#intelligence-core canvas').evaluate((c) => c.toDataURL())) === image,
    'Reduced motion remains still without new evidence',
  );
  await p.getByRole('button', { name: 'Introduce cash receipt', exact: true }).click();
  await wait('outcome.restored');
  assert.equal((await state()).world.resolutions.at(-1).verification.status, 'restored');
  const other = await browser.newContext(),
    q = await other.newPage();
  await q.goto(origin + '/sandbox');
  await q.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
  assert.equal(
    await q.evaluate(async () => {
      const w = (
        await (
          await fetch('/world/api/sessions/' + sessionStorage.getItem('steward-life-id'), {
            headers: { Authorization: 'Bearer ' + sessionStorage.getItem('steward-life-token') },
          })
        ).json()
      ).world;
      return w.observations.length;
    }),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    'Temporal product PASS: expected/observed time, delayed receipt, overdue replan, independent confirmation, contradiction preservation/resolution, 0 additional decisions, reload/reset, isolated worlds, three mobile widths, reduced motion, axe.',
  );
} finally {
  await browser.close();
}
