import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const snapshot = JSON.parse(readFileSync('.data/runs.json', 'utf8'));
const runs = (Array.isArray(snapshot) ? snapshot : snapshot.runs)
  .filter((r) => r.mode === 'live' && r.delivery?.channel === 'email')
  .slice(-2);
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const origin = `http://localhost:${process.env.PORT || 3000}`;
mkdirSync('.data/physical-tests', { recursive: true });
for (const [index, run] of runs.entries()) {
  if (run.state !== 'RESOLVED') throw new Error('Run has not resolved');
  const types = [
    'communication.event_received',
    'approval.received',
    'booking.completed',
    'calendar.updated',
    'sarah.notified',
    'refund.requested',
    'airline.offer_received',
    'offer.evaluated',
    'rebuttal.sent',
    'refund.confirmed',
    'exception.resolved',
  ];
  if (!types.every((type) => run.events.some((event) => event.type === type)))
    throw new Error('Event proof is incomplete');
  if (
    run.world.calendar.status !== 'safe' ||
    run.world.people.sarahInbox.length !== 1 ||
    run.world.payments.charges.length !== 1 ||
    run.world.payments.refunds.length !== 1 ||
    run.actions.refund.amount !== 412 ||
    run.decision.milesPreserved !== 31000
  )
    throw new Error('Sandbox outcome verification failed');
  await page.goto(origin);
  await page.evaluate((id) => localStorage.setItem('steward-run', id), run.id);
  await page.reload();
  await page.getByText('OUTCOME RESTORED ✓', { exact: true }).waitFor({ timeout: 5000 });
  await page.getByText('$412 CASH REFUNDED', { exact: true }).waitFor({ timeout: 5000 });
  await page.reload();
  await page.getByText('OUTCOME RESTORED ✓', { exact: true }).waitFor({ timeout: 5000 });
  const approval = run.events.find((e) => e.type === 'approval.received');
  const evidence = {
    attempt: index + 1,
    runId: run.id,
    resolvedAt: new Date().toISOString(),
    physicalDevice: approval.data.device,
    phoneHeaderConfirmed: approval.data.device === 'iPhone',
    desktopRestored: true,
    events: run.events,
    actions: run.actions,
    world: run.world,
  };
  writeFileSync(`.data/physical-tests/run-${index + 1}.json`, JSON.stringify(evidence, null, 2), {
    mode: 0o600,
  });
  console.log(
    `RUN ${index + 1}: Complete recovery and desktop reload restoration verified. Device label: ${approval.data.device}.`,
  );
}
console.log('Desktop restored to the latest resolved outcome.');
await new Promise(() => {});
