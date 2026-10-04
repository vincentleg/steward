import { identifier, finite, safeData, newId } from './contracts.js';
import { instant } from './time.js';
export const MEMORY_KINDS = Object.freeze([
  'stable-preference',
  'temporary-preference',
  'explicit-rule',
  'inferred-tendency',
  'current-constraint',
  'historical-observation',
  'resolution-history',
  'counterparty-history',
]);
export function memoryEntry({
  id = newId('memory'),
  contextId,
  kind,
  value,
  source,
  confidence = 1,
  explicit = false,
  evidenceIds = [],
  expiresAt,
  at = new Date().toISOString(),
}) {
  identifier(id);
  identifier(contextId);
  instant(at);
  if (!MEMORY_KINDS.includes(kind) || !source?.type || !source?.id || value === undefined)
    throw Error('Memory requires kind, value and provenance');
  identifier(source.id);
  finite(confidence);
  if (confidence < 0 || confidence > 1) throw Error('Invalid memory confidence');
  if (
    ['stable-preference', 'explicit-rule'].includes(kind) &&
    (!explicit || !['human', 'seed'].includes(source.type))
  )
    throw Error('Permanent rules require explicit human or seeded provenance');
  if (['temporary-preference', 'current-constraint'].includes(kind) && !expiresAt)
    throw Error('Temporary memory requires expiry');
  if (expiresAt) instant(expiresAt);
  if (!Array.isArray(evidenceIds)) throw Error('Invalid evidence');
  evidenceIds.forEach(identifier);
  return {
    id,
    contextId,
    kind,
    value: safeData(value),
    source: safeData(source),
    confidence,
    explicit: explicit === true,
    evidenceIds: [...evidenceIds],
    expiresAt,
    at,
  };
}
export function appendMemory(world, entry, limit = 100) {
  const validated = memoryEntry(entry);
  if (validated.contextId !== world.context.id) throw Error('Cross-context memory');
  if (world.memory.some((m) => m.id === validated.id)) return false;
  world.memory.push(validated);
  if (world.memory.length > limit) world.memory.splice(0, world.memory.length - limit);
  return true;
}
export function recall(world, { kind, now = Date.now() } = {}) {
  return structuredClone(
    world.memory.filter(
      (m) => (!kind || m.kind === kind) && (!m.expiresAt || instant(m.expiresAt) > now),
    ),
  );
}
