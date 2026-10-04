import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('docs', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: 'test-results/video', size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
await page.goto(process.env.DEMO_URL || 'http://localhost:3000');
await page.waitForTimeout(2200);
await page.getByRole('button', { name: 'Replay', exact: false }).click();
await page.getByText('EXCEPTION RESOLVED', { exact: true }).waitFor({ timeout: 60000 });
await page.waitForTimeout(3500);
const video = page.video();
await context.close();
await video.saveAs('docs/replay.webm');
await browser.close();
console.log('Silent stage fallback saved to docs/replay.webm. Replay approval is simulated.');
