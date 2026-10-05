import { identifier, safeData } from './contracts.js';
import { instant } from './time.js';

/** Append-only bounded facts. Sources describe evidence; they never grant execution authority. */
export function recordObservation(world, fact) {
  identifier(fact.id);
  identifier(fact.entity);
  identifier(fact.field);
  if (!Object.hasOwn(fact, 'value')) throw Error('Evidence value required');
  if (!['direct', 'claim', 'inference'].includes(fact.directness)) throw Error('Invalid evidence');
  if (typeof fact.source !== 'string' || fact.source.length > 100) throw Error('Invalid source');
  instant(fact.observedAt);
  if (fact.validFrom) instant(fact.validFrom);
  if (fact.validUntil) instant(fact.validUntil);
  if (fact.validFrom && fact.validUntil && instant(fact.validFrom) >= instant(fact.validUntil))
    throw Error('Invalid evidence interval');
  world.observations ||= [];
  const existing = world.observations.find((f) => f.id === fact.id);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(safeData(fact)))
      throw Error('Conflicting observation retry');
    return existing;
  }
  const value = safeData(fact);
  world.observations.push(value);
  world.observations = world.observations.slice(-200);
  return value;
}

export function currentTruth(observations, entity, field, now = Date.now()) {
  const history = observations.filter((f) => f.entity === entity && f.field === field);
  const usable = history.filter(
    (f) =>
      Date.parse(f.observedAt) <= now &&
      (!f.validFrom || Date.parse(f.validFrom) <= now) &&
      (!f.validUntil || Date.parse(f.validUntil) > now),
  );
  const sources = new Map();
  for (const f of usable.sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt)))
    sources.set(f.source, f);
  const candidates = [...sources.values()],
    direct = candidates.filter((f) => f.directness === 'direct');
  // Only a direct observation at least as recent as every conflicting claim can settle it.
  const newest = direct.sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt))[0];
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const disagreement = candidates.some((f) => !equal(f.value, candidates[0]?.value));
  const settled =
    newest &&
    candidates.every(
      (f) =>
        equal(f.value, newest.value) ||
        Date.parse(newest.observedAt) > Date.parse(f.observedAt) ||
        (f.directness !== 'direct' && Date.parse(newest.observedAt) === Date.parse(f.observedAt)),
    );
  const status = !candidates.length
    ? 'unverified'
    : disagreement && !settled
      ? 'contradicted'
      : newest
        ? 'known'
        : candidates.every((f) => f.directness === 'claim')
          ? 'uncertain'
          : 'likely';
  return {
    entity,
    field,
    status,
    value:
      status === 'contradicted' || !candidates.length ? null : (newest || candidates.at(-1)).value,
    candidates,
    history,
    resolution:
      status === 'contradicted'
        ? 'Additional evidence needed'
        : disagreement
          ? 'Resolved by newer direct observation'
          : newest
            ? 'Direct observation'
            : 'Not independently confirmed',
  };
}

export function operationalWindow(
  {
    start,
    end,
    preparationMinutes = null,
    travelMinutes = null,
    arrivalMinutes = 0,
    setupMinutes = 0,
    recoveryMinutes = 0,
  },
  now = Date.now(),
) {
  const buffers = [preparationMinutes, travelMinutes, arrivalMinutes, setupMinutes];
  if (!Number.isFinite(recoveryMinutes) || recoveryMinutes < 0 || recoveryMinutes > 1440)
    throw Error('Invalid recovery buffer');
  if (buffers.some((n) => n !== null && (!Number.isFinite(n) || n < 0 || n > 1440)))
    throw Error('Invalid buffer');
  if (!start) return { status: 'unknown', known: false };
  const at = instant(start),
    until = end ? instant(end) : at;
  if (until < at) throw Error('Invalid interval');
  const known = buffers.every((n) => n !== null),
    required = known ? at - buffers.reduce((a, b) => a + b, 0) * 60000 : null;
  return {
    known,
    availableAgainAt: end ? new Date(until + recoveryMinutes * 60000).toISOString() : null,
    nominalStart: start,
    operationalStart: required === null ? null : new Date(required).toISOString(),
    status:
      now > until
        ? 'past'
        : now >= at
          ? 'now'
          : required !== null && now > required
            ? 'preparation-at-risk'
            : at - now <= 3600000
              ? 'soon'
              : 'later',
    availableMinutes: required === null ? null : Math.floor((required - now) / 60000),
  };
}

export function verifyExpectedOutcome(
  { id, label, expectedBy, predicates },
  observations,
  now = Date.now(),
) {
  identifier(id);
  if (!Array.isArray(predicates) || !predicates.length || predicates.length > 20)
    throw Error('Bounded predicates required');
  const evidence = predicates.map((p) => {
    identifier(p.entity);
    identifier(p.field);
    if (!Object.hasOwn(p, 'equals') || JSON.stringify(p.equals) === undefined)
      throw Error('Expected value required');
    safeData(p);
    if (p.label !== undefined && (typeof p.label !== 'string' || p.label.length > 300))
      throw Error('Invalid predicate label');
    const truth = currentTruth(observations, p.entity, p.field, now);
    const operator = p.operator || 'equals';
    if (!['equals', 'lte', 'gte'].includes(operator)) throw Error('Unsupported outcome predicate');
    if (operator !== 'equals' && (typeof p.equals !== 'number' || !Number.isFinite(p.equals)))
      throw Error('Numeric predicate required');
    const match =
      operator === 'equals'
        ? JSON.stringify(truth.value) === JSON.stringify(p.equals)
        : typeof truth.value === 'number' &&
          Number.isFinite(truth.value) &&
          (operator === 'lte' ? truth.value <= p.equals : truth.value >= p.equals);
    return {
      label: p.label || `${p.field} confirmed`,
      truth,
      passed: truth.status === 'known' && match,
    };
  });
  const overdue = expectedBy ? now >= instant(expectedBy) : false;
  const passed = evidence.filter((e) => e.passed).length;
  const contradicted = evidence.some((e) => e.truth.status === 'contradicted');
  const mismatch = evidence.some((e) => e.truth.status === 'known' && !e.passed);
  const status = contradicted
    ? 'contradicted'
    : mismatch
      ? 'not-restored'
      : passed === evidence.length
        ? 'restored'
        : passed
          ? 'partially-restored'
          : overdue
            ? 'not-restored'
            : 'unverified';
  return {
    id,
    label,
    status,
    verified: status === 'restored',
    expectedBy,
    overdue,
    evidence,
    next:
      status === 'restored' ? 'resolve' : contradicted || mismatch || overdue ? 'replan' : 'watch',
    waiting: overdue
      ? 'Waiting now delays the intended outcome'
      : expectedBy
        ? 'Waiting is safe until the known confirmation window ends'
        : 'Confirmation timing is unknown; keep watching without claiming success',
  };
}

export function optionalityPlan({ uncertain, deadlinePassed = false, options }) {
  if (!Array.isArray(options) || options.length > 20) throw Error('Bounded options required');
  for (const option of options) {
    identifier(option.id);
    if (!['reversible', 'irreversible', 'unknown'].includes(option.reversibility))
      throw Error('Reversibility must be explicit');
  }
  const viable = options.filter((o) => o.feasible === true);
  const reversible = viable.filter((o) => o.reversibility === 'reversible');
  const choice = uncertain && !deadlinePassed ? reversible[0] : viable[0];
  return {
    recommended: choice?.id || null,
    humanDecisions: !choice || choice.requiresApproval ? 1 : 0,
    reason:
      uncertain && !deadlinePassed
        ? 'Preserve optionality while evidence is incomplete'
        : 'Protect the outcome within the remaining window',
  };
}
