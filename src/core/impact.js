import { identifier, safeData } from './contracts.js';
export const IMPACT_RELATIONS = Object.freeze([
  'DEPENDS ON',
  'CONFLICTS WITH',
  'ENABLES',
  'BLOCKS',
  'PROTECTS',
  'THREATENS',
  'REQUIRES',
  'AFFECTS',
  'PRECEDES',
  'FOLLOWS',
  'COSTS',
  'SAVES',
  'INVOLVES',
  'SERVES GOAL',
  'VIOLATES CONSTRAINT',
]);
/** Explicit dependency graph; a capability supplies facts, not executable instructions. */
export function impactGraph({ contextId, sourceId, nodes, edges }) {
  identifier(contextId);
  identifier(sourceId);
  if (nodes.length > 100 || edges.length > 300) throw Error('Impact graph too large');
  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length || !ids.has(sourceId)) throw Error('Invalid graph');
  for (const n of nodes) {
    identifier(n.id);
    if (n.contextId !== contextId) throw Error('Cross-context impact');
  }
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) throw Error('Unknown dependency');
    if (e.relation && !IMPACT_RELATIONS.includes(e.relation)) throw Error('Invalid relationship');
  }
  const visited = new Set([sourceId]);
  const queue = [sourceId];
  while (queue.length) {
    const id = queue.shift();
    for (const e of edges.filter((e) => e.from === id))
      if (!visited.has(e.to)) {
        visited.add(e.to);
        queue.push(e.to);
      }
  }
  return {
    contextId,
    sourceId,
    nodes: safeData(nodes.filter((n) => visited.has(n.id) && n.id !== sourceId)),
    edges: safeData(edges.filter((e) => visited.has(e.from) && visited.has(e.to))),
  };
}
export function detectDeviation({ id, contextId, intended, observed, evidenceIds = [] }) {
  identifier(id);
  identifier(contextId);
  const mismatches = Object.entries(intended)
    .filter(([key, value]) => JSON.stringify(observed[key]) !== JSON.stringify(value))
    .map(([key]) => key);
  return {
    id,
    contextId,
    intended: safeData(intended),
    observed: safeData(observed),
    affects: mismatches,
    evidenceIds: safeData(evidenceIds),
    status: mismatches.length ? 'detected' : 'stable',
  };
}
