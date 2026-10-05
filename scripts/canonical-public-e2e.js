import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const origin = process.env.STEWARD_TEST_URL || 'http://localhost:3503';
const browser = await chromium.launch();
try {
  const ids = [];
  for (const suffix of ['', '?fbclid=test']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const response = await page.goto(origin + '/sandbox' + suffix, { timeout: 120000 });
    assert.equal(response.status(), 200);
    assert.equal(new URL(page.url()).pathname, '/sandbox');
    await page.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Try Steward →', exact: true }).count(), 1);
    const world = await page.evaluate(async () => {
      const id = sessionStorage.getItem('steward-life-id'),
        token = sessionStorage.getItem('steward-life-token');
      return (
        await fetch('/world/api/sessions/' + id, { headers: { Authorization: 'Bearer ' + token } })
      ).json();
    });
    assert.equal(world.world.resources.cash, 5000);
    assert.equal(world.world.resources.miles, 31000);
    assert.ok(world.world.identity.name.includes('synthetic'));
    ids.push(world.world.id);
    await page.getByRole('button', { name: 'Try Steward →', exact: true }).click();
    assert.equal(await page.locator('[data-scenario]').count(), 10);
    await context.close();
  }
  assert.notEqual(ids[0], ids[1]);
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 393, height: 852 },
    { width: 430, height: 932 },
  ]) {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto(origin + '/sandbox?fbclid=test', { timeout: 120000 });
    await page.getByRole('heading', { name: 'Your world is stable.' }).waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.getByRole('button', { name: 'Try Steward →', exact: true }).click();
    assert.equal(await page.locator('[data-scenario]').count(), 10);
    await context.close();
  }
  const context = await browser.newContext();
  const responseA = await context.request.get(origin + '/sandbox'),
    responseB = await context.request.get(origin + '/sandbox?fbclid=test');
  assert.equal(await responseA.text(), await responseB.text());
  for (const path of [
    '/account',
    '/account/api/me',
    '/account.js',
    '/account.css',
    '/account/oauth/calendar/callback',
    '/account/oauth/gmail/callback',
    '/.env',
    '/presentation',
    '/api/runs',
  ])
    assert.equal((await context.request.get(origin + path)).status(), 404, path);
  console.log(
    'Canonical public routes PASS: direct/query identical, independent synthetic worlds, 10 scenarios, three iPhone widths, private routes denied.',
  );
} finally {
  await browser.close();
}
