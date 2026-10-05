import { test, expect } from '@playwright/test';

test('calm loads locally with bounded assets and no layout shift after fonts settle', async ({
  page,
}) => {
  const foreign = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['localhost', '127.0.0.1'].includes(url.hostname)) foreign.push(url.hostname);
  });
  await page.addInitScript(() => {
    window.stewardCLS = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        if (!entry.hadRecentInput) window.stewardCLS += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto('http://localhost:3103/sandbox/travel');
  await page.getByRole('button', { name: 'See Steward take over' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => ({
    cls: window.stewardCLS,
    bytes: performance.getEntriesByType('resource').reduce((sum, r) => sum + r.transferSize, 0),
    dom: document.getElementsByTagName('*').length,
  }));
  expect(foreign).toEqual([]);
  expect(metrics.cls).toBeLessThan(0.1);
  expect(metrics.bytes).toBeLessThan(750000);
  expect(metrics.dom).toBeLessThan(250);
});
