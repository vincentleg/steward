import { identifier, freeze, copy } from './contracts.js';
export function principal({ id, kind = 'person', name = 'Synthetic principal' }) {
  identifier(id, 'principal');
  if (!['person', 'organization'].includes(kind) || typeof name !== 'string' || name.length > 100)
    throw Error('Invalid principal');
  return freeze({ id, kind, name });
}
export function representationContext({
  id,
  principalId,
  actorId = principalId,
  kind = 'personal',
  role = 'self',
  mandateId,
  resourceIds = [],
  timeZone = 'UTC',
  ephemeral = false,
}) {
  for (const value of [id, principalId, actorId, mandateId]) identifier(value);
  if (
    !['personal', 'professional', 'enterprise'].includes(kind) ||
    typeof role !== 'string' ||
    !role ||
    !Array.isArray(resourceIds)
  )
    throw Error('Invalid representation context');
  new Intl.DateTimeFormat('en', { timeZone }).format();
  resourceIds.forEach((id) => identifier(id, 'resource'));
  if (new Set(resourceIds).size !== resourceIds.length) throw Error('Duplicate resource scope');
  return freeze({
    id,
    principalId,
    actorId,
    kind,
    role,
    mandateId,
    resourceIds: copy(resourceIds),
    timeZone,
    ephemeral: ephemeral === true,
  });
}
export const scopeKey = (context) => `${identifier(context.principalId)}|${identifier(context.id)}`;
export function assertContext(actual, expected) {
  if (
    !actual ||
    ['id', 'principalId', 'actorId', 'kind', 'role', 'mandateId'].some(
      (k) => actual[k] !== expected[k],
    )
  )
    throw Error('Context boundary violation');
}
