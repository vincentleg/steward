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
    : !has('flight.cancelled')
      ? 'receiving'
      : has('exception.resolved')
        ? 'resolved'
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
  return `<section class="calm scene">${title('YOUR PERSONAL OPERATIONS TEAM', 'Your life is<br><em>handled.</em>', 'We watch the details. You live your life.')}<div class="calm-center"><div class="orbit-mark"><span>✳</span></div><div class="calm-status"><span class="status-dot"></span> NO DECISIONS NEED YOU.</div><p>Everything is where it should be.</p><button class="primary" id="trigger">See Steward take over <span>↗</span></button><div class="trigger-note">A flight cancellation. Six consequences. One decision.</div></div><div class="watching-grid">${[
    ['01', 'TRAVEL', 'SFO → JFK', '6:40 PM tonight', '↗'],
    ['02', 'CALENDAR', 'Sarah · 9 AM', 'Tomorrow’s priority', '◷'],
    ['03', 'REWARDS', '31,000 miles', 'December trip protected', '✳'],
    ['04', 'MONEY', '$412 fare', 'Refund rights watched', '$'],
  ]
    .map(
      ([n, l, v, s, i]) =>
        `<div class="watch-card"><div class="watch-top"><span>${n} / ${l}</span><span class="watch-icon">${i}</span></div><h3>${v}</h3><p>${s}</p><div class="watch-state"><span class="status-dot"></span>Watching</div></div>`,
    )
    .join('')}</div></section>`;
}
const nodes = [
  ['TRAVEL', 'Searching alternatives…', '7 alternatives checked', 'alternatives.found', '↗'],
  ['CALENDAR', 'Checking tomorrow…', '9 AM conflict found', 'calendar.conflict_found', '◷'],
  ['PEOPLE', 'Sarah is affected', 'Update prepared', 'economics.calculated', '◎'],
  ['MONEY', 'Checking original fare…', '$412 refundable', 'economics.calculated', '$'],
  ['REWARDS', 'Valuing your miles…', 'Preserve 31K miles', 'economics.calculated', '✳'],
  ['RIGHTS', 'Checking refund policy…', 'Cash refund protected', 'economics.calculated', '◇'],
];
function receiving() {
  return `<section class="scene receiving-scene">${title('EVENT TRANSPORT', 'Your agent is<br><em>on it.</em>', 'Receiving the flight cancellation from the sandbox airline.')}<div class="receiving-status"><span class="pulse-ring"></span> Waiting for the event. Your context is ready.</div></section>`;
}
function bloom() {
  return `<section class="scene bloom">${title('EXCEPTION DETECTED', 'One change.<br><em>Six consequences.</em>', 'Steward is connecting the things this flight affects.')}<div class="graph"><svg class="graph-lines" viewBox="0 0 900 400" preserveAspectRatio="none" aria-hidden="true"><path d="M450 200L165 66 M450 200L450 45 M450 200L735 66 M450 200L735 334 M450 200L450 355 M450 200L165 334"/></svg><div class="graph-core"><span class="cancel-icon">↗</span><span class="eyebrow">AIRLINE EVENT RECEIVED</span><h2>Flight cancelled.</h2><p>SFO → JFK <span>·</span> 6:40 PM</p><div class="core-label">STEWARD TAKING OVER</div></div>${nodes.map(([name, processing, done, type, icon], i) => `<div class="consequence node-${i} ${has(type) ? 'complete' : ''}" style="--i:${i}"><div class="node-title"><span class="node-symbol">${icon}</span>${name}<span class="node-indicator">${has(type) ? '✓' : '·'}</span></div><p>${has(type) ? done : processing}</p></div>`).join('')}</div><div class="processing-footer"><span class="pulse-ring"></span> ${has('economics.calculated') ? 'Constraints checked. Economics calculated.' : 'Reading context. Finding a way forward.'}<span class="processing-count">${nodes.filter((n) => has(n[3])).length} / 6 CONNECTED</span></div></section>`;
}
function options() {
  return `<section class="scene options">${title('DECISION COMPRESSION', 'Six consequences.<br><em>One way forward.</em>')}<div class="compression"><span>6 <small>CONSEQUENCES</small></span><b>→</b><span>3 <small>OPTIONS</small></span><b>→</b><span class="accent">1 <small>DECISION</small></span></div><div class="options-grid">${run.decision.options.map((o) => `<article class="option ${o.id === 'B' ? 'recommended' : ''}"><div class="option-top"><span>OPTION ${o.id}</span><span>${o.id === 'B' ? 'RECOMMENDED' : o.id === 'A' ? 'MEETING CONFLICT' : 'POOR VALUE'}</span></div><h3>${o.label}</h3><p>${o.departure}</p><div class="option-price">${o.id === 'C' ? '31,000' : o.id === 'A' ? '$0' : '+$92'} <small>${o.id === 'C' ? 'MILES' : 'NET'}</small></div><div class="option-reason">${o.id === 'B' ? check : '<span class="dim-cross">×</span>'}${o.reason}</div>${o.id === 'B' ? '<div class="option-math">$504 new fare − $412 refund = $92</div>' : ''}</article>`).join('')}</div><div class="options-bottom"><span class="pulse-ring"></span> Compressing the rest into one approval.</div></section>`;
}
function decision() {
  const delivery = run.delivery;
  const emailed = delivery?.channel === 'email';
  return `<section class="scene decision-scene"><div class="decision-intro">${title('ONE DECISION NEEDS YOU', 'Keep your plans.<br><em>We’ll do the rest.</em>', 'The travel, the meeting, the money.<br>Already figured out.')}<div class="decision-summary"><div><strong>6</strong><span>CONSEQUENCES</span></div><b>→</b><div><strong>3</strong><span>OPTIONS</span></div><b>→</b><div><strong class="accent">1</strong><span>DECISION</span></div></div><div class="approval-channel"><span class="phone-icon">▯</span><div><strong>${run.mode === 'replay' ? 'Replay approval arriving…' : emailed ? 'Sent to your phone.' : delivery?.error ? 'Email unavailable. Local approval ready.' : 'Ready for your approval.'}</strong><p>${run.mode === 'replay' ? 'Automatic simulated approval · stage safety mode' : emailed ? 'Check your email. One tap and we take over.' : 'Open the secure approval page to continue.'}</p></div></div></div><article class="decision-card"><div class="recommendation-label"><span>✳</span> STEWARD RECOMMENDS</div><h2>Get home<br>tonight.</h2><p class="flight-detail">Alternative flight <span>·</span> 9:40 PM <span>↗</span></p><div class="decision-price"><span>+$92</span><div>NET INCREMENTAL<br><small>$504 fare − $412 refund</small></div></div><ul class="benefits"><li>9 AM meeting preserved</li><li>31,000 miles preserved</li><li>$412 refund protected</li></ul>${run.mode === 'replay' ? '<button class="primary" disabled>Awaiting replay approval <span>◷</span></button>' : `<a class="primary" href="${escape(run.approvalUrl || '#')}" target="_blank" rel="noopener">Approve Steward’s plan <span>↗</span></a>`}<div class="card-footnote">One approval. Everything else is on us.</div></article></section>`;
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
  ['CALENDAR', 'calendar.updated', 'calendar.updated', ['Updated', 'Meeting safe']],
  ['PEOPLE', 'sarah.notified', 'sarah.notified', ['Sarah notified', 'Confirmed']],
  ['WATCH', 'refund.requested', 'exception.resolved', ['Monitoring', 'Cash refund protected']],
];
function execution() {
  const approval = event('approval.received');
  return `<section class="scene execution">${title('AUTONOMOUS EXECUTION', 'Consider it<br><em>taken care of.</em>', 'You made the decision. Steward is doing the work.')}<div class="approved-badge">${check}<div>APPROVED BY VINCENT <span>${escape(approval.data.device)} · just now</span></div><span class="approved-line"></span> ONE HUMAN DECISION</div><div class="lanes">${lanes
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
    )}</div><div class="value-verdict ${evaluated ? 'visible' : ''}"><span>$412 CASH</span> <b>&gt;</b> <span class="credit">$450 CREDIT</span><p>Estimated credit value to you: $158 · 35% expected use</p></div></div></div><div class="rebuttal-bar ${p === 'refund' ? 'refund-success' : ''}"><span>${p === 'refund' ? '✓' : p === 'rebuttal' ? '↗' : '✳'}</span><div><strong>${p === 'refund' ? '$412 CASH REFUND APPROVED' : p === 'rebuttal' ? 'CREDIT REJECTED. CASH REQUESTED.' : evaluated ? 'CASH WINS. STEWARD IS RESPONDING.' : 'LARGER DOESN’T ALWAYS MEAN BETTER.'}</strong><p>${p === 'refund' ? 'Returned to your original payment method.' : p === 'rebuttal' ? '“Please return the $412 to the original payment method.”' : evaluated ? 'Your preferences and refund policy support cash. No second approval needed.' : 'Comparing flexibility, expiration, expected use, and refund policy.'}</p></div><span class="rebuttal-status">${p === 'refund' ? 'CONFIRMED' : p === 'rebuttal' ? 'SENT ✓' : 'AUTONOMOUS'}</span></div></section>`;
}
function resolved() {
  return `<section class="scene resolved">${title('EXCEPTION RESOLVED', 'Your life is<br><em>handled.</em>', 'One cancellation. Six consequences. Zero loose ends.')}<div class="resolution-mark">✓</div><div class="resolution-grid">${[
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
    )}</div><div class="final-line"><span>ONE HUMAN DECISION.</span><b>Everything else, handled.</b></div><button class="text-button" id="again">Return to calm <span>↗</span></button></section>`;
}
function render() {
  document.querySelector('#mode').textContent = !connected
    ? 'RECONNECTING · STATE PRESERVED'
    : run?.mode === 'replay'
      ? 'DETERMINISTIC REPLAY'
      : 'SANDBOX WORLD · LIVE AGENT';
  const p = phase();
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
      { calm, receiving, bloom, options, decision, execution, resolved }[p] || (() => offer(p))
    )();
    lastPhase = p;
    bind();
  } else if (['bloom', 'execution', 'decision'].includes(p)) {
    main.innerHTML = { bloom, execution, decision }[p]();
    bind();
  }
  renderProof();
  document.querySelector('#mode').textContent = !connected
    ? 'RECONNECTING · STATE PRESERVED'
    : run?.mode === 'replay'
      ? 'DETERMINISTIC REPLAY'
      : 'SANDBOX WORLD · LIVE AGENT';
}
function bind() {
  document.querySelector('#trigger')?.addEventListener('click', () => start('live'));
  document.querySelector('#again')?.addEventListener('click', reset);
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
    const r = await fetch('/api/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw Error();
    run = await r.json();
    localStorage.setItem('steward-run', run.id);
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
  run = null;
  localStorage.removeItem('steward-run');
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
  'exception.resolved': 'Exception resolved',
};
function renderProof() {
  const el = document.querySelector('#proof-content');
  el.innerHTML = run
    ? `<div class="proof-meta"><span>${run.mode.toUpperCase()} · ${escape(run.state)}</span><code>${run.id}</code><p>Airline, calendar, Sarah, booking and payments are sandboxed. Approval and workflow are real. ${run.delivery?.channel === 'email' ? 'AgentMail approval email sent.' : 'Email is ' + (run.mode === 'replay' ? 'simulated.' : 'not configured or not yet sent.')}</p></div><ol class="proof-events">${run.events.map((e) => `<li><span class="proof-check">✓</span><div>${escape(labels[e.type] || e.type)}<small>${escape(e.type)}</small></div><time>${new Date(e.at).toLocaleTimeString([], { hour12: false })}</time></li>`).join('')}</ol>`
    : '<div class="proof-meta"><p>Start a flight cancellation to see the backend event log. Every action has a timestamp and durable run ID.</p></div>';
}
async function poll() {
  const id = run?.id || localStorage.getItem('steward-run');
  if (!id) return;
  try {
    const res = await fetch(`/api/runs/${id}`, { signal: AbortSignal.timeout(4000) });
    if (res.status === 404) {
      localStorage.removeItem('steward-run');
      return;
    }
    if (!res.ok) throw Error();
    const next = await res.json();
    if (localStorage.getItem('steward-run') !== id) return;
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
document.querySelector('#proof-toggle').addEventListener('click', () => {
  document.querySelector('#proof').hidden = !document.querySelector('#proof').hidden;
  renderProof();
});
document
  .querySelector('#proof-close')
  .addEventListener('click', () => (document.querySelector('#proof').hidden = true));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelector('#proof').hidden = true;
  if (e.key.toLowerCase() === 'r' && e.shiftKey) start('replay');
});
render();
await poll();
setInterval(poll, 650);
