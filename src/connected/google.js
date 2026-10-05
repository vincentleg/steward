import { randomBytes, createHash } from 'node:crypto';
export const GOOGLE_SCOPES = Object.freeze({
  calendar: 'https://www.googleapis.com/auth/calendar.events.readonly',
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
});

// Deliberately no provider writes. Credentials never leave this server-side adapter.
export class GoogleSensor {
  constructor({ store, clientId, clientSecret, origin, fetchImpl = fetch, now = Date.now }) {
    const url = new URL(origin);
    if (
      !clientId ||
      !clientSecret ||
      (url.protocol !== 'https:' &&
        !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    )
      throw Error('Google application configuration required');
    Object.assign(this, { store, clientId, clientSecret, origin, fetchImpl, now });
  }
  begin(token, provider) {
    if (!GOOGLE_SCOPES[provider]) throw Error('Unsupported provider');
    const verifier = randomBytes(32).toString('base64url');
    const state = this.store.beginOAuth(token, provider, { verifier });
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.search = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: `${this.origin}/account/oauth/${provider}/callback`,
      response_type: 'code',
      scope: GOOGLE_SCOPES[provider],
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString();
    return url.href;
  }
  async tokenRequest(params) {
    const response = await this.fetchImpl('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        ...params,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error('Google authorization unavailable');
    return response.json();
  }
  async callback(token, provider, state, code) {
    if (!GOOGLE_SCOPES[provider] || typeof code !== 'string' || code.length > 4096)
      throw Error('Invalid authorization');
    const transaction = this.store.consumeOAuth(token, state, provider);
    const result = await this.tokenRequest({
      grant_type: 'authorization_code',
      code,
      code_verifier: transaction.verifier,
      redirect_uri: `${this.origin}/account/oauth/${provider}/callback`,
    });
    const scopes = (result.scope || '').split(' ');
    if (
      this.store.owner(token) !== transaction.owner ||
      this.store.oauthVersion(transaction.owner, provider) !== transaction.generation
    )
      throw Error('Authorization cancelled');
    if (
      !scopes.includes(GOOGLE_SCOPES[provider]) ||
      !result.access_token ||
      !result.refresh_token ||
      !Number.isFinite(result.expires_in) ||
      result.expires_in <= 0
    )
      throw Error('Required offline permission not granted');
    this.store.connect(transaction.owner, provider, {
      id: randomBytes(16).toString('hex'),
      status: 'connected',
      scopes,
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresAt: this.now() + result.expires_in * 1000,
    });
  }
  async read(owner, provider, path, params = {}) {
    let connection = this.store.connection(owner, provider);
    if (!connection) throw Error('Not connected');
    if (
      provider === 'calendar' &&
      (!connection.scopes?.includes(GOOGLE_SCOPES.calendar) ||
        connection.scopes.some(
          (scope) =>
            scope.startsWith('https://www.googleapis.com/auth/calendar') &&
            scope !== GOOGLE_SCOPES.calendar,
        ))
    )
      throw Error('Read-only Calendar permission required');
    if (connection.expiresAt <= this.now() + 60000) {
      const result = await this.tokenRequest({
        grant_type: 'refresh_token',
        refresh_token: connection.refreshToken,
      });
      if (!result.access_token || !Number.isFinite(result.expires_in) || result.expires_in <= 0)
        throw Error('Invalid Google credential response');
      const current = this.store.connection(owner, provider);
      if (!current || current.id !== connection.id) throw Error('Connection revoked');
      connection = {
        ...connection,
        accessToken: result.access_token,
        expiresAt: this.now() + result.expires_in * 1000,
      };
      this.store.connect(owner, provider, connection);
    }
    const base =
      provider === 'calendar'
        ? 'https://www.googleapis.com/calendar/v3/'
        : 'https://gmail.googleapis.com/gmail/v1/users/me/';
    // Only known read endpoints; callers cannot turn this adapter into an arbitrary URL tool.
    if (
      !(provider === 'calendar' && path === 'calendars/primary/events') &&
      !(provider === 'gmail' && /^messages(?:\/[a-zA-Z0-9_-]+)?$/.test(path))
    )
      throw Error('Read endpoint prohibited');
    const url = new URL(path, base);
    url.search = new URLSearchParams(params).toString();
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${connection.accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const error = Error('Google synchronization unavailable');
      error.status = response.status;
      throw error;
    }
    const result = await response.json();
    if (this.store.connection(owner, provider)?.id !== connection.id)
      throw Error('Connection revoked');
    return result;
  }
  async disconnect(owner, provider) {
    const connection = this.store.connection(owner, provider);
    this.store.disconnect(owner, provider); // Stop ingestion even if provider revocation fails.
    if (!connection) return true;
    try {
      const result = await this.fetchImpl('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: connection.refreshToken }),
        signal: AbortSignal.timeout(10000),
      });
      return result.ok;
    } catch {
      return false;
    }
  }
}
