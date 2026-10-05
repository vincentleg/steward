import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const origin = process.env.STEWARD_TEST_URL || 'http://localhost:3503',
  browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const state = () =>
  page.evaluate(async () => {
    const id = sessionStorage.getItem('steward-life-id'),
      t = sessionStorage.getItem('steward-life-token');
    return (
      await fetch('/world/api/sessions/' + id, { headers: { Authorization: 'Bearer ' + t } })
    ).json();
  });
const wait = async (desired) => {
  for (let i = 0; i < 180; i++) {
    if ((await state()).world.resolutions.at(-1)?.state === desired) return;
    await page.waitForTimeout(100);
  }
  throw Error('State timeout: ' + desired);
};
const axe = async (name) => {
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  assert.deepEqual(
    report.violations.map((v) => v.id),
    [],
    name,
  );
};
await page.goto(origin + '/sandbox', { timeout: 120000 });
await page.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
await axe('home');
await page.locator('nav [data-view=try]').click();
await axe('scenario library');
await page.locator('[data-scenario=travel]').click();
await wait('decision.pending');
await page.locator('#approve').waitFor();
await axe('decision');
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
mkdirSync('.data/v2-proof', { recursive: true });
await page.screenshot({ path: '.data/v2-proof/mobile-decision.png', fullPage: true });
await page.locator('#approve').click();
await wait('outcome.restored');
await page.getByRole('heading', { name: 'Outcome restored.' }).waitFor();
await axe('outcome');
assert.equal((await state()).world.resources.cash, 4908);
await page.locator('nav [data-view=home]').click();
await page.locator('[data-change]').first().click();
await page.locator('select[name=calendarPriority]').selectOption('personal');
await page.getByRole('button', { name: 'Apply rules', exact: true }).click();
await page.waitForFunction(() => !document.querySelector('dialog').open);
await page.locator('nav [data-view=try]').click();
await page.locator('[data-scenario=events]').click();
await wait('decision.pending');
assert.equal((await state()).world.resolutions.at(-1).recommended, 'decline');
await page.locator('#approve').click();
await wait('outcome.restored');
await page.locator('nav [data-view=connect]').click();
await page.getByRole('searchbox', { name: 'Search connections' }).fill('Gmail');
await axe('connection search');
await page.getByRole('button', { name: 'Connect Gmail', exact: true }).click();
await axe('coming soon');
await page.keyboard.press('Escape');
assert.equal(await page.locator('#sheet').evaluate((e) => e.open), false);
assert.equal(await page.evaluate(() => document.activeElement.dataset.connect), 'communication-0');
await page.locator('nav [data-view=home]').click();
await context.setOffline(true);
await page.locator('[data-change]').first().click();
await page.locator('#world-update').fill('I need to preserve my miles.');
await page.getByRole('button', { name: 'Update world →' }).click();
await page.waitForTimeout(250);
assert.ok(await page.getByRole('heading', { name: 'Change the world.' }).isVisible());
await context.setOffline(false);
await page.getByRole('button', { name: 'Close dialog' }).click();
assert.deepEqual(errors, []);
writeFileSync(
  '.data/v2-proof/' + (origin.startsWith('https') ? 'production-mobile' : 'local-mobile') + '.json',
  JSON.stringify({
    origin,
    mobileTravel: true,
    approval: true,
    outcome: true,
    personalization: true,
    changedCalendarRecommendation: true,
    keyboardFocus: true,
    offlineRecovery: true,
    axeViolations: 0,
    errors,
  }),
);
await browser.close();
console.log(
  'Mobile travel/approval/outcome, structured personalization, keyboard, accessibility, offline recovery PASS:',
  origin,
);
