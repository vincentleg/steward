import { connections, categories } from '/connections.js';
const $ = (s) => document.querySelector(s),
  content = $('#content'),
  sheet = $('#sheet');
const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const money = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
const clock = (hour) => {
  const h = Math.floor(hour),
    minutes = Math.round((hour - h) * 60);
  return `${h % 12 || 12}${minutes ? ':' + String(minutes).padStart(2, '0') : ''} ${h >= 12 ? 'PM' : 'AM'}`;
};
let world = null,
  token = sessionStorage.getItem('steward-life-token'),
  id = sessionStorage.getItem('steward-life-id'),
  scenarios = [],
  view = 'home',
  selected = null,
  filter = 'All',
  query = '',
  locked = false,
  lastFocus;
const names = {
  'deviation.detected': 'Deviation detected',
  'impact.understood': 'Understanding impact',
  'futures.simulated': 'Simulating futures',
  'authority.checked': 'Checking authority',
  observing: 'Observe only',
  'decision.pending': 'One decision needs you',
  'needs.information': 'More information needed',
  'approval.received': 'Approval received',
  'action.authorized': 'Action authorized',
  'action.executing': 'Acting within authority',
  'action.completed': 'Autonomously continuing',
  'provider.contacted': 'Contacting provider',
  'provider.responded': 'Provider response',
  'counteroffer.received': 'Counteroffer received',
  'offer.evaluated': 'Evaluating worth to you',
  negotiating: 'Negotiating',
  'refund.confirmed': 'Refund confirmed',
  'outcome.verifying': 'Verifying outcome',
  'outcome.restored': 'Outcome restored',
  stopped: 'Stopped',
  'action.failed': 'Paused safely',
  'verification.failed': 'Verification needs attention',
};
function notify(t) {
  $('#toast').textContent = t;
  $('#toast').hidden = false;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => ($('#toast').hidden = true), 6000);
}
async function api(path = '', body) {
  const response = await fetch('/world/api/sessions' + (path === 'create' ? '' : `/${id}${path}`), {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const r = await response.json();
  if (!response.ok) {
    const e = new Error(r.error || 'The connection was interrupted. Try again.');
    e.status = response.status;
    throw e;
  }
  return r;
}
function setWorld(w) {
  world = w;
  id = w.id;
}
async function create() {
  const r = await api('create', {});
  setWorld(r.world);
  token = r.accessToken;
  sessionStorage.setItem('steward-life-id', id);
  sessionStorage.setItem('steward-life-token', token);
}
async function task(fn) {
  if (locked) {
    notify('Finishing the current update. Please try again in a moment.');
    return;
  }
  locked = true;
  try {
    await fn();
  } catch (e) {
    notify(e.message);
    try {
      setWorld((await api()).world);
      render();
    } catch {}
  } finally {
    locked = false;
  }
}
function summary() {
  return `<div class="life-summary"><div class="metric"><small>Flexible cash</small><strong>${money(world.resources.cash)}</strong><p>${money(world.resources.cash - 5000)} from the seeded world</p></div><div class="metric"><small>Future resources</small><strong>${world.resources.miles.toLocaleString()} miles</strong><p>${money(world.resources.benefit)} benefit remaining</p></div><div class="metric"><small>Tomorrow’s commitment</small><strong>${clock(world.commitments.find((c) => c.id === 'morning').hour)}</strong><p>${esc(world.commitments.find((c) => c.id === 'morning').status)} · Sarah</p></div><div class="metric"><small>Verified outcomes</small><strong>${world.outcomeHistory.length}</strong><p>${world.memory.length} operational memories</p></div></div>`;
}
function controls() {
  return `<div class="world-bar"><label for="autonomy">Autonomy</label><select id="autonomy"><option value="observe" ${world.settings.autonomy === 'observe' ? 'selected' : ''}>Observe only</option><option value="ask" ${world.settings.autonomy === 'ask' ? 'selected' : ''}>Ask before acting</option><option value="rules" ${world.settings.autonomy === 'rules' ? 'selected' : ''}>Act within my rules</option></select><button class="text-button" data-change>Change the world ↗</button><button class="text-button" data-reset>Reset world</button></div>`;
}
function history() {
  return world.resolutions.length
    ? `<div class="resolution-list">${world.resolutions
        .slice()
        .reverse()
        .map(
          (r) =>
            `<button class="resolution-row" data-resolution="${r.id}"><span><b>${esc(r.title)}</b><small>${esc(r.selected?.title || r.goal)}</small></span><span class="status">${esc(names[r.state] || r.state)}</span></button>`,
        )
        .join('')}</div>`
    : '<p class="empty">Nothing needs attention. Inject an event to see Steward work.</p>';
}
function home() {
  const active = world.resolutions.filter(
    (r) => !['outcome.restored', 'stopped'].includes(r.state),
  );
  const count = active.filter((r) =>
    ['decision.pending', 'needs.information', 'verification.failed'].includes(r.state),
  ).length;
  return `<section class="hero reveal"><span class="eyebrow">ONE INTELLIGENCE. YOUR WHOLE LIFE.</span><h1>${world.activeDeviations.length ? 'Your world needs attention.' : 'Your world is stable.'}</h1><div class="decision-count"><b>${count}</b><span>${count === 1 ? 'DECISION NEEDS' : 'DECISIONS NEED'} YOU</span></div><p class="lede">Steward notices what changes, understands what it affects, and works until the outcome is restored.</p><div class="actions"><button class="primary" data-view="try">Try Steward →</button><button class="secondary" data-view="connect">Connect my life ↗</button><button class="secondary" data-change>Change the world</button></div><p class="note">A working synthetic world. No account, personal data, or connected services required.</p></section>${summary()}${controls()}<div class="section-head"><h2>Personal World State</h2><span class="eyebrow">WATCHING</span></div><div class="domains">${world.watching.map((d) => `<span class="domain">${d}</span>`).join('')}</div><p class="note">Shared goals, commitments, money, resources, and rules. Steward observes the changes you introduce here; it does not access your real accounts.</p><div class="section-head"><h2>Active resolutions & history</h2></div>${history()}`;
}
function library() {
  return `<section class="reveal"><span class="eyebrow">THE WORLD IS SYNTHETIC. THE STATE CHANGES ARE REAL.</span><h1>Try Steward.</h1><p class="lede">Choose what changes. Steward uses the same world, value model, authority, and verification loop across every capability.</p>${controls()}<div class="grid">${scenarios
    .map((s) => {
      const resolved = world.resolutions.find(
        (r) => r.scenario === s.id && r.state === 'outcome.restored',
      );
      return `<button class="scenario ${resolved ? 'resolved' : ''}" data-scenario="${s.id}"><span class="eyebrow">${esc(s.domain)}</span><h3>${esc(s.title)}</h3><p>${esc(s.detail)}</p><span class="go">${resolved ? 'View verified outcome ✓' : 'Introduce this event →'}</span></button>`;
    })
    .join(
      '',
    )}</div><div class="section-head"><h2>Your world stays with you.</h2></div>${summary()}<p class="note">Cash, miles, commitments, rules, and outcomes are shared across scenarios in this session. Reset world restores the seed.</p></section>`;
}
function resolution() {
  const r = world.resolutions.find((r) => r.id === selected);
  if (!r) {
    view = 'try';
    return library();
  }
  const selectedOption = r.selected;
  const completed = r.state === 'outcome.restored';
  const active = !completed && r.state !== 'stopped';
  return `<section class="reveal"><button class="text-button" data-view="try">← All capabilities</button><span class="eyebrow">${esc(r.provider)} · SYNTHETIC COUNTERPARTY</span><h1>${esc(completed ? 'Outcome restored.' : r.title)}</h1><p class="lede">${esc(r.goal)}</p><div class="live-state" role="status">${esc(names[r.state] || r.state)}</div>${controls()}<div class="steps">${['Observe', 'Understand', 'Simulate', 'Authorize', 'Act', 'Verify'].map((s, i) => `<span class="${i === (completed ? 5 : ['decision.pending', 'observing', 'needs.information'].includes(r.state) ? 3 : r.actions.length ? 4 : r.impact ? 2 : 0) ? 'current' : ''}">${s}</span>`).join('')}</div><div class="resolution-layout"><div class="resolution-main">${
    r.impact
      ? `<div class="section-head"><h2>Impact Graph</h2><span class="eyebrow">CONNECTED CONSEQUENCES</span></div><div class="impact-source">${esc(r.title)}</div><div class="impact-nodes">${r.impact.nodes.map((n) => `<div>${esc(n.label)}</div>`).join('')}</div><p class="note">Derived from dependencies in your World State. These commitments and resources constrain the possible futures.</p><div class="compression"><div><strong>${r.impact.affectedCount}</strong><small>Consequences</small></div><i>→</i><div><strong>${r.futures.length}</strong><small>Futures</small></div><i>→</i><div><strong>${r.compression.humanDecisions}</strong><small>Human decisions</small></div></div><span class="eyebrow">DECISION COMPRESSION · WORTH TO YOU</span><div class="section-head"><h2>Possible futures</h2></div><div class="options">${r.options
          .map((o) => {
            const f = r.evaluation.ranked.find((f) => f.id === o.id);
            return `<article class="option ${o.id === r.recommended ? 'recommended' : ''} ${!f?.feasible ? 'blocked' : ''}"><header><span class="eyebrow">${o.id === r.recommended ? 'STEWARD RECOMMENDS' : !f?.feasible ? 'CONSTRAINT NOT MET' : 'ALTERNATIVE'}</span><span class="cost">${o.costs.money ? money(o.costs.money) + ' net' : o.costs.futureValue ? money(o.costs.futureValue) + ' future value' : '$0 additional cash'}</span></header><h3>${esc(o.title)}</h3><ul>${o.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><span class="note">${Math.round(o.confidence * 100)}% confidence in seeded facts · ${esc(o.reversibility)}</span></article>`;
          })
          .join('')}</div>`
      : '<div class="loading-mark">↗</div><h2>Understanding what changed.</h2><p class="muted">Following the dependencies in your world.</p>'
  }</div><aside class="resolution-side"><div class="decision"><span class="eyebrow">${completed ? 'VERIFIED OUTCOME' : r.state === 'observing' ? 'OBSERVE ONLY' : r.state === 'decision.pending' ? 'ONE DECISION NEEDS YOU' : 'STEWARD IS WORKING'}</span><h2>${esc(completed ? 'Back to calm.' : selectedOption?.title || 'Understanding the outcome.')}</h2>${
    completed
      ? `<ul class="evidence">${r.outcome.evidence.map((e) => `<li>${esc(e.label)}</li>`).join('')}</ul><p><b>${r.humanDecisions} human ${r.humanDecisions === 1 ? 'decision' : 'decisions'}. ${r.actions.length} verified actions.</b></p><button class="primary" data-view="try">Try another capability →</button>`
      : `${
          r.evidence?.length
            ? `<ul class="evidence">${r.evidence
                .slice(0, 3)
                .map((e) => `<li>${esc(e)}</li>`)
                .join('')}</ul>`
            : '<p>Detect → understand → evaluate → act → verify.</p>'
        }${r.state === 'decision.pending' ? `<button class="primary" id="approve">Approve plan</button><p class="note">Authorizes only this plan in this synthetic world. No real transaction.</p>` : r.state === 'observing' ? '<p>No action will execute. Change autonomy to ask or act within your rules.</p>' : r.state === 'needs.information' ? '<p>No plan meets every constraint. Change the world to resolve the conflict.</p>' : '<p class="muted">No additional human interaction is needed while authorized actions run.</p>'}${active ? `<button class="text-button" data-stop="${r.id}">Stop this resolution</button>` : ''}`
  }</div>${r.offer ? `<div class="offer"><span class="eyebrow">COUNTERPARTY OFFER · WORTH TO YOU</span><div class="value">$450 credit<br>vs $412 cash</div><p>Credit’s expected value to you: ${money(r.offer.creditWorth)}.</p><p>Airline locked · expiration · ${Math.round(world.settings.airlineUseProbability * 100)}% expected use.</p><strong>${r.offer.accepted === undefined ? 'Evaluating…' : r.offer.accepted ? 'Credit accepted under your preference' : 'Offer rejected. Cash wins.'}</strong></div>` : ''}<div class="section-head"><h2>Live activity</h2></div><ul class="activity">${world.events
    .filter((e) => e.resolutionId === r.id)
    .slice(-12)
    .reverse()
    .map(
      (e) =>
        `<li>${esc(e.label)}<time>${new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></li>`,
    )
    .join(
      '',
    )}</ul><p class="note">Maximum intelligence. Minimum necessary authority. <button class="text-button" data-trust>View Constitution ↗</button></p></aside></div></section>`;
}
function connectionCards() {
  const rows = connections.filter(
    (c) =>
      (filter === 'All' || c.category === filter) &&
      `${c.name} ${c.category} ${c.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return `<p class="note">${rows.length} planned connections. No public integrations are available yet; no partnerships or endorsements are implied.</p><div class="grid">${rows.map((c) => `<article class="connection"><div class="connection-top"><span class="icon" aria-hidden="true">${esc(c.name.slice(0, 1))}</span><div><h3>${esc(c.name)}</h3><small>${c.status} · ${c.category.toUpperCase()}</small></div></div><p>${esc(c.description)}</p><div class="permission">SEE SELECTED CONTEXT<br>PREPARE · ACT ONLY WITH PERMISSION</div><button class="secondary" data-connect="${c.id}" aria-label="Connect ${esc(c.name)}">Connect →</button></article>`).join('')}</div>${!rows.length ? '<p class="empty">No planned connection matches. Try a service name or a life domain.</p>' : ''}`;
}
function connect() {
  return `<section class="reveal"><button class="text-button" data-view="home">← Steward</button><div class="connect-hero"><span class="eyebrow">CONNECTION CENTER · EARLY ACCESS PREVIEW</span><h1>Connect my life.</h1><p class="lede">Give Steward the context and capabilities it needs to understand your world and act on your behalf.</p><p><b>You control what Steward can see and do.</b></p><p class="note">Connections are coming soon. Explore planned capabilities and permission boundaries. Nothing here initiates authorization or collects credentials.</p></div><div class="connection-diagram"><div class="diagram-domains">${['Email', 'Calendar', 'Money', 'Travel', 'Transport', 'Work', 'People', 'Home'].map((d) => `<span>${d}</span>`).join('')}</div><span aria-hidden="true">→</span><div class="diagram-core">STEWARD</div><span aria-hidden="true">→</span><div class="diagram-result">UNDERSTAND<br>DECIDE · ACT · VERIFY</div></div><label for="connection-search">Search connections</label><input id="connection-search" class="search" type="search" placeholder="Air France, Calendar, Transport, Money…" value="${esc(query)}" autocomplete="off"><div class="filters" aria-label="Connection categories">${['All', ...categories].map((c) => `<button data-filter="${c}" aria-pressed="${filter === c}">${c}</button>`).join('')}</div><div id="connection-results">${connectionCards()}</div><section class="privacy-preview"><span class="eyebrow">YOUR LIFE. YOUR PERMISSIONS.</span><h2>Compartmentalized access.</h2><p class="lede">One intelligence does not mean every service gets your entire world. Each capability receives only the context its task requires.</p><div class="privacy-columns"><div><h3>A future airline action could access</h3><ul><li>The relevant trip</li><li>Selected travel preferences</li><li>An explicitly authorized payment method</li></ul></div><div><h3>It could not access</h3><ul><li>Unrelated private messages</li><li>Unrelated finances</li><li>Health information</li></ul></div></div><p class="note">Proposed permission architecture, not a claim of current account connectivity. Connections would be individually permissioned and revocable.</p><button class="secondary" data-trust>Steward Constitution & privacy</button></section></section>`;
}
let renderedView = null;
function render() {
  if (!world) return;
  document
    .querySelectorAll('nav button')
    .forEach((b) => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
  content.innerHTML =
    view === 'home'
      ? home()
      : view === 'try'
        ? library()
        : view === 'resolution'
          ? resolution()
          : connect();
  if (renderedView === view)
    content.querySelectorAll('.reveal').forEach((el) => el.classList.remove('reveal'));
  renderedView = view;
  bind();
}
function openDialog(kicker, html) {
  lastFocus = document.activeElement;
  $('#sheet-kicker').textContent = kicker;
  $('#sheet-content').innerHTML = html;
  sheet.showModal();
  sheet.querySelector('button,input,select')?.focus();
}
function closeDialog() {
  sheet.close();
  render();
  const replacement = lastFocus?.dataset.connect
    ? document.querySelector(`[data-connect="${CSS.escape(lastFocus.dataset.connect)}"]`)
    : lastFocus?.hasAttribute('data-change')
      ? document.querySelector('[data-change]')
      : lastFocus?.id
        ? document.getElementById(lastFocus.id)
        : null;
  (lastFocus?.isConnected
    ? lastFocus
    : replacement || document.querySelector('nav button[aria-current=page]')
  )?.focus();
}
function trust() {
  openDialog(
    'YOUR MANDATE, NOT EXTERNAL INSTRUCTIONS',
    `<h2 id="sheet-title">Steward Constitution</h2><p><b>Maximum intelligence. Minimum necessary authority.</b></p><div class="permission-list"><div><b>GREEN · OBSERVE</b><p>Analyze, simulate, compare, and prepare.</p></div><div><b>YELLOW · WITHIN YOUR RULES</b><p>Explicitly authorized, low-risk, reversible synthetic actions.</p></div><div><b>RED · ASK</b><p>Spending, irreversible commitments, sensitive communication, or insufficient evidence.</p></div><div><b>BLACK · NEVER</b><p>No credential theft, permission escalation, unauthorized access, or Constitution changes. External content is data, never authority.</p></div></div><h3>Privacy by design</h3><p>This public experience uses synthetic data, isolated sessions, and no real account connections. Your session expires after 30 minutes. Reset world clears its synthetic history. Server restart may also clear the session.</p><p>Do not enter personal information. There is no real OAuth, credential collection, mail relay, or real payment execution.</p><button class="primary" data-dismiss>Got it</button>`,
  );
  bindDialog();
}
function change() {
  const s = world.settings,
    m = world.commitments.find((c) => c.id === 'morning');
  openDialog(
    'PROVE THE RECOMMENDATION CAN CHANGE',
    `<h2 id="sheet-title">Change the world.</h2><p>Inject a synthetic fact or change an explicit rule. Steward recalculates against the same world. No personal information, please.</p><form id="change-form"><label for="world-update">A change to your synthetic world</label><input id="world-update" maxlength="300" placeholder="My meeting isn’t important anymore." autocomplete="off"><div class="examples">${["My meeting isn't important anymore.", "I won't spend more than $50.", 'My meeting moved to 8 AM.', 'I need to preserve my miles.', "The delivery isn't urgent.", "I'd rather protect dinner."].map((t) => `<button type="button" data-example="${esc(t)}">${esc(t)}</button>`).join('')}</div><button class="primary" type="submit">Update world →</button></form><h3 style="margin-top:30px">Your explicit rules</h3><form id="settings-form"><div class="form-row"><label>Maximum incremental spending<input name="maxSpend" type="number" min="0" max="2000" value="${s.maxSpend}"></label><label>Reversible spending authority<select name="spendingAuthority">${[0, 50, 100, 250].map((n) => `<option value="${n}" ${s.spendingAuthority === n ? 'selected' : ''}>${money(n)}</option>`).join('')}</select></label><label>Time value<select name="timeValue">${['low', 'medium', 'high'].map((n) => `<option ${s.timeValue === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label>Risk tolerance<select name="riskTolerance">${['low', 'balanced', 'high'].map((n) => `<option ${s.riskTolerance === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label>Calendar priority<select name="calendarPriority">${['personal', 'balanced', 'professional'].map((n) => `<option ${s.calendarPriority === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label>Meeting importance<select name="meetingImportance"><option value="1" ${m.importance === 1 ? 'selected' : ''}>Must protect</option><option value="0" ${m.importance === 0 ? 'selected' : ''}>Optional</option></select></label><label>Meeting hour (24-hour)<input name="meetingHour" type="number" min="0" max="23.5" step=".5" value="${m.hour}"></label><label>Miles preference<select name="preserveMiles"><option value="true" ${s.preserveMiles ? 'selected' : ''}>Preserve future miles</option><option value="false" ${!s.preserveMiles ? 'selected' : ''}>Comfortable using miles</option></select></label><label>Subscription usage<select name="subscriptionUsage"><option value="low" ${s.subscriptionUsage === 'low' ? 'selected' : ''}>Low</option><option value="high" ${s.subscriptionUsage === 'high' ? 'selected' : ''}>High</option></select></label><label>Delivery urgency<select name="deliveryUrgent"><option value="true" ${s.deliveryUrgent ? 'selected' : ''}>Needed tomorrow</option><option value="false" ${!s.deliveryUrgent ? 'selected' : ''}>Not urgent</option></select></label><label>Expected use of airline credit<select name="airlineUseProbability"><option value="0.3" ${s.airlineUseProbability === 0.3 ? 'selected' : ''}>Low · 30%</option><option value="0.7" ${s.airlineUseProbability === 0.7 ? 'selected' : ''}>Frequent · 70%</option><option value="1" ${s.airlineUseProbability === 1 ? 'selected' : ''}>Certain · 100%</option></select></label></div><p class="note">All amounts are synthetic. Consequential or irreversible actions still require approval, even when spending authority is configured.</p><button class="secondary" type="submit">Apply rules</button></form><h3 style="margin-top:30px">Operational memory</h3><p>Explicit changes are remembered in this session. Completed actions do not silently become permanent preferences.</p><ul class="memory-list">${
      world.memory
        .slice(-5)
        .reverse()
        .map((m) => `<li>${esc(m.kind)} · ${esc(JSON.stringify(m.value))}</li>`)
        .join('') || '<li>No memory yet.</li>'
    }</ul>`,
  );
  bindDialog();
  $('#change-form').onsubmit = (e) => {
    e.preventDefault();
    void task(async () => {
      const r = await api('/change', { text: $('#world-update').value });
      setWorld(r.world);
      notify(r.update.message);
      if (r.update.recognized) closeDialog();
    });
  };
  $('#settings-form').onsubmit = (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.target));
    for (const key of [
      'maxSpend',
      'spendingAuthority',
      'meetingImportance',
      'meetingHour',
      'airlineUseProbability',
    ])
      values[key] = Number(values[key]);
    for (const key of ['preserveMiles', 'deliveryUrgent']) values[key] = values[key] === 'true';
    void task(async () => {
      const r = await api('/change', { settings: values });
      setWorld(r.world);
      notify(r.update.message);
      closeDialog();
    });
  };
  sheet
    .querySelectorAll('[data-example]')
    .forEach((b) => (b.onclick = () => ($('#world-update').value = b.dataset.example)));
}
function connectionDialog(id) {
  const c = connections.find((c) => c.id === id);
  openDialog(
    'PLANNED CONNECTION · COMING SOON',
    `<h2 id="sheet-title">${esc(c.name)} for Steward</h2><p>Connections are currently in development. No authorization starts here, and no credentials or contact details are collected.</p><div class="permission-list">${[
      ['SEE', c.see],
      ['UNDERSTAND', c.understand],
      ['PREPARE', c.prepare],
      ['ACT', c.act],
    ]
      .map(([a, b]) => `<div><b>${a}</b><p>${esc(b)}</p></div>`)
      .join(
        '',
      )}</div><p>You would choose each permission and be able to revoke it. Your world stays yours.</p><button class="primary" data-dismiss>Got it</button>`,
  );
  bindDialog();
}
function bindDialog() {
  sheet.querySelectorAll('[data-dismiss]').forEach((b) => (b.onclick = closeDialog));
}
function bind() {
  content
    .querySelectorAll('[data-view]')
    .forEach((b) => (b.onclick = () => navigate(b.dataset.view)));
  content.querySelectorAll('[data-change]').forEach((b) => (b.onclick = change));
  content.querySelectorAll('[data-trust]').forEach((b) => (b.onclick = trust));
  content.querySelectorAll('[data-reset]').forEach((b) => (b.onclick = () => openReset()));
  content.querySelectorAll('[data-resolution]').forEach(
    (b) =>
      (b.onclick = () => {
        selected = b.dataset.resolution;
        view = 'resolution';
        render();
        window.scrollTo(0, 0);
      }),
  );
  content.querySelectorAll('[data-scenario]').forEach(
    (b) =>
      (b.onclick = () =>
        task(async () => {
          const prior = world.resolutions.find(
            (r) => r.scenario === b.dataset.scenario && r.state === 'outcome.restored',
          );
          if (prior) {
            selected = prior.id;
          } else {
            setWorld((await api('/start', { scenario: b.dataset.scenario })).world);
            selected = world.resolutions.at(-1).id;
          }
          view = 'resolution';
          render();
          window.scrollTo(0, 0);
        })),
  );
  content.querySelectorAll('[data-stop]').forEach(
    (b) =>
      (b.onclick = () =>
        task(async () => {
          setWorld((await api('/stop', { id: b.dataset.stop })).world);
          render();
        })),
  );
  if ($('#autonomy'))
    $('#autonomy').onchange = (e) =>
      task(async () => {
        setWorld((await api('/change', { settings: { autonomy: e.target.value } })).world);
        render();
        notify('Authority updated.');
      });
  if ($('#approve'))
    $('#approve').onclick = () =>
      task(async () => {
        setWorld((await api('/approve', { id: selected, revision: world.revision })).world);
        render();
      });
  content.querySelectorAll('[data-filter]').forEach(
    (b) =>
      (b.onclick = () => {
        filter = b.dataset.filter;
        render();
      }),
  );
  if ($('#connection-search'))
    $('#connection-search').oninput = (e) => {
      query = e.target.value;
      $('#connection-results').innerHTML = connectionCards();
      bindConnections();
    };
  bindConnections();
}
function bindConnections() {
  content
    .querySelectorAll('[data-connect]')
    .forEach((b) => (b.onclick = () => connectionDialog(b.dataset.connect)));
}
function navigate(v) {
  view = v;
  render();
  window.scrollTo(0, 0);
}
function openReset() {
  openDialog(
    'SYNTHETIC SESSION ONLY',
    `<h2 id="sheet-title">Reset your world?</h2><p>This clears synthetic actions, rules, money changes, outcomes, and operational memory. Your session remains isolated.</p><button class="primary" id="confirm-reset">Reset world</button><button class="secondary" data-dismiss>Keep my world</button>`,
  );
  bindDialog();
  $('#confirm-reset').onclick = () =>
    task(async () => {
      setWorld((await api('/reset', {})).world);
      selected = null;
      view = 'home';
      closeDialog();
      notify('Your synthetic world is stable again.');
    });
}
$('#close-sheet').onclick = closeDialog;
sheet.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeDialog();
});
$('#trust').onclick = trust;
document
  .querySelectorAll('nav [data-view]')
  .forEach((b) => (b.onclick = () => navigate(b.dataset.view)));
async function boot() {
  try {
    const r = await fetch('/world/api/scenarios');
    if (!r.ok) throw Error('Service unavailable');
    scenarios = (await r.json()).scenarios;
    if (id && token) {
      try {
        setWorld((await api()).world);
      } catch (e) {
        if (e.status === 404) await create();
        else throw e;
      }
    } else await create();
    render();
  } catch {
    content.innerHTML =
      '<section class="loading"><h1>Your world is a moment away.</h1><p>The free cloud service may be waking up. Try again; no actions have been started.</p><button class="primary" id="retry">Try again</button></section>';
    $('#retry').onclick = boot;
  }
}
await boot();
setInterval(async () => {
  if (!id || !token) return;
  try {
    const r = await api();
    const changed = !world || r.world.revision !== world.revision;
    setWorld(r.world);
    if (changed && !sheet.open && view !== 'connect' && !locked) render();
  } catch (e) {
    if (e.status === 404) {
      notify('Your synthetic session expired. Preparing a fresh world.');
      id = null;
      token = null;
      await boot();
    } else if (!navigator.onLine)
      notify('Offline. Your last world is still visible; reconnect to continue.');
  }
}, 650);
