import { createIntelligenceCore } from '/intelligence-core.js';
const core = createIntelligenceCore(document.querySelector('#intelligence-core'));
window.addEventListener('pagehide', (e) => {
  if (!e.persisted) core.destroy();
});
const app = document.querySelector('#app');
const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
async function api(path, body) {
  const response = await fetch(`/account/api/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || 'Connection unavailable');
  return result;
}
function auth() {
  core.update({ state: 'observing' });
  load.stopped = true;
  load.lastState = undefined;
  app.innerHTML = `<section><span class="badge">PRIVATE DEVELOPMENT · ACCOUNTS</span><h2>Your private Steward</h2><p class="note">Your account owns its connections, world and decisions. The public synthetic sandbox has no access.</p><form><label>Account name<input name="login" autocomplete="username" minlength="3" maxlength="64" required></label><p class="note">A name or email address works. Used only as your private login name; no email is sent or verified.</p><label>Password · at least 14 characters<input name="password" type="password" autocomplete="current-password" minlength="14" maxlength="128" required></label><button type="submit">Sign in</button><button type="button" data-signup class="secondary">Create account</button><p role="status"></p></form><p class="note">Development accounts only. No password recovery or production account availability yet.</p></section>`;
  const form = app.querySelector('form');
  async function submit(kind) {
    const status = form.querySelector('[role=status]');
    if (!form.reportValidity()) return;
    const buttons = [...form.querySelectorAll('button')];
    buttons.forEach((button) => (button.disabled = true));
    try {
      await api(kind, {
        login: form.elements.namedItem('login').value,
        password: form.elements.namedItem('password').value,
      });
      form.elements.namedItem('password').value = '';
      await load();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      buttons.forEach((button) => (button.disabled = false));
    }
  }
  form.onsubmit = (e) => {
    e.preventDefault();
    submit('login');
  };
  app.querySelector('[data-signup]').onclick = () => submit('signup');
}
async function load() {
  const generation = (load.generation = (load.generation || 0) + 1);
  let state;
  try {
    state = await api('me');
  } catch {
    if (generation !== load.generation) return;
    auth();
    return;
  }
  if (generation !== load.generation) return;
  core.update(state.presence);
  load.stopped = false;
  const signature = JSON.stringify(state);
  if (signature === load.lastState && app.querySelector('[data-logout]')) return;
  load.lastState = signature;
  const decisionCount =
    state.decisions.some((d) => d.status === 'needs-you') ||
    state.understanding?.planning.some((p) => p.humanDecisions)
      ? 1
      : 0;
  const connections = state.connections
    .map(
      (c) =>
        `<section><span class="badge">${escape(c.status.toUpperCase())}</span><h2>${c.provider === 'calendar' ? 'Google Calendar' : 'Gmail'}</h2><p class="note">${c.provider === 'calendar' ? 'Read event times and locations; detect changes and overlapping commitments. No Calendar writes.' : 'Inspect up to 20 relevant recent messages using subject metadata. No bodies stored; no email sends.'}</p><p class="note">Last sync: ${escape(c.lastSyncAt || 'Not yet synced')}<br>Granted scopes: ${escape(c.scopes.join(', ') || 'None')}</p>${c.status === 'not-connected' ? `<button data-connect="${c.provider}" ${state.googleConfigured && c.enabled !== false ? '' : 'disabled'}>Review permissions</button>` : `<button data-sync="${c.provider}">Sync now</button><button class="secondary" data-disconnect="${c.provider}">Disconnect</button>`}</section>`,
    )
    .join('');
  app.innerHTML = `<p class="badge">PRIVATE SPACE · READ FIRST</p><h2>${decisionCount} ${decisionCount === 1 ? 'decision needs' : 'decisions need'} you</h2>${!state.googleConfigured ? '<section><h3>Google private testing awaits configuration</h3><p class="note">No real accounts are connected. Application credentials and a reviewed HTTPS callback are required.</p></section>' : ''}${connections}<section><h3>Decision inbox</h3>${state.decisions.length ? state.decisions.map((d) => `<p><strong>${escape(d.type)}</strong> · ${escape(d.status)}<br><span class="note">${escape(d.evidence)}. ${escape(d.action)}</span></p>`).join('') : '<p class="note">No decisions yet.</p>'}</section><section><h3>What matters next</h3>${(state.understanding?.next || []).map((c) => `<p><strong>${escape(c.label)}</strong><br><span class="note">${escape(c.start)} · ${escape(c.provenance)} · priority ${escape(state.understanding.models.find((m) => m.id === c.id)?.preferences.importance || 'unknown')}</span><br><button class="secondary" data-commitment="${escape(c.id)}">What matters for this commitment</button></p>`).join('') || '<p class="note">No upcoming commitments observed.</p>'}${(state.understanding?.planning || []).map((p) => `<section><span class="badge">INTERNAL OUTCOME PLANNING</span><h3>${escape(p.evidence)}</h3><p>${p.humanDecisions} decision${p.humanDecisions === 1 ? '' : 's'} · ${escape(p.disposition)}</p>${p.futures.map((f) => `<p><b>${escape(f.label)}</b><br><span class="note">${escape(f.requires)}</span></p>`).join('')}<p class="note">Prepared possibilities, not executed or verified outcomes. External actions: 0.</p></section>`).join('')}<h3>What Steward does not yet know</h3>${(state.understanding?.unknowns || []).map((t) => `<p class="note">${escape(t)}</p>`).join('') || '<p class="note">No additional assumptions made.</p>'}<p class="note">Observation only. No messages, attendee contact, or Calendar changes.</p></section><section><h3>Your connected world</h3><p class="note">Read-only · previous 24 hours through next 60 days. Automatically observed every two minutes.</p>${state.world?.calendarAnalysis ? `<p class="note">${escape(state.world.calendarAnalysis.conclusion)} External actions: 0.</p>` : ''}<p class="note">${state.understanding?.commitments.length || 0} current or upcoming commitments in your private world. Upcoming priorities are shown above.</p></section><section><h3>Activity</h3>${state.activity.map((a) => `<p>${escape(a.type)}<br><span class="note">${escape(a.at)}</span></p>`).join('') || '<p class="note">No provider activity yet.</p>'}</section><section><h3>Maximum intelligence.<br>Minimum necessary authority.</h3><p class="note">Read-first sensors. No external writes. External messages cannot change your permissions or the Steward Constitution. Polling runs every two minutes only while the private server is running.</p><button class="secondary" data-delete>Delete connected data</button><button class="secondary" data-logout>Sign out</button><p role="status"></p></section>`;
  const status = app.querySelector('[role=status]');
  const run = async (fn) => {
    try {
      await fn();
      await load();
    } catch (error) {
      status.textContent = error.message;
    }
  };
  app
    .querySelectorAll('[data-sync]')
    .forEach(
      (button) =>
        (button.onclick = () => run(() => api('sync', { provider: button.dataset.sync }))),
    );
  app
    .querySelectorAll('[data-disconnect]')
    .forEach(
      (button) =>
        (button.onclick = () =>
          run(() => api('disconnect', { provider: button.dataset.disconnect }))),
    );
  app.querySelector('[data-delete]').onclick = () => run(() => api('delete-data', {}));
  app.querySelector('[data-logout]').onclick = async () => {
    load.stopped = true;
    load.generation = (load.generation || 0) + 1;
    try {
      await api('logout', {});
      app.innerHTML = '';
      auth();
    } catch (error) {
      status.textContent = error.message;
    }
  };
  app.querySelectorAll('[data-commitment]').forEach(
    (button) =>
      (button.onclick = () => {
        const id = button.dataset.commitment,
          model = state.understanding.models.find((m) => m.id === id),
          prefs = model.preferences;
        const dialog = document.createElement('dialog');
        dialog.innerHTML = `<h2>What matters to you</h2><p>${escape(model.label)}</p><p class="note">Internal Steward preferences only. Nothing is written to Google Calendar.</p><form><label for="commitment-importance">Importance</label><select id="commitment-importance" name="importance">${['unknown', 'optional', 'important', 'must-protect'].map((v) => `<option value="${v}" ${prefs.importance === v ? 'selected' : ''}>${v}</option>`).join('')}</select><label>Preparation (minutes, blank if unknown)<input name="preparationMinutes" type="number" min="0" max="240" value="${prefs.preparationMinutes ?? ''}"></label><label>Travel buffer (minutes, blank if unknown)<input name="travelMinutes" type="number" min="0" max="240" value="${prefs.travelMinutes ?? ''}"></label><button type="submit">Save internal preferences</button><button type="button" class="secondary" data-cancel>Cancel</button><p role="status"></p></form>`;
        document.body.append(dialog);
        dialog.showModal();
        dialog.querySelector('select').focus();
        dialog.onclose = () => {
          dialog.remove();
          button.focus();
        };
        dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
        dialog.querySelector('form').onsubmit = async (e) => {
          e.preventDefault();
          const form = e.target;
          try {
            await api('commitment-rules', {
              id,
              importance: form.elements.importance.value,
              preparationMinutes:
                form.elements.preparationMinutes.value === ''
                  ? null
                  : Number(form.elements.preparationMinutes.value),
              travelMinutes:
                form.elements.travelMinutes.value === ''
                  ? null
                  : Number(form.elements.travelMinutes.value),
            });
            dialog.close();
            await load();
          } catch (error) {
            dialog.querySelector('[role=status]').textContent = error.message;
          }
        };
      }),
  );
  app.querySelectorAll('[data-connect]').forEach(
    (button) =>
      (button.onclick = () => {
        const provider = button.dataset.connect;
        const dialog = document.createElement('dialog');
        dialog.innerHTML = `<h2>Connect ${provider === 'calendar' ? 'Google Calendar' : 'Gmail'}</h2><p>Private testing · read-only</p><p class="note">${provider === 'calendar' ? 'Steward can understand commitments, detect schedule changes and identify conflicts. It cannot modify your calendar.' : 'Steward can inspect relevant recent message subjects for possible life changes. Gmail read-only is a restricted Google permission. It cannot send, delete or modify mail.'}</p><p class="note">Google credentials stay encrypted on the server, owned by your account. You can disconnect and delete derived data.</p><button data-continue>Continue to Google</button><button class="secondary" data-cancel>Cancel</button><p role="status"></p>`;
        document.body.append(dialog);
        dialog.showModal();
        dialog.querySelector('[data-cancel]').onclick = () => dialog.close();
        dialog.onclose = () => dialog.remove();
        dialog.querySelector('[data-continue]').onclick = async () => {
          try {
            const result = await api('connect', { provider });
            const url = new URL(result.authorizationUrl);
            if (url.origin !== 'https://accounts.google.com') throw Error('Invalid authorization');
            location.assign(url.href);
          } catch (error) {
            dialog.querySelector('[role=status]').textContent = error.message;
          }
        };
      }),
  );
}
window.addEventListener('pageshow', () => {
  app.innerHTML = '<p>Opening your private space…</p>';
  load();
});
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') load();
});
load();
// Refresh private view only; this never calls the provider synchronization endpoint.
setInterval(() => {
  if (
    !load.stopped &&
    !document.hidden &&
    app.querySelector('[data-logout]') &&
    !document.querySelector('dialog')
  )
    load();
}, 3000);
