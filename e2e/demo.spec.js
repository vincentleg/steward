import { test, expect, devices } from '@playwright/test';
for (let iteration = 1; iteration <= 2; iteration++)
  test(`phone approval → desktop continues → cash refund, run ${iteration}`, async ({
    page,
    browser,
  }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await expect(page.getByText('NO DECISIONS NEED YOU.')).toBeVisible();
    await expect(page.locator('.brand-definition')).toHaveText(
      'Sense · Think · Evaluate · Watch · Act · Resolve · Defend',
    );
    await expect(page.getByText('ONE PERSONAL WORLD STATE', { exact: true })).toBeVisible();
    if (iteration === 1) await page.screenshot({ animations: 'disabled', path: 'docs/calm.png' });
    await page.getByRole('button', { name: 'See Steward take over' }).click();
    await expect(page.getByText('Flight cancelled.', { exact: true })).toBeVisible();
    await expect(page.locator('#story-text')).toContainText('one cancellation affected');
    if (iteration === 1) await page.screenshot({ animations: 'disabled', path: 'docs/bloom.png' });
    await expect(page.getByRole('link', { name: 'Approve Steward’s plan' })).toBeVisible({
      timeout: 25000,
    });
    if (iteration === 1)
      await page.screenshot({ animations: 'disabled', path: 'docs/decision.png' });
    const approvalUrl = await page
      .getByRole('link', { name: 'Approve Steward’s plan' })
      .getAttribute('href');
    // Scanner-safe GET must not approve; phone explicitly POSTs by tapping.
    const phone = await browser.newContext({ ...devices['iPhone 13'] });
    const mobile = await phone.newPage();
    await mobile.goto(approvalUrl);
    await expect(mobile.getByRole('button', { name: 'Approve Steward’s plan' })).toBeVisible();
    await page.reload();
    await expect(page.getByText('ONE DECISION NEEDS YOU', { exact: true })).toBeVisible();
    if (iteration === 1)
      await mobile.screenshot({ animations: 'disabled', path: 'docs/phone.png' });
    await mobile.getByRole('button', { name: 'Approve Steward’s plan' }).click();
    await expect(mobile.getByText('PLAN APPROVED ✓', { exact: true })).toBeVisible();
    await expect(page.getByText('APPROVED FROM PHONE', { exact: false })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText('iPhone · just now')).toBeVisible();
    if (iteration === 1)
      await page.screenshot({ animations: 'disabled', path: 'docs/execution.png' });
    // A second POST remains idempotent even after workflow progression.
    const reused = await mobile.request.post(approvalUrl, {
      form: { token: new URL(approvalUrl).searchParams.get('token') },
    });
    expect(reused.status()).toBe(200);
    await mobile.goto(approvalUrl);
    await expect(mobile.getByText('PLAN APPROVED ✓', { exact: true })).toBeVisible();
    await expect(page.getByText('AIRLINE RESPONSE', { exact: false })).toBeVisible({
      timeout: 25000,
    });
    await expect(page.locator('.review-head').filter({ hasText: 'WORTH TO YOU' })).toBeVisible({
      timeout: 10000,
    });
    if (iteration === 1) await page.screenshot({ animations: 'disabled', path: 'docs/offer.png' });
    await expect(page.getByText('OUTCOME RESTORED ✓', { exact: true })).toBeVisible({
      timeout: 25000,
    });
    await expect(page.getByText('$412 CASH REFUNDED', { exact: true })).toBeVisible();
    await expect(page.getByText('0 decisions need you', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('OUTCOME RESTORED ✓', { exact: true })).toBeVisible();
    if (iteration === 1)
      await page.screenshot({ animations: 'disabled', path: 'docs/resolved.png' });
    expect(errors).toEqual([]);
    await phone.close();
  });
test('replay resolves without approval and uses the same event schema', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Replay', exact: false }).click();
  await expect(page.getByText('DETERMINISTIC REPLAY', { exact: true })).toBeVisible();
  await expect(page.getByText('OUTCOME RESTORED ✓', { exact: true })).toBeVisible({
    timeout: 60000,
  });
  await page.getByRole('button', { name: 'Live proof' }).click();
  await expect(page.locator('.proof-meta')).toContainText('REPLAY');
  await expect(page.locator('.proof-events')).toContainText('approval.received');
  const completed = await page.evaluate(() => localStorage.getItem('steward-run'));
  await page.getByRole('button', { name: 'Close live proof' }).click();
  await page.getByRole('button', { name: 'Replay', exact: false }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('steward-run')))
    .not.toBe(completed);
  await expect(page.getByText('OUTCOME RESTORED ✓', { exact: true })).toBeVisible({
    timeout: 60000,
  });
});
test('mobile calm layout fits the viewport', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'See Steward take over' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('stopped transport restores a stopped screen before any cancellation event', async ({
  page,
}) => {
  const id = '00000000-0000-4000-8000-000000000001';
  await page.route(`**/api/runs/${id}`, (route) =>
    route.fulfill({
      json: {
        id,
        mode: 'live',
        state: 'STOPPED',
        stopped: true,
        events: [{ type: 'workflow.stopped', at: new Date().toISOString(), data: {} }],
        actions: {},
      },
    }),
  );
  await page.goto('/');
  await page.evaluate((id) => localStorage.setItem('steward-run', id), id);
  await page.reload();
  await expect(page.getByText('AUTHORITY WITHDRAWN', { exact: true })).toBeVisible();
  await expect(page.getByText('Waiting for the event.', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeHidden();
});
