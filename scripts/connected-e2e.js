import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { PrivateStore } from '../src/connected/store.js';
import { privateServer } from '../src/connected/http.js';
import { createServer } from 'node:net';
const store = new PrivateStore({ filename: ':memory:', encryptionKey: randomBytes(32) });
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
const port = reservation.address().port;
await new Promise((resolve) => reservation.close(resolve));
const base = `http://localhost:${port}`;
const server = privateServer({ store, origin: base });
await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
const browser = await chromium.launch();
try {
  const a = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await a.newPage();
  page.on('pageerror', (error) => console.log('Private UI error:', error.message));
  await page.goto(`${base}/account`);
  await page.getByLabel('Account name').fill('browseralice');
  await page.getByLabel('Password').fill('long-browser-password-A');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('heading', { name: '0 decisions need you' }).waitFor();
  const owner = store.db.prepare('SELECT id FROM users WHERE login=?').get('browseralice').id;
  store.put(owner, 'world', 'connected', {
    mode: 'connected',
    commitments: [
      { id: 'private-event', title: 'A private commitment', start: '2026-10-08T09:00:00Z' },
    ],
  });
  await page.reload();
  await page.getByText('A private commitment').waitFor();
  await page.getByRole('button', { name: 'What matters for this commitment' }).click();
  await page.getByLabel('Importance', { exact: true }).selectOption('must-protect');
  await page.getByLabel('Preparation (minutes, blank if unknown)').fill('30');
  await page.getByLabel('Travel buffer (minutes, blank if unknown)').fill('15');
  mkdirSync('.data/living-proof', { recursive: true });
  await page.screenshot({ path: '.data/living-proof/private-rules.png' });
  await page.getByRole('button', { name: 'Save internal preferences' }).click();
  await page.getByText('priority must-protect', { exact: false }).waitFor();
  assert.equal(
    store.get(owner, 'world', 'connected').commitmentAnnotations['private-event']
      .preparationMinutes,
    30,
  );
  assert.equal(store.list(owner, 'action').length, 0);
  assert.equal(store.list(owner, 'memory')[0].category, 'explicit-rule');

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 393, height: 852 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
  }
  await page.getByRole('button', { name: 'Open Steward' }).click();
  await page.locator('#steward-question').fill('Which commitment is in my world?');
  await page.getByRole('button', { name: 'Explore evidence →' }).click();
  await page
    .getByText('Evidence retrieved. These are source records, not a generated answer.', {
      exact: true,
    })
    .waitFor();
  assert.ok(
    await page
      .locator('#conversation-turns summary')
      .filter({ hasText: 'A private commitment' })
      .count(),
  );
  await page.screenshot({ path: '.data/experience-proof/private-conversation.png' });
  await page.getByRole('button', { name: 'Exit conversation' }).click();
  const exported = await page.evaluate(async () => (await fetch('/account/api/export')).json());
  assert.ok(JSON.stringify(exported).includes('A private commitment'));
  assert.equal(JSON.stringify(exported).includes('password'), false);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('heading', { name: 'Your private Steward' }).waitFor();
  assert.equal(await page.getByText('A private commitment').count(), 0);
  await page.getByLabel('Account name').fill('browserbob');
  await page.getByLabel('Password').fill('long-browser-password-B');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('heading', { name: '0 decisions need you' }).waitFor();
  assert.equal(await page.getByText('A private commitment').count(), 0);
  assert.equal(
    await page.getByRole('button', { name: 'Review permissions' }).first().isDisabled(),
    true,
  );
  await page.getByRole('button', { name: 'Open Steward' }).click();
  await page.locator('#steward-question').fill('A private commitment');
  await page.getByRole('button', { name: 'Explore evidence →' }).click();
  await page
    .getByText('Evidence retrieved. These are source records, not a generated answer.', {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page
      .locator('#conversation-turns summary')
      .filter({ hasText: 'A private commitment' })
      .count(),
    0,
  );
  await page.getByRole('button', { name: 'Exit conversation' }).click();
  const incognito = await browser.newContext();
  const incognitoPage = await incognito.newPage();
  await incognitoPage.goto(`${base}/account`);
  await incognitoPage.getByRole('heading', { name: 'Your private Steward' }).waitFor();
  assert.equal(await incognitoPage.getByText('A private commitment').count(), 0);
  console.log(
    'Private development browser PASS: actual account signup, shared-device logout/A→B, incognito, three mobile widths; Google remains unconfigured.',
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  store.close();
}
