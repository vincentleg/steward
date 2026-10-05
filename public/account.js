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
  app.innerHTML = `<section><span class="badge">PRIVATE DEVELOPMENT · ACCOUNTS</span><h2>Your private Steward</h2><p class="note">Your account owns its connections, world and decisions. The public synthetic sandbox has no access.</p><form><label>Account name<input name="login" autocomplete="username" minlength="3" maxlength="64" required></label><label>Password · at least 14 characters<input name="password" type="password" autocomplete="current-password" minlength="14" maxlength="128" required></label><button type="submit">Sign in</button><button type="button" data-signup class="secondary">Create account</button><p role="status"></p></form><p class="note">Development accounts only. No password recovery or production account availability yet.</p></section>`;
  const form = app.querySelector('form');
  async function submit(kind) {
    const status = form.querySelector('[role=status]');
    try {
      await api(kind, { login: form.login.value, password: form.password.value });
      form.password.value = '';
      await load();
    } catch (error) {
      status.textContent = error.message;
    }
  }
  form.onsubmit = (e) => {
    e.preventDefault();
    submit('login');
  };
  app.querySelector('[data-signup]').onclick = () => submit('signup');
}
async function load() {
  let state;
  try {
    state = await api('me');
  } catch {
    auth();
    return;
  }
  const connections = state.connections
    .map(
      (c) =>
        `<section><span class="badge">${escape(c.status.toUpperCase())}</span><h2>${c.provider === 'calendar' ? 'Google Calendar' : 'Gmail'}</h2><p class="note">${c.provider === 'calendar' ? 'Read event times and locations; detect changes and overlapping commitments. No Calendar writes.' : 'Inspect up to 20 relevant recent messages using subject metadata. No bodies stored; no email sends.'}</p><p class="note">Last sync: ${escape(c.lastSyncAt || 'Not yet synced')}<br>Granted scopes: ${escape(c.scopes.join(', ') || 'None')}</p>${c.status === 'not-connected' ? `<button data-connect="${c.provider}" ${state.googleConfigured ? '' : 'disabled'}>Review permissions</button>` : `<button data-sync="${c.provider}">Sync now</button><button class="secondary" data-disconnect="${c.provider}">Disconnect</button>`}</section>`,
    )
    .join('');
  app.innerHTML = `<p class="badge">PRIVATE SPACE · READ FIRST</p><h2>${state.decisions.filter((d) => d.status === 'needs-you').length} decisions need you</h2>${!state.googleConfigured ? '<section><h3>Google private testing awaits configuration</h3><p class="note">No real accounts are connected. Application credentials and a reviewed HTTPS callback are required.</p></section>' : ''}${connections}<section><h3>Decision inbox</h3>${state.decisions.length ? state.decisions.map((d) => `<p><strong>${escape(d.type)}</strong> · ${escape(d.status)}<br><span class="note">${escape(d.evidence)}. ${escape(d.action)}</span></p>`).join('') : '<p class="note">No decisions yet.</p>'}</section><section><h3>Your connected world</h3>${(state.world?.commitments || []).map((c) => `<p>${escape(c.title)}<br><span class="note">${escape(c.start)} · Google Calendar · importance unknown</span></p>`).join('') || '<p class="note">No personal world data loaded.</p>'}</section><section><h3>Activity</h3>${state.activity.map((a) => `<p>${escape(a.type)}<br><span class="note">${escape(a.at)}</span></p>`).join('') || '<p class="note">No provider activity yet.</p>'}</section><section><h3>Maximum intelligence.<br>Minimum necessary authority.</h3><p class="note">Read-first sensors. No external writes. External messages cannot change your permissions or the Steward Constitution. Polling runs every two minutes only while the private server is running.</p><button class="secondary" data-delete>Delete connected data</button><button class="secondary" data-logout>Sign out</button><p role="status"></p></section>`;
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
    try {
      await api('logout', {});
      app.innerHTML = '';
      auth();
    } catch (error) {
      status.textContent = error.message;
    }
  };
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
