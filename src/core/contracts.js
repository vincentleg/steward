import { randomUUID } from 'node:crypto';
export function identifier(value, label = 'ID') {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,180}$/.test(value))
    throw Error(`Invalid ${label}`);
  return value;
}
export function finite(value, label = 'number') {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw Error(`Invalid ${label}`);
  return value;
}
export function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
export const copy = (value) => structuredClone(value);
export const newId = (prefix) => `${prefix}:${randomUUID()}`;
export function safeData(value) {
  if (JSON.stringify(value)?.length > 100000) throw Error('World contribution too large');
  const inspect = (v) => {
    if (!v || typeof v !== 'object') return;
    for (const [key, child] of Object.entries(v)) {
      if (
        [
          '__proto__',
          'prototype',
          'constructor',
          'password',
          'apiKey',
          'api_key',
          'secret',
          'accessToken',
          'credentials',
        ].includes(key)
      )
        throw Error('Secrets and executable policy do not belong in World State');
      inspect(child);
    }
  };
  inspect(value);
  return copy(value);
}
