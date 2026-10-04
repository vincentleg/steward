import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const origin = process.env.PUBLIC_BASE_URL;
if (!origin?.startsWith('https://')) throw Error('HTTPS origin required');
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: '.data/public-video', size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${origin}/sandbox`);
await page.getByText('NO DECISIONS NEED YOU.', { exact: true }).waitFor();
await page.waitForTimeout(4000);
await page.getByRole('button', { name: 'See Steward take over' }).click();
await page
  .getByRole('button', { name: 'Approve Steward’s plan', exact: false })
  .waitFor({ timeout: 60000 });
await page.waitForTimeout(6000);
await page.getByRole('button', { name: 'Approve Steward’s plan', exact: false }).click();
await page.getByText('OUTCOME RESTORED ✓', { exact: true }).waitFor({ timeout: 90000 });
await page.waitForTimeout(5000);
await page.reload();
await page.getByText('OUTCOME RESTORED ✓', { exact: true }).waitFor();
const token = await page.evaluate(() => sessionStorage.getItem('steward-public-token'));
const id = await page.evaluate(() => sessionStorage.getItem('steward-public-run'));
const response = await fetch(`${origin}/sandbox/api/sessions/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const run = await response.json();
if (
  !run.outcome?.verified ||
  errors.length ||
  run.mode !== 'public' ||
  JSON.stringify(run).includes('Vincent')
)
  throw Error('Public verification failed');
await page.screenshot({ path: 'docs/public-restored.png' });
await context.close();
await page.video().saveAs(process.env.PUBLIC_VIDEO || 'docs/public-demo.webm');
await browser.close();
writeFileSync(
  '.data/public-smoke.json',
  JSON.stringify({
    verified: true,
    mode: run.mode,
    events: run.events.map((e) => e.type),
    at: new Date().toISOString(),
  }),
);
console.log(
  'Public HTTPS flow passed: browser approval, independent verification, reload restoration; no email. Video saved.',
);
