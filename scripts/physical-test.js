import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

for (const name of ['AGENTMAIL_API_KEY', 'APPROVAL_EMAIL', 'PUBLIC_BASE_URL']) {
  if (!process.env[name]) throw new Error(`${name} is not configured`);
}
const origin = `http://localhost:${process.env.PORT || 3000}`;
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
mkdirSync('.data/physical-tests', { recursive: true });
const results = [];
for (let attempt = 1; attempt <= 2; attempt++) {
  await page.goto(origin);
  await page.evaluate(() => localStorage.removeItem('steward-run'));
  await page.reload();
  await page.getByRole('button', { name: 'See Steward take over' }).click();
  let runId;
  for (let i = 0; i < 20 && !runId; i++) {
    runId = await page.evaluate(() => localStorage.getItem('steward-run'));
    if (!runId) await page.waitForTimeout(250);
  }
  if (!runId) throw new Error('Desktop did not start a run');
  console.log(`RUN ${attempt}: Cancellation triggered. Desktop is connected.`);
  const deadline = Date.now() + 15 * 60 * 1000;
  let prompted = false;
  let approved = false;
  let resolved = false;
  while (Date.now() < deadline) {
    const response = await fetch(`${origin}/api/runs/${runId}`);
    const run = await response.json();
    if (run.events.some((e) => e.type === 'communication.degraded'))
      throw new Error(
        'Cancellation did not pass through AgentMail; this is not a successful physical flow.',
      );
    if (run.delivery?.error)
      throw new Error('Approval email delivery failed; physical test paused.');
    if (run.delivery?.channel === 'email' && !prompted) {
      console.log(
        `PHONE_ACTION_REQUIRED ${attempt}: Open the new Steward email on your iPhone, open the plan, and tap Approve Steward’s plan. Then put your phone down.`,
      );
      prompted = true;
    }
    const approval = run.events.find((e) => e.type === 'approval.received');
    if (approval && !approved) {
      if (approval.data.device !== 'iPhone')
        console.log(
          `RUN ${attempt}: Approval received with generic device metadata; confirm physical origin before counting this as a phone pass.`,
        );
      console.log(
        `RUN ${attempt}: Approval received (${approval.data.device}). Desktop continuing autonomously.`,
      );
      approved = true;
    }
    if (run.events.some((e) => e.type === 'workflow.error'))
      throw new Error('Workflow paused before resolution.');
    if (run.state === 'RESOLVED') {
      const required = [
        'communication.event_received',
        'decision.sent',
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
      if (!required.every((type) => run.events.some((e) => e.type === type)))
        throw new Error('Evidence is incomplete');
      if (
        run.world.payments.charges.length !== 1 ||
        run.world.payments.refunds.length !== 1 ||
        run.world.payments.charges[0].amount - run.world.payments.refunds[0].amount !== 92
      )
        throw new Error('Payment sandbox verification failed');
      if (run.world.calendar.status !== 'safe' || run.world.people.sarahInbox.length !== 1)
        throw new Error('Calendar or notification verification failed');
      if (run.decision.milesPreserved !== 31000 || run.actions.refund.amount !== 412)
        throw new Error('Outcome verification failed');
      await page.getByText('EXCEPTION RESOLVED', { exact: true }).waitFor({ timeout: 5000 });
      await page.getByText('$412 CASH REFUNDED', { exact: true }).waitFor({ timeout: 5000 });
      await page.reload();
      await page.getByText('EXCEPTION RESOLVED', { exact: true }).waitFor({ timeout: 5000 });
      const evidence = {
        attempt,
        runId,
        resolvedAt: new Date().toISOString(),
        physicalDevice: approval.data.device,
        phoneHeaderConfirmed: approval.data.device === 'iPhone',
        desktopRestored: true,
        events: run.events,
        actions: run.actions,
        world: run.world,
      };
      writeFileSync(`.data/physical-tests/run-${attempt}.json`, JSON.stringify(evidence, null, 2), {
        mode: 0o600,
      });
      results.push({
        attempt,
        runId,
        success: true,
        phoneHeaderConfirmed: approval.data.device === 'iPhone',
      });
      console.log(
        `RUN ${attempt}: OUTCOME RESTORED. Booking, meeting, miles, $412 cash refund, negotiation and desktop restoration verified.`,
      );
      resolved = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 650));
  }
  if (!resolved) throw new Error('Physical approval test timed out');
  await page.waitForTimeout(4000);
}
if (errors.length) throw new Error('Desktop browser errors detected');
writeFileSync('.data/physical-tests/result.json', JSON.stringify(results, null, 2), {
  mode: 0o600,
});
console.log(
  results.every((result) => result.phoneHeaderConfirmed)
    ? 'SUCCESS: Two complete physical iPhone flows verified. Desktop left open at the restored outcome.'
    : 'Two complete workflows verified. Physical origin confirmation required for generic device metadata. Desktop left open.',
);
// Leave the demo window open for Vincent; the tool session owns its lifetime.
await new Promise(() => {});
