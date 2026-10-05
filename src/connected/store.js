import { DatabaseSync } from 'node:sqlite';
import {
  randomBytes,
  randomUUID,
  createHash,
  createCipheriv,
  createDecipheriv,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { chmodSync } from 'node:fs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
export class AccountInputError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
function accountName(value) {
  if (typeof value !== 'string')
    throw new AccountInputError(
      'ACCOUNT_NAME_INVALID',
      'Use a name or email address, 3–64 characters.',
    );
  const name = value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  if (name.length < 3 || name.length > 64 || !/^[\p{L}\p{N}][\p{L}\p{N} ._@+'-]*$/u.test(name))
    throw new AccountInputError(
      'ACCOUNT_NAME_INVALID',
      'Use a name or email address, 3–64 characters; letters, numbers, spaces and . _ @ + - are allowed.',
    );
  return name;
}
const kinds = new Set([
  'world',
  'event',
  'memory',
  'decision',
  'action',
  'notification',
  'activity',
]);
export class PrivateStore {
  constructor({ filename, encryptionKey, now = Date.now }) {
    if (!Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32)
      throw Error('Encryption key required');
    this.key = encryptionKey;
    this.now = now;
    this.db = new DatabaseSync(filename);
    if (filename !== ':memory:') chmodSync(filename, 0o600);
    this.db.exec(`PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, login TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(digest TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS records(owner TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, id TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(owner,kind,id));
      CREATE TABLE IF NOT EXISTS connections(owner TEXT NOT NULL REFERENCES users(id), provider TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(owner,provider));
      CREATE TABLE IF NOT EXISTS oauth(digest TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), session TEXT NOT NULL, provider TEXT NOT NULL, value TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS oauth_versions(owner TEXT NOT NULL REFERENCES users(id), provider TEXT NOT NULL, version INTEGER NOT NULL, PRIMARY KEY(owner,provider));`);
  }
  seal(value, aad) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(aad));
    const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
  }
  open(value, aad) {
    const bytes = Buffer.from(value, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.key, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString(),
    );
  }
  createUser(login, password) {
    const name = accountName(login);
    if (typeof password !== 'string' || password.length < 14 || password.length > 128)
      throw new AccountInputError('PASSWORD_INVALID', 'Use a password of 14–128 characters.');
    if (this.db.prepare('SELECT id FROM users WHERE login=?').get(name))
      throw new AccountInputError(
        'ACCOUNT_EXISTS',
        'Account could not be created. Try signing in or choose another name.',
      );
    const id = randomUUID(),
      salt = randomBytes(16).toString('hex');
    this.db
      .prepare('INSERT INTO users VALUES(?,?,?,?)')
      .run(id, name, salt, scryptSync(password, salt, 32).toString('hex'));
    return id;
  }
  login(login, password) {
    if (typeof login !== 'string' || typeof password !== 'string' || password.length > 128)
      return null;
    let name;
    try {
      name = accountName(login);
    } catch {
      return null;
    }
    const user = this.db.prepare('SELECT * FROM users WHERE login=?').get(name);
    const candidate = scryptSync(password, user?.salt || 'dummy-authentication-salt', 32);
    if (!user || !timingSafeEqual(candidate, Buffer.from(user.password, 'hex'))) return null;
    const token = randomBytes(32).toString('base64url');
    this.db
      .prepare('INSERT INTO sessions VALUES(?,?,?)')
      .run(hash(token), user.id, this.now() + 8 * 3600000);
    return token;
  }
  owner(token) {
    this.db.prepare('DELETE FROM sessions WHERE expires<=?').run(this.now());
    if (typeof token !== 'string' || token.length > 128) return null;
    return (
      this.db
        .prepare('SELECT owner FROM sessions WHERE digest=? AND expires>?')
        .get(hash(token), this.now())?.owner || null
    );
  }
  logout(token) {
    this.db.prepare('DELETE FROM oauth WHERE session=?').run(hash(token));
    this.db.prepare('DELETE FROM sessions WHERE digest=?').run(hash(token));
  }
  requireOwner(owner) {
    if (!this.db.prepare('SELECT id FROM users WHERE id=?').get(owner))
      throw Error('Owner required');
  }
  put(owner, kind, id, value) {
    this.requireOwner(owner);
    if (!kinds.has(kind) || typeof id !== 'string' || id.length > 200)
      throw Error('Invalid private record');
    this.db
      .prepare(
        'INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(owner,kind,id) DO UPDATE SET value=excluded.value',
      )
      .run(owner, kind, id, this.seal(value, `${owner}:${kind}:${id}`));
  }
  get(owner, kind, id) {
    const row = this.db
      .prepare('SELECT value FROM records WHERE owner=? AND kind=? AND id=?')
      .get(owner, kind, id);
    return row ? this.open(row.value, `${owner}:${kind}:${id}`) : null;
  }
  list(owner, kind) {
    return this.db
      .prepare('SELECT id,value FROM records WHERE owner=? AND kind=? LIMIT 500')
      .all(owner, kind)
      .map((row) => ({ id: row.id, ...this.open(row.value, `${owner}:${kind}:${row.id}`) }));
  }
  connection(owner, provider) {
    const row = this.db
      .prepare('SELECT value FROM connections WHERE owner=? AND provider=?')
      .get(owner, provider);
    return row ? this.open(row.value, `${owner}:connection:${provider}`) : null;
  }
  connect(owner, provider, value) {
    this.requireOwner(owner);
    if (!['calendar', 'gmail'].includes(provider)) throw Error('Unknown provider');
    this.db
      .prepare(
        'INSERT INTO connections VALUES(?,?,?) ON CONFLICT(owner,provider) DO UPDATE SET value=excluded.value',
      )
      .run(owner, provider, this.seal(value, `${owner}:connection:${provider}`));
  }
  disconnect(owner, provider) {
    this.requireOwner(owner);
    this.db
      .prepare(
        'INSERT INTO oauth_versions VALUES(?,?,1) ON CONFLICT(owner,provider) DO UPDATE SET version=version+1',
      )
      .run(owner, provider);
    this.db.prepare('DELETE FROM oauth WHERE owner=? AND provider=?').run(owner, provider);
    this.db.prepare('DELETE FROM connections WHERE owner=? AND provider=?').run(owner, provider);
  }
  deleteData(owner) {
    this.db.prepare('DELETE FROM records WHERE owner=?').run(owner);
  }
  beginOAuth(token, provider, value) {
    const owner = this.owner(token);
    if (!owner) throw Error('Authentication required');
    if (!['calendar', 'gmail'].includes(provider)) throw Error('Unknown provider');
    this.db.prepare('DELETE FROM oauth WHERE expires<=?').run(this.now());
    const state = randomBytes(32).toString('base64url');
    this.db
      .prepare('INSERT INTO oauth VALUES(?,?,?,?,?,?)')
      .run(
        hash(state),
        owner,
        hash(token),
        provider,
        this.seal(
          { ...value, generation: this.oauthVersion(owner, provider) },
          `${owner}:oauth:${provider}`,
        ),
        this.now() + 600000,
      );
    return state;
  }
  oauthVersion(owner, provider) {
    return (
      this.db
        .prepare('SELECT version FROM oauth_versions WHERE owner=? AND provider=?')
        .get(owner, provider)?.version || 0
    );
  }
  consumeOAuth(token, state, provider) {
    const owner = this.owner(token);
    if (!owner || typeof state !== 'string' || state.length > 128)
      throw Error('Invalid authorization');
    const row = this.db
      .prepare(
        'SELECT * FROM oauth WHERE digest=? AND owner=? AND session=? AND provider=? AND expires>?',
      )
      .get(hash(state), owner, hash(token), provider, this.now());
    if (!row) throw Error('Invalid authorization');
    this.db.prepare('DELETE FROM oauth WHERE digest=?').run(hash(state));
    return { owner, ...this.open(row.value, `${owner}:oauth:${provider}`) };
  }
  close() {
    this.db.close();
  }
}
