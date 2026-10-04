import { finite, identifier, safeData } from './contracts.js';
export const VALUE_DIMENSIONS = Object.freeze([
  'money',
  'time',
  'flexibility',
  'risk',
  'futureValue',
  'opportunityCost',
  'commitments',
  'preferences',
  'reversibility',
  'rights',
]);
export function valueEstimate({ nominal, probability = 1, confidence = 1, assumptions = [] }) {
  finite(nominal);
  finite(probability);
  finite(confidence);
  if (nominal < 0 || probability < 0 || probability > 1 || confidence < 0 || confidence > 1)
    throw Error('Invalid value evidence');
  return {
    nominal,
    worth: Math.round(nominal * probability),
    confidence,
    assumptions: safeData(assumptions),
  };
}
export function simulateFutures(world, options) {
  if (!Array.isArray(options) || !options.length || options.length > 20)
    throw Error('Bounded alternatives required');
  const ids = new Set();
  return options.map((option) => {
    identifier(option.id);
    if (ids.has(option.id)) throw Error('Duplicate future');
    ids.add(option.id);
    const confidence = option.confidence ?? 0;
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1)
      throw Error('Invalid future confidence');
    if (!['reversible', 'irreversible', 'unknown'].includes(option.reversibility ?? 'unknown'))
      throw Error('Invalid reversibility');
    if (option.constraints !== undefined && !Array.isArray(option.constraints))
      throw Error('Invalid constraints');
    const costs = option.costs ?? {},
      benefits = option.benefits ?? {};
    for (const metric of [costs, benefits])
      for (const [key, value] of Object.entries(metric)) {
        if (!VALUE_DIMENSIONS.includes(key) || finite(value) < 0)
          throw Error('Invalid personal-value dimension');
      }
    return {
      id: option.id,
      contextId: world?.context?.id,
      intended: safeData(world?.intendedState ?? {}),
      projected: safeData(option.projected ?? {}),
      constraints: safeData(option.constraints ?? []),
      costs: { ...costs },
      benefits: { ...benefits },
      confidence,
      reversibility: option.reversibility ?? 'unknown',
      assumptions: safeData(option.assumptions ?? []),
    };
  });
}
export function rankFutures(
  futures,
  { weights = { money: 1, futureValue: 1 }, tieTolerance = 1, minimumConfidence = 0.8 } = {},
) {
  for (const [key, value] of Object.entries(weights))
    if (!VALUE_DIMENSIONS.includes(key) || finite(value) < 0) throw Error('Invalid value weights');
  finite(tieTolerance);
  finite(minimumConfidence);
  if (tieTolerance < 0 || minimumConfidence < 0 || minimumConfidence > 1)
    throw Error('Invalid evaluation policy');
  const ranked = futures
    .map((f) => ({
      ...f,
      feasible: f.constraints.every((c) => c.passed === true),
      needsEvidence:
        f.confidence < minimumConfidence ||
        f.constraints.some((c) => typeof c.passed !== 'boolean'),
      score: Object.entries(weights).reduce(
        (sum, [key, weight]) => sum + weight * ((f.costs[key] ?? 0) - (f.benefits[key] ?? 0)),
        0,
      ),
    }))
    .sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
  const eligible = ranked.filter((f) => f.feasible && !f.needsEvidence);
  let recommended = eligible[0];
  if (recommended)
    recommended = eligible
      .filter((f) => f.score - recommended.score <= tieTolerance)
      .sort(
        (a, b) =>
          (b.reversibility === 'reversible') - (a.reversibility === 'reversible') ||
          a.score - b.score ||
          a.id.localeCompare(b.id),
      )[0];
  return {
    ranked,
    recommended: recommended?.id ?? null,
    requiresJudgment: !recommended,
    dimensions: { ...weights },
  };
}
export function compressDecision({ impacts, futures, actions = [] }) {
  const safe = actions.filter((a) => a.allowed === true && a.requiresApproval === false);
  const blocked = actions.filter((a) => a.allowed !== true || a.requiresApproval !== false);
  return {
    consequenceCount: impacts.nodes.length,
    futureCount: futures.length,
    humanDecisions: blocked.length ? 1 : 0,
    automaticActions: safe.map((a) => a.id),
    judgment: blocked.map((a) => ({ id: a.id, reason: a.reason || 'Human mandate required' })),
  };
}
