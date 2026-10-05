import { test, expect, devices } from '@playwright/test';
const url = 'http://localhost:3103/sandbox/travel';
test('anonymous desktop and phone sessions recover independently without email', async ({
  browser,
}) => {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } }),
    phone = await browser.newContext({ ...devices['iPhone 13'] });
  const a = await desktop.newPage(),
    b = await phone.newPage();
  const errors = [];
  for (const p of [a, b]) p.on('pageerror', (e) => errors.push(e.message));
  await a.goto(url);
  await b.goto(url);
  await expect(a.getByText('No account. No personal data. No connected accounts.')).toBeVisible();
  await a.getByRole('button', { name: 'Constitution' }).click();
  await expect(a.getByRole('heading', { name: 'Steward Constitution' })).toBeVisible();
  await expect(a.getByText('Maximum intelligence. Minimum necessary authority.')).toBeVisible();
  await a.getByRole('button', { name: 'Close constitution' }).click();
  await a.getByRole('button', { name: 'See Steward take over' }).click();
  await b.getByRole('button', { name: 'See Steward take over' }).click();
  await expect(a.getByRole('button', { name: 'Approve Steward’s plan' })).toBeVisible({
    timeout: 20000,
  });
  await expect(b.getByRole('button', { name: 'Approve Steward’s plan' })).toBeVisible();
  expect(await a.evaluate(() => sessionStorage.getItem('steward-public-run'))).not.toBe(
    await b.evaluate(() => sessionStorage.getItem('steward-public-run')),
  );
  await a.screenshot({ path: 'docs/public-decision.png', animations: 'disabled' });
  await a.getByRole('button', { name: 'Approve Steward’s plan' }).click();
  await expect(a.getByText('APPROVED BY YOU', { exact: false })).toBeVisible();
  await expect(b.getByRole('button', { name: 'Approve Steward’s plan' })).toBeVisible();
  await b.screenshot({ path: 'docs/public-phone.png', animations: 'disabled' });
  expect(await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await b.getByRole('button', { name: 'Approve Steward’s plan' }).click();
  await expect(a.getByText('OUTCOME RESTORED ✓', { exact: true })).toBeVisible({ timeout: 40000 });
  await expect(b.getByText('OUTCOME RESTORED ✓', { exact: true })).toBeVisible({ timeout: 10000 });
  await a.reload();
  await b.reload();
  await expect(a.getByText('OUTCOME RESTORED ✓', { exact: true })).toBeVisible();
  await expect(b.getByText('OUTCOME RESTORED ✓', { exact: true })).toBeVisible();
  await expect(
    b.getByText('6 outcome checks passed. Action receipts independently verified.'),
  ).toBeVisible();
  await a.getByRole('button', { name: 'Live proof' }).click();
  await expect(a.locator('.proof-meta')).toContainText('No email sent');
  await expect(a.locator('.proof-events')).toContainText('outcome.verified');
  expect(errors).toEqual([]);
  await desktop.close();
  await phone.close();
});
test('public visitor can stop before authorizing action', async ({ page }) => {
  await page.goto(url);
  await page.getByRole('button', { name: 'See Steward take over' }).click();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByText('AUTHORITY WITHDRAWN', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve Steward’s plan' })).toHaveCount(0);
});
