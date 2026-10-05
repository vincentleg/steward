import { chromium } from 'playwright';
import assert from 'node:assert/strict';
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
    commitments: [
      { id: 'private-event', title: 'A private commitment', start: '2026-10-08T09:00:00Z' },
    ],
  });
  await page.reload();
  await page.getByText('A private commitment').waitFor();
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
