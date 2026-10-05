import { test, expect, devices } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const url = 'http://localhost:3103/sandbox/travel';
async function audit(page) {
  await page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime))
        .map((a) => a.finished.catch(() => {})),
    );
  });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
}
test('keyboard authority drawer traps focus and restores it; calm passes axe', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'See Steward take over' }).waitFor();
  await audit(page);
  const trigger = page.getByRole('button', { name: 'Constitution' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const close = page.getByRole('button', { name: 'Close constitution' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await audit(page);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
test('reduced-motion iPhone decision and outcome pass axe and fit viewport', async ({
  browser,
}) => {
  const context = await browser.newContext({ ...devices['iPhone 13'], reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(url);
  await page.getByRole('button', { name: 'See Steward take over' }).click();
  const approve = page.getByRole('button', { name: 'Approve Steward’s plan' });
  await approve.waitFor({ timeout: 25000 });
  await audit(page);
  expect(await approve.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(
    44,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    await page
      .locator('.scene')
      .evaluate((el) => parseFloat(getComputedStyle(el).animationDuration)),
  ).toBeLessThanOrEqual(0.001);
  await approve.click();
  await page.getByText('OUTCOME RESTORED ✓', { exact: true }).waitFor({ timeout: 40000 });
  await audit(page);
  await context.close();
});
