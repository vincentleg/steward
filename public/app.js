const publicMode = document.body.dataset.mode === 'public';
let demo = { active: false };
if (publicMode) {
  try {
    demo = JSON.parse(sessionStorage.getItem('steward-autonomous-demo') || '{"active":false}');
    demo.lastTick = Date.now();
  } catch {}
}
const storage = publicMode ? sessionStorage : localStorage;
const runKey = publicMode ? 'steward-public-run' : 'steward-run';
const api = publicMode ? '/sandbox/api/sessions' : '/api/runs';
function apiFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(publicMode
        ? { Authorization: 'Bearer ' + (sessionStorage.getItem('steward-public-token') || '') }
        : {}),
    },
  });
}
const main = document.querySelector('#main');
let run = null,
  lastPhase = '',
  lastRevision = '',
  pending = false,
  connected = true;
const check = `<span class="check">✓</span>`;
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const has = (t) => run?.events.some((e) => e.type === t);
const event = (t) => run?.events.find((e) => e.type === t);
const phase = () =>
  !run
    ? 'calm'
    : run.stopped
      ? 'stopped'
      : run.events.at(-1)?.type === 'workflow.error'
        ? 'error'
        : !has('flight.cancelled')
          ? 'receiving'
          : has('exception.resolved')
            ? 'resolved'
            : run.stopped
              ? 'stopped'
              : has('outcome.verification_started')
                ? 'verification'
                : has('refund.confirmed')
                  ? 'refund'
                  : has('rebuttal.sent')
                    ? 'rebuttal'
                    : has('offer.evaluated')
                      ? 'evaluation'
                      : has('airline.offer_received')
                        ? 'offer'
                        : has('approval.received')
                          ? 'execution'
                          : has('decision.sent')
                            ? 'decision'
                            : has('recommendation.ready')
                              ? 'options'
                              : 'bloom';
const title = (label, heading, description = '') =>
  `<div class="section-heading"><div class="eyebrow"><span class="tiny-line"></span>${label}</div><h1>${heading}</h1>${description ? `<p>${description}</p>` : ''}</div>`;
function calm() {
  return `<section class="calm scene">${title('YOUR WORLD IS STABLE', 'Your life is handled.')}<div class="calm-center"><div class="decision-count" aria-label="Zero decisions">0</div><div class="calm-status">NO DECISIONS NEED YOU.</div><p>YOUR WORLD IS STABLE</p><button class="primary" id="trigger">See Steward take over <span>↗</span></button>${publicMode ? '<button class="text-button explore-manual" id="explore-manual">Explore manually ↗</button>' : ''}<div class="trigger-note">${publicMode ? 'No account. No personal data. No connected accounts.' : 'One event. Six consequences. One decision.'}</div></div><div class="watching-grid">${[
    ['01', 'TIME', '9 AM commitment', 'Tomorrow’s priority', '◷'],
    ['02', 'PEOPLE', 'Sarah', 'A commitment to keep', '◎'],
    ['03', 'RESOURCES', '31,000 miles', 'December trip protected', '✳'],
    ['04', 'MONEY', '$412 fare', 'Refund rights watched', '$'],
  ]
    .map(
      ([n, l, v, s, i]) =>
        `<div class="watch-card"><div class="watch-top"><span>${n} / ${l}</span><span class="watch-icon">${i}</span></div><h3>${v}</h3><p>${s}</p><div class="watch-state"><span class="status-dot"></span>Watching</div></div>`,
    )
    .join(
      '',
    )}</div><div class="world-state-domains"><div class="world-state-label">ONE PERSONAL WORLD STATE</div><div class="world-domains">${['TIME', 'MONEY', 'TRAVEL', 'COMMITMENTS', 'PEOPLE', 'OPPORTUNITIES', 'PURCHASES', 'BENEFITS', 'HOME', 'ADMIN', 'WORK', 'RESOURCES'].map((d) => `<span>${d}</span>`).join('')}</div><p>Travel recovery is today’s functional capability. Other capabilities are previews.</p></div></section>`;
}
const nodes = [
  ['TRAVEL', 'Searching alternatives…', '7 alternatives checked', 'alternatives.found', '↗'],
  [
    'TIME / COMMITMENT',
    'Checking tomorrow…',
    '9 AM conflict found',
    'calendar.conflict_found',
    '◷',
  ],
  ['PEOPLE / SARAH', 'Sarah is affected', 'Update prepared', 'economics.calculated', '◎'],
  ['MONEY', 'Checking original fare…', '$412 refundable', 'economics.calculated', '$'],
  ['REWARDS', 'Valuing your miles…', 'Preserve 31K miles', 'economics.calculated', '✳'],
  ['RIGHTS', 'Checking refund policy…', 'Cash refund protected', 'economics.calculated', '◇'],
];
function receiving() {
  return `<section class="scene receiving-scene">${title('EVENT TRANSPORT', 'Your agent is<br><em>on it.</em>', 'Receiving the flight cancellation from the sandbox airline.')}<div class="receiving-status"><span class="pulse-ring"></span> Waiting for the event. Your context is ready.</div></section>`;
}
function bloom() {
  return `<section class="scene bloom">${title('WORLD STATE DEVIATION DETECTED', 'One change.<br><em>Six consequences.</em>', 'One event puts arrival, tomorrow’s commitment and future resources at risk.')}<div class="graph"><svg class="graph-lines" viewBox="0 0 900 400" preserveAspectRatio="none" aria-hidden="true"><path d="M450 200L165 66 M450 200L450 45 M450 200L735 66 M450 200L735 334 M450 200L450 355 M450 200L165 334"/></svg><div class="graph-core"><span class="cancel-icon">↗</span><span class="eyebrow">AIRLINE EVENT RECEIVED</span><h2>Flight cancelled.</h2><p>SFO → JFK <span>·</span> 6:40 PM</p><div class="core-label">STEWARD TAKING OVER</div></div>${nodes.map(([name, processing, done, type, icon], i) => `<div class="consequence node-${i} ${has(type) ? 'complete' : ''}" style="--i:${i}"><div class="node-title"><span class="node-symbol">${icon}</span>${name}<span class="node-indicator">${has(type) ? '✓' : '·'}</span></div><p>${has(type) ? done : processing}</p></div>`).join('')}</div><div class="processing-footer"><span class="pulse-ring"></span> ${has('economics.calculated') ? 'Constraints checked. Economics calculated.' : 'Reading context. Finding a way forward.'}<span class="processing-count">${nodes.filter((n) => has(n[3])).length} / 6 CONNECTED</span></div></section>`;
}
function options() {
  return `<section class="scene options">${title('SIMULATING POSSIBLE FUTURES', 'Six consequences.<br><em>One way forward.</em>')}<div class="compression"><span>6 <small>CONSEQUENCES</small></span><b>→</b><span>3 <small>FUTURES</small></span><b>→</b><span class="accent">1 <small>DECISION</small></span></div><div class="options-grid">${run.decision.options.map((o) => `<article class="option ${o.id === 'B' ? 'recommended' : ''}"><div class="option-top"><span>FUTURE ${o.id}</span><span>${o.id === 'B' ? 'RECOMMENDED' : o.id === 'A' ? 'MEETING CONFLICT' : 'POOR VALUE'}</span></div><h3>${o.label}</h3><p>${o.departure}</p><div class="option-price">${o.id === 'C' ? '31,000' : o.id === 'A' ? '$0' : '+$92'} <small>${o.id === 'C' ? 'MILES' : 'NET'}</small></div><div class="option-reason">${o.id === 'B' ? check : '<span class="dim-cross">×</span>'}${o.reason}</div>${o.id === 'B' ? '<div class="option-math">$504 new fare − $412 refund = $92</div>' : ''}</article>`).join('')}</div><div class="options-bottom"><span class="pulse-ring"></span> Compressing the rest into one approval.</div></section>`;
}
function decision() {
  const delivery = run.delivery;
  const emailed = delivery?.channel === 'email';
  return `<section class="scene decision-scene"><div class="decision-intro">${title('ONE DECISION NEEDS YOU', 'Keep your plans.<br><em>We’ll do the rest.</em>', 'One outcome to protect.<br>Every consequence accounted for.')}<div class="decision-summary"><div><strong>6</strong><span>CONSEQUENCES</span></div><b>→</b><div><strong>3</strong><span>FUTURES</span></div><b>→</b><div><strong class="accent">1</strong><span>DECISION</span></div></div><div class="approval-channel"><span class="phone-icon">▯</span><div><strong>${run.mode === 'replay' ? 'Replay approval arriving…' : publicMode ? 'The judgment is yours.' : emailed ? 'APPROVAL SENT TO YOUR PHONE' : delivery?.error ? 'Email unavailable. Local approval ready.' : 'Ready for your approval.'}</strong><p>${run.mode === 'replay' ? 'Automatic simulated approval · stage safety mode' : publicMode ? 'Approve here. No email or account needed.' : emailed ? 'WAITING FOR APPROVAL…' : 'Open the secure approval page to continue.'}</p></div></div></div><article class="decision-card"><div class="recommendation-label"><span>✳</span> STEWARD RECOMMENDS</div><h2>Get home<br>tonight.</h2><p class="flight-detail">Alternative flight <span>·</span> 9:40 PM <span>↗</span></p><div class="decision-price"><span>+$92</span><div>NET INCREMENTAL<br><small>$504 fare − $412 refund</small></div></div><ul class="benefits"><li>9 AM commitment preserved</li><li>31,000 miles preserved</li><li>$412 refund rights protected</li></ul>${run.mode === 'replay' ? '<button class="primary" disabled>Awaiting replay approval <span>◷</span></button>' : publicMode ? `<button class="primary" id="approve-public">Approve Steward’s plan <span>↗</span></button>` : `<a class="text-button" href="${escape(run.approvalUrl || '#')}" target="_blank" rel="noopener" aria-label="Approve Steward’s plan">Having trouble? Approve here instead <span>↗</span></a>`}<div class="card-footnote">One approval. Everything else is on us.<br>Sandbox actions. No real purchases.</div></article></section>`;
}
const lanes = [
  [
    'BOOK',
    'booking.started',
    'booking.completed',
    ['Searching', 'Selected', 'Booking', 'Confirmed'],
  ],
  [
    'REFUND',
    'refund.requested',
    'refund.confirmed',
    ['Prepared', 'Sent', 'Waiting', 'Cash returned'],
  ],
  ['COMMITMENT', 'calendar.updated', 'calendar.updated', ['Updated', 'Meeting safe']],
  ['PEOPLE', 'sarah.notified', 'sarah.notified', ['Sarah notified', 'Confirmed']],
  ['WATCH', 'refund.requested', 'exception.resolved', ['Monitoring', 'Cash refund protected']],
];
function execution() {
  const approval = event('approval.received');
  return `<section class="scene execution">${title('AUTONOMOUS EXECUTION', 'Consider it<br><em>taken care of.</em>', 'You made the decision. Steward is doing the work.')}<div class="approved-badge">${check}<div>${!publicMode && /iPhone|Android/.test(approval.data.device) ? 'APPROVAL RECEIVED ✓ · APPROVED FROM PHONE' : 'APPROVED BY ' + escape(approval.data.by.toUpperCase())} <span>${escape(approval.data.device)} · just now</span></div><span class="approved-line"></span> ONE HUMAN DECISION</div><div class="lanes">${lanes
    .map(([label, start, done, steps], i) => {
      const finished = has(done),
        active = has(start);
      return `<div class="lane ${finished ? 'done' : active ? 'active' : ''}"><span class="lane-number">0${i + 1}</span><span class="lane-name">${label}</span><div class="lane-track">${steps.map((s, j) => `<span class="lane-step ${finished || (active && j < 2) ? 'passed' : ''}">${s}</span>${j < steps.length - 1 ? '<span class="lane-connector"></span>' : ''}`).join('')}</div><span class="lane-end">${finished ? '✓' : active ? '<span class="pulse-ring"></span>' : '—'}</span></div>`;
    })
    .join(
      '',
    )}</div><div class="execution-note"><span class="status-dot"></span>${has('refund.requested') ? 'Flight secured. Meeting safe. Keeping an eye on your refund.' : 'Coordinating your recovery across every consequence.'}</div></section>`;
}
function offer(p) {
  const evaluated = ['evaluation', 'rebuttal', 'refund'].includes(p);
  return `<section class="scene offer-scene">${title(p === 'refund' ? 'REFUND CONFIRMED' : 'A COUNTEROFFER ARRIVED', p === 'refund' ? 'Your money.<br><em>Back where it belongs.</em>' : 'A bigger number.<br><em>A worse deal.</em>', p === 'refund' ? 'Steward requested cash. The airline agreed.' : 'The airline offered a bonus. Steward checked what it’s worth to you.')}<div class="offer-layout"><div class="airline-offer"><div class="eyebrow">AIRLINE RESPONSE <span>↙</span></div><div class="offer-amount">$450<span>TRAVEL CREDIT</span></div><blockquote>“We’ve issued a $450 travel credit — a bonus over your original $412 fare.”</blockquote><div class="offer-fine">Airline-locked · Expiring · Limited flexibility</div></div><div class="value-review"><div class="review-head"><span>✳</span> ${evaluated ? 'WORTH TO YOU' : 'STEWARD IS REVIEWING THE OFFER'}${!evaluated ? '<span class="pulse-ring"></span>' : ''}</div><div class="comparison-rows">${[
    ['Nominal value', 'Credit +$38', 'neutral'],
    ['Flexibility', 'Cash wins', 'win'],
    ['Expiration', 'Cash wins', 'win'],
    ['Expected use', 'Cash wins', 'win'],
    ['Refund policy', 'Cash wins', 'win'],
  ]
    .map(
      ([l, v, c], i) =>
        `<div class="comparison-row ${evaluated ? 'visible' : ''}" style="--i:${i}"><span>${l}</span><strong class="${c}">${evaluated ? v : 'Evaluating…'} ${evaluated && c === 'win' ? '✓' : ''}</strong></div>`,
    )
    .join(
      '',
    )}</div><div class="value-verdict ${evaluated ? 'visible' : ''}"><span>$412 CASH</span> <b>&gt;</b> <span class="credit">$450 CREDIT</span><p>Expected value to you: $158 · Seeded 35% use assumption</p></div></div></div><div class="rebuttal-bar ${p === 'refund' ? 'refund-success' : ''}"><span>${p === 'refund' ? '✓' : p === 'rebuttal' ? '↗' : '✳'}</span><div><strong>${p === 'refund' ? '$412 CASH REFUND APPROVED' : p === 'rebuttal' ? 'STEWARD REJECTED THE OFFER. CASH REQUESTED.' : evaluated ? 'CASH WINS. STEWARD IS RESPONDING.' : 'LARGER DOESN’T ALWAYS MEAN BETTER.'}</strong><p>${p === 'refund' ? 'Confirmed by the sandbox airline and payment ledger.' : p === 'rebuttal' ? '“Please return the $412 to the original payment method.”' : evaluated ? 'Your preferences and refund policy support cash. No second approval needed.' : 'Comparing flexibility, expiration, expected use, and refund policy.'}</p></div><span class="rebuttal-status">${p === 'refund' ? 'CONFIRMED' : p === 'rebuttal' ? 'SENT ✓' : 'AUTONOMOUS'}</span></div></section>`;
}
function resolved() {
  return `<section class="scene resolved">${title('OUTCOME RESTORED ✓', 'Your life is<br><em>handled.</em>', 'One cancellation. Six consequences. Zero loose ends.')}<div class="resolution-mark">✓</div><div class="resolution-grid">${[
    ['HOME TONIGHT', '9:40 PM flight confirmed'],
    ['9 AM MEETING SAVED', 'Sarah knows you’ll be there'],
    ['31,000 MILES PRESERVED', 'December trip still protected'],
    ['$412 CASH REFUNDED', 'Back to your original payment method'],
  ]
    .map(
      ([t, s]) =>
        `<div class="resolution-item">${check}<div><strong>${t}</strong><p>${s}</p></div></div>`,
    )
    .join(
      '',
    )}</div><div class="verification-summary">${run.outcome?.verified ? '6 outcome checks passed. Action receipts independently verified.' : 'Booking, calendar, notification and refund confirmed.'}</div><div class="handled-tally"><div><strong>6</strong><span>consequences</span></div><div><strong>${run.events.filter((e) => ['booking.completed', 'calendar.updated', 'sarah.notified', 'refund.requested', 'offer.evaluated', 'rebuttal.sent', 'refund.confirmed', 'outcome.verified'].includes(e.type)).length}</strong><span>verified milestones</span></div><div><strong>1</strong><span>human decision</span></div></div><div class="final-line"><span>ONE HUMAN DECISION.</span><b>Everything else, handled.</b></div><div class="restored-calm"><span class="status-dot"></span> YOUR WORLD IS STABLE <b>0 decisions need you</b></div><button class="text-button" id="again">Return to calm <span>↗</span></button></section>`;
}
const story = {
  calm: ['01 / WORLD STATE', 'One intelligence. One model of your world.'],
  receiving: ['02 / EXTERNAL EVENT', 'The world changed. No prompt required.'],
  bloom: ['03 / IMPACT GRAPH', 'It understood what one cancellation affected.'],
  options: ['04 / POSSIBLE FUTURES', 'It evaluated outcomes, not just prices.'],
  decision: ['05 / DECISION COMPRESSION', 'Six consequences became one decision.'],
  execution: ['06 / HANDS OFF', 'I approved once. Steward is handling the rest.'],
  offer: ['07 / COUNTERPARTY RESPONSE', 'An offer that looked better created a second problem.'],
  evaluation: ['08 / WORTH TO YOU', '$450 on paper. $158 in expected value to you.'],
  rebuttal: [
    '09 / AUTONOMOUS NEGOTIATION',
    'It defended your interests without another interruption.',
  ],
  refund: ['10 / CASH CONFIRMED', 'The action completed. Steward still checks the outcome.'],
  verification: ['11 / VERIFICATION', 'It verifies the result before declaring success.'],
  resolved: ['12 / WORLD RESTORED', 'One human decision. Everything else, handled.'],
  stopped: ['STOP CONTROL', 'Your mandate controls what Steward may do.'],
  error: ['SAFE RECOVERY', 'Your state is preserved. Safe recovery is available.'],
};
function renderStory(p) {
  const [stage, text] = story[p] || story.calm;
  if (document.querySelector('#story-text').textContent === text) return;
  document.querySelector('#story-stage').textContent = stage;
  document.querySelector('#story-text').textContent = text;
}
function render() {
  if (publicMode) {
    demoControls();
    if (demo.active && demo.paused) return;
    if (demo.active && demo.stage !== 'travel') {
      renderDemoScene();
      return;
    }
  }
  document.querySelector('#mode').textContent = !connected
    ? 'RECONNECTING · STATE PRESERVED'
    : run?.mode === 'replay'
      ? 'DETERMINISTIC REPLAY'
      : publicMode
        ? 'PUBLIC SANDBOX · SYNTHETIC WORLD'
        : 'SANDBOX WORLD · LIVE AGENT';
  document.querySelector('#stop').hidden = !run || run.state === 'RESOLVED' || run.stopped;
  const p = phase();
  renderStory(p);
  const revision = `${run?.id}:${run?.events.length}:${p}`;
  if (revision === lastRevision) return;
  lastRevision = revision;
  if (p === 'options' && lastPhase === 'bloom') {
    lastPhase = 'collapse';
    main.querySelector('.graph')?.classList.add('collapse');
    setTimeout(() => {
      lastPhase = '';
      lastRevision = '';
      render();
    }, 600);
    return;
  }
  if (p !== lastPhase) {
    main.innerHTML = (
      {
        calm,
        receiving,
        bloom,
        options,
        decision,
        execution,
        resolved,
        verification,
        stopped,
        error,
      }[p] || (() => offer(p))
    )();
    lastPhase = p;
    bind();
  } else if (['bloom', 'execution', 'decision'].includes(p)) {
    main.innerHTML = { bloom, execution, decision }[p]();
    main.querySelector('.scene')?.classList.add('refreshing');
    bind();
  }
  renderProof();
  document.querySelector('#mode').textContent = !connected
    ? 'RECONNECTING · STATE PRESERVED'
    : run?.mode === 'replay'
      ? 'DETERMINISTIC REPLAY'
      : publicMode
        ? 'PUBLIC SANDBOX · SYNTHETIC WORLD'
        : 'SANDBOX WORLD · LIVE AGENT';
}
function bind() {
  document.querySelector('#explore-manual')?.addEventListener('click', () => start('live'));
  document
    .querySelector('#trigger')
    ?.addEventListener('click', () => (publicMode ? launchDemo() : start('live')));
  document.querySelector('#again')?.addEventListener('click', reset);
  document
    .querySelector('#recover')
    ?.addEventListener('click', () => start(publicMode ? 'public' : 'replay'));
  document.querySelector('#approve-public')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      const response = await apiFetch(`${api}/${run.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) throw Error();
      await poll();
    } catch {
      toast('Approval could not be processed. Please try again.');
      e.target.disabled = false;
    }
  });
}
function toast(text) {
  const el = document.querySelector('#toast');
  el.textContent = text;
  el.hidden = false;
  setTimeout(() => (el.hidden = true), 6000);
}
async function start(mode) {
  if (pending) return;
  pending = true;
  const trigger = document.querySelector('#trigger');
  if (trigger) {
    trigger.disabled = true;
    trigger.textContent = 'Receiving airline event…';
  }
  try {
    const r = await apiFetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(publicMode ? {} : { mode }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw Error();
    run = await r.json();
    if (publicMode) {
      sessionStorage.setItem('steward-public-token', run.accessToken);
      delete run.accessToken;
    }
    storage.setItem(runKey, run.id);
    lastPhase = '';
    render();
  } catch {
    toast('Could not reach Steward. Check the server and try again.');
    if (trigger) {
      trigger.disabled = false;
      trigger.innerHTML = 'See Steward take over <span>↗</span>';
    }
  } finally {
    pending = false;
  }
}
function reset() {
  demo = { active: false };
  saveDemo();
  document.querySelector('#demo-controls')?.setAttribute('hidden', '');
  run = null;
  storage.removeItem(runKey);
  lastPhase = '';
  render();
}
const labels = {
  'communication.event_received': 'Cancellation event verified · AgentMail',
  'communication.degraded': 'Email transport unavailable · direct sandbox event',
  'flight.cancelled': 'Cancellation received',
  'context.loaded': 'Life context loaded',
  'calendar.conflict_found': '9 AM meeting constraint found',
  'alternatives.found': '7 alternatives checked',
  'economics.calculated': 'Economics calculated · +$92 net',
  'recommendation.ready': 'Option B recommended',
  'decision.sent': 'Approval requested',
  'decision.delivery_updated': 'Approval channel ready',
  'approval.received': 'Approval received',
  'booking.started': 'Sandbox booking started',
  'booking.completed': 'Sandbox booking confirmed',
  'calendar.updated': 'Calendar updated · meeting safe',
  'sarah.notified': 'Sarah sandbox notified',
  'refund.requested': 'Refund requested',
  'airline.offer_received': '$450 credit counteroffer received',
  'offer.evaluated': 'Credit evaluated · cash wins',
  'rebuttal.sent': 'Credit rejected · cash requested',
  'refund.confirmed': '$412 cash refund confirmed',
  'exception.resolved': 'Outcome restored',
  'outcome.verification_started': 'Checking actual resource state',
  'outcome.verified': 'Outcome independently verified',
  'workflow.stopped': 'Further actions stopped',
};
function renderProof() {
  const el = document.querySelector('#proof-content');
  el.innerHTML = run
    ? `<div class="proof-meta"><span>${run.mode.toUpperCase()} · ${escape(run.state)}</span><code>${run.id}</code><p>Airline, calendar, Sarah, booking and payments are sandboxed. Approval and workflow are real. ${publicMode ? 'Anonymous browser approval. No email sent. Session auto-deletes after 30 minutes.' : run.delivery?.channel === 'email' ? 'AgentMail approval email sent.' : 'Email is ' + (run.mode === 'replay' ? 'simulated.' : 'not configured or not yet sent.')}</p></div><ol class="proof-events">${run.events.map((e) => `<li><span class="proof-check">✓</span><div>${escape(labels[e.type] || e.type)}<small>${escape(e.type)}</small></div><time>${new Date(e.at).toLocaleTimeString([], { hour12: false })}</time></li>`).join('')}</ol>`
    : '<div class="proof-meta"><p>Start a flight cancellation to see the backend event log. Every action has a timestamp and durable run ID.</p></div>';
}
async function poll() {
  const id = run?.id || storage.getItem(runKey);
  if (!id) return;
  try {
    const res = await apiFetch(`${api}/${id}`, { signal: AbortSignal.timeout(4000) });
    if (res.status === 404) {
      storage.removeItem(runKey);
      run = null;
      lastPhase = '';
      lastRevision = '';
      render();
      if (publicMode) toast('This private sandbox session expired. Start a fresh world.');
      return;
    }
    if (!res.ok) throw Error();
    const next = await res.json();
    if (storage.getItem(runKey) !== id) return;
    run = next;
    connected = true;
    render();
  } catch {
    connected = false;
    document.querySelector('#mode').textContent = 'RECONNECTING · STATE PRESERVED';
  }
}
document.querySelector('#replay').addEventListener('click', () => start('replay'));
document.querySelector('#reset').addEventListener('click', reset);
let drawerTrigger;
function toggleDrawer(id, force) {
  const panel = document.querySelector('#' + id);
  const opening = force ?? panel.hidden;
  if (opening) {
    drawerTrigger = document.activeElement;
    for (const other of ['proof', 'constitution'])
      document.querySelector('#' + other).hidden = other !== id;
    panel.hidden = false;
    document.querySelector('.app-shell').inert = true;
    panel.querySelector('button').focus();
  } else {
    panel.hidden = true;
    document.querySelector('.app-shell').inert = false;
    drawerTrigger?.focus();
  }
}
document.querySelector('#proof-toggle').addEventListener('click', () => {
  toggleDrawer('proof');
  renderProof();
});
document
  .querySelector('#proof-close')
  .addEventListener('click', () => toggleDrawer('proof', false));
document.addEventListener('keydown', (e) => {
  const panel = ['proof', 'constitution']
    .map((id) => document.querySelector('#' + id))
    .find((p) => !p.hidden);
  if (panel && e.key === 'Escape') {
    toggleDrawer(panel.id, false);
    return;
  }
  if (panel && e.key === 'Tab') {
    const items = [...panel.querySelectorAll('button, a[href], [tabindex="0"]')];
    const first = items[0],
      last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
  if (!panel && !publicMode && e.key.toLowerCase() === 'r' && e.shiftKey) start('replay');
});
if (publicMode) {
  document.querySelector('#replay').hidden = true;
  document.querySelector('.avatar').textContent = 'S';
  document.querySelector('.header-center').innerHTML =
    '<span class="status-dot"></span> SYNTHETIC WORLD · PRIVATE SESSION';
}
const demoScenes = [
  [
    'SF TECH WEEK',
    'Your calendar stores events.',
    'Steward understands why they matter.',
    [
      '6:00 PM · AI infrastructure · Confirmed',
      '6:30 PM · Founder event · Waitlisted',
      '8:00 PM · Investor event · Confirmed',
    ],
    5,
  ],
  [
    'WORLD STATE CHANGED',
    '6:47 PM. Waitlist cleared.',
    'Steward re-evaluates the evening.',
    [
      'Event value · People · User goals',
      'Travel time · Commitments · Opportunity cost',
      'Next event · Reversibility',
    ],
    5,
  ],
  [
    'CALENDAR RE-OPTIMIZATION',
    '12 → 4 → 1',
    'Consequences → possible plans → one decision.',
    [
      'Leave event A early → Attend founder event B',
      'Keep the 8 PM commitment',
      '✓ 22-minute travel assumed feasible',
    ],
    6,
  ],
  [
    'MONEY',
    'An unwanted $249 renewal.',
    'Steward protects value, not just balances.',
    [
      'Usage + preference checked',
      'Refund eligibility evaluated',
      '✓ Low-risk resolution simulated',
    ],
    3,
  ],
  [
    'PURCHASES',
    'The delivery failed.',
    'The purchase wasn’t the goal. Having the item was.',
    [
      'Important item needed tomorrow',
      'Replacement arrives tonight',
      '✓ Original refund path prepared',
    ],
    3,
  ],
  [
    'BENEFITS / RIGHTS',
    '$300 expires tomorrow.',
    'Steward watches for value you would have lost.',
    [
      'Value at risk detected',
      'Eligibility + use options checked',
      '✓ Value preservation simulated',
    ],
    3,
  ],
  [
    'ADMIN',
    'A deadline. Four tasks.',
    'Steward turns admin into decisions.',
    [
      'Form · Document · Payment · Approval',
      'Everything within authority prepared',
      '1 decision, rather than 4 tasks · Illustration',
    ],
    3,
  ],
  [
    'WORK',
    '2:00 → 3:30 PM',
    'One change. Every dependency updated.',
    ['Travel · Preparation · Next meeting', 'People · Deadline', '✓ Safe replanning simulated'],
    3,
  ],
  [
    'HOME',
    'Internet out. Call in 45 min.',
    'Steward protects the outcome, not the device.',
    [
      'Outage + recovery estimate checked',
      'Hotspot · Workspace · Travel time',
      '✓ Backup plan prepared',
    ],
    3,
  ],
  [
    'PEOPLE',
    'Dinner delayed 45 minutes.',
    'Context moves with the plan.',
    [
      'Reservation · Travel · Next commitment',
      'Conflict detected · New plan prepared',
      '✓ Communication ready',
    ],
    3,
  ],
  [
    'OPPORTUNITIES',
    'An invitation. Limited capacity.',
    'Allocate your life around what matters.',
    [
      'Strategic relevance · People · Goals',
      'Calendar · Travel · Commitments',
      '✓ High-value decision prepared · Illustration',
    ],
    3,
  ],
  [
    'ONE CENTRAL INTELLIGENCE',
    'These aren’t ten agents.',
    'They’re one life.',
    [
      'Time · Money · Travel · People · Work',
      'Opportunities · Purchases · Benefits · Home · Admin',
      'One world state · One memory · One Constitution',
    ],
    6,
  ],
  [
    'THE STEWARD LOOP',
    'Sense. Think. Evaluate.',
    'Watch. Act. Resolve. Defend.',
    [
      'Perceive → Model → Predict → Protect',
      'Plan → Act → Negotiate',
      'Verify → Learn → Continue watching',
    ],
    5,
  ],
  [
    'PERSONAL OUTCOME RECOVERY',
    'Chatbots answer. Agents act.',
    'Steward restores outcomes.',
    [],
    6,
  ],
  [
    'STEWARD CONSTITUTION',
    'Maximum intelligence.',
    'Minimum necessary authority.',
    [
      'GREEN · Observe / simulate / prepare',
      'YELLOW · Pre-authorized reversible actions',
      'RED · Human approval · BLACK · Never escalate permissions',
    ],
    7,
  ],
  [
    'PRIVACY BY DESIGN',
    'Your world remains yours.',
    'Minimum necessary data. Explicit authority.',
    [
      'Scoped, compartmentalized access',
      'Synthetic public demo · No account required',
      'No personal data required',
    ],
    5,
  ],
  [
    'YOUR WORLD IS STABLE',
    '0',
    'DECISIONS NEED YOU',
    ['Steward absorbed the complexity.', 'One human decision. Everything else, handled.'],
    6,
  ],
  [
    'STEWARD',
    'Your life is handled.',
    'The operations team for your life.',
    ['Sense · Think · Evaluate · Watch · Act · Resolve · Defend'],
    5,
  ],
];
function saveDemo() {
  if (publicMode) sessionStorage.setItem('steward-autonomous-demo', JSON.stringify(demo));
}
function demoControls() {
  let bar = document.querySelector('#demo-controls');
  if (!bar) {
    bar = document.createElement('nav');
    bar.id = 'demo-controls';
    bar.setAttribute('aria-label', 'Demo presentation controls');
    document.querySelector('#story').before(bar);
  }
  bar.hidden = !demo.active;
  if (!demo.active) return;
  bar.innerHTML = `<span><b>AUTONOMOUS DEMO</b> · ${demo.stage === 'travel' ? 'FUNCTIONAL SANDBOX' : demo.stage === 'intro' ? 'SYNTHETIC WORLD' : 'CAPABILITY SIMULATION'}</span><div><button id="demo-pause" title="Pause presentation; an approved backend workflow continues safely">${demo.paused ? 'Resume' : 'Pause'}</button><button id="demo-restart">Restart</button><button id="demo-exit">Exit</button></div>`;
  document.querySelector('#demo-pause').onclick = () => {
    demo.paused = !demo.paused;
    demo.lastTick = Date.now();
    saveDemo();
    lastRevision = '';
    render();
  };
  document.querySelector('#demo-restart').onclick = async () => {
    await exitDemo(true);
    launchDemo();
  };
  document.querySelector('#demo-exit').onclick = () => exitDemo(true);
}
async function exitDemo(stopRun = false) {
  if (stopRun && run && run.state !== 'RESOLVED' && !run.stopped) {
    try {
      await apiFetch(`${api}/${run.id}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    } catch {
      toast('Presentation exited. Backend status remains available in Live proof.');
    }
  }
  demo = { active: false };
  saveDemo();
  document.querySelector('#demo-controls')?.setAttribute('hidden', '');
  reset();
}
function launchDemo() {
  if (pending || demo.active) return;
  demo = {
    active: true,
    stage: 'intro',
    index: 0,
    elapsed: 0,
    paused: false,
    lastTick: Date.now(),
  };
  saveDemo();
  lastRevision = '';
  render();
}
function renderDemoScene() {
  const intro = demo.stage === 'intro';
  const s = intro
    ? [
        'PERSONAL WORLD STATE',
        'Your world is stable.',
        'One intelligence. Your whole life.',
        [
          'TIME · MONEY · TRAVEL · COMMITMENTS',
          'PEOPLE · OPPORTUNITIES · PURCHASES · BENEFITS',
          'HOME · ADMIN · WORK · RESOURCES',
        ],
        7,
      ]
    : demoScenes[demo.index];
  if (!s) return;
  const key = `${demo.stage}:${demo.index}`;
  if (document.querySelector('.demo-scene')?.dataset.key === key) return;
  document.querySelector('#story-stage').textContent = intro
    ? 'STEWARD IS WATCHING'
    : demo.index <= 10
      ? 'CAPABILITY SIMULATION · PRODUCT VISION'
      : 'ONE STEWARD CORE';
  document.querySelector('#story-text').textContent = s[2];
  main.innerHTML = `<section class="scene demo-scene ${demo.index >= 13 ? 'demo-quiet' : ''}" data-key="${key}"><div class="eyebrow">${s[0]}</div><h1>${s[1]}</h1><p class="demo-subtitle">${s[2]}</p>${intro ? '<div class="demo-zero">0 <small>DECISIONS NEED YOU</small></div>' : ''}<div class="demo-facts">${s[3].map((text, i) => `<div style="--order:${i}">${text}</div>`).join('')}</div><div class="demo-truth">${intro ? 'Synthetic Personal World State · Travel is today’s functional capability' : demo.index <= 10 ? 'CAPABILITY SIMULATION · No connected integration or real transaction' : 'One intelligence. Explicit authority. Many capabilities.'}</div></section>`;
}
function demoTick() {
  if (!demo.active || demo.paused) return;
  const now = Date.now();
  const delta = Math.min(1, (now - (demo.lastTick || now)) / 1000);
  demo.lastTick = now;
  if (demo.stage === 'travel') {
    if (phase() === 'resolved') {
      demo.elapsed = (demo.elapsed || 0) + delta;
      if (demo.elapsed >= 8) {
        demo.stage = 'vision';
        demo.index = 0;
        demo.elapsed = 0;
        lastRevision = '';
        render();
      }
    }
  } else {
    demo.elapsed = (demo.elapsed || 0) + delta;
    const duration = demo.stage === 'intro' ? 7 : demoScenes[demo.index]?.[4] || 3;
    if (demo.elapsed >= duration) {
      demo.elapsed = 0;
      if (demo.stage === 'intro') {
        demo.stage = 'travel';
        start('live');
      } else if (demo.index + 1 < demoScenes.length) demo.index++;
      else {
        demo.active = false;
        reset();
      }
      lastRevision = '';
      render();
    }
  }
  saveDemo();
}

setInterval(demoTick, 200);
render();
await poll();
setInterval(poll, publicMode ? 1100 : 650);

function verification() {
  return `<section class="scene verifying">${title('VERIFYING OUTCOME…', 'We check<br><em>the actual outcome.</em>', 'A successful tool call isn’t enough. Steward verifies what changed.')}<div class="verification-checks">${[
    ['TRAVEL', 'Confirmed flight and one payment'],
    ['TIME', '9 AM commitment protected'],
    ['PEOPLE', 'Sarah’s sandbox inbox updated'],
    ['RESOURCES', '31,000 miles available'],
    ['MONEY', '$412 cash returned once'],
    ['AUTHORITY', 'One approval. Approved scope only.'],
  ]
    .map(
      ([label, text]) =>
        `<div>${run.outcome?.verified ? check : '<span class="pulse-ring"></span>'}<strong>${label}</strong><p>${text}</p></div>`,
    )
    .join(
      '',
    )}</div><div class="receiving-status"><span class="pulse-ring"></span> Verifying persisted resource state.</div></section>`;
}
function stopped() {
  return `<section class="scene">${title('AUTHORITY WITHDRAWN', 'Steward has<br><em>stopped.</em>', 'No further actions will execute. Completed sandbox actions remain recorded.')}<button class="primary" id="again">Return to calm <span>↗</span></button></section>`;
}
document.querySelector('#stop').addEventListener('click', async () => {
  if (!run || run.state === 'RESOLVED') return;
  try {
    const response = await apiFetch(`${api}/${run.id}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) throw Error();
    await poll();
  } catch {
    toast('Could not stop the workflow. Check the connection.');
  }
});
document.querySelector('#constitution-toggle').addEventListener('click', async () => {
  const panel = document.querySelector('#constitution');
  toggleDrawer('constitution');
  if (panel.hidden) return;
  try {
    const c =
      run?.constitution ||
      (await (await fetch(publicMode ? '/sandbox/api/constitution' : '/api/constitution')).json());
    document.querySelector('#constitution-content').innerHTML =
      `<p class="mandate-intro">Maximum intelligence. Minimum necessary authority.</p>${[
        ['PROTECT', c.protect],
        ['OPTIMIZE', c.optimize],
        ['MAY ACT AUTONOMOUSLY', c.autonomous],
        ['MUST ASK', c.mustAsk],
        ['NEVER', c.never],
      ]
        .map(
          ([title, items]) =>
            `<div class="mandate-section"><h4>${title}</h4><ul>${items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul></div>`,
        )
        .join(
          '',
        )}<div class="mandate-note">Read-only mandate · Policy v${c.version}<br>Steward cannot modify its constitution or expand its authority.</div><p class="acronym">Sense · Think · Evaluate · Watch · Act · Resolve · Defend</p>`;
  } catch {
    document.querySelector('#constitution-content').textContent =
      'Mandate unavailable. No additional authority granted.';
  }
});
document
  .querySelector('#constitution-close')
  .addEventListener('click', () => toggleDrawer('constitution', false));

function error() {
  return `<section class="scene">${title('OUTCOME NOT YET VERIFIED', 'Steward has<br><em>paused safely.</em>', publicMode ? 'Start a fresh private world to try again.' : 'Approved work and completed actions are preserved. Replay is ready.')}<button class="primary" id="recover">${publicMode ? 'Start fresh world' : 'Switch to replay'} <span>↗</span></button></section>`;
}
