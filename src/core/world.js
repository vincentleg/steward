/** Domain-independent representation of the outcome, rather than a conversation history. */
export function personalWorld({
  goals = [],
  commitments = [],
  resources = [],
  preferences = [],
  constraints = [],
  identity = null,
  context = null,
} = {}) {
  return {
    identity,
    context,
    goals,
    commitments,
    resources,
    preferences,
    constraints,
    people: [],
    time: [],
    money: [],
    travel: [],
    purchases: [],
    benefits: [],
    rights: [],
    risks: [],
    intendedState: { goals: structuredClone(goals), constraints: structuredClone(constraints) },
    observedState: {},
    activeDeviations: [],
    activeResolutions: [],
    outcomeHistory: [],
    counterparties: [],
    authority: { mandateId: context?.mandateId || null },
    memory: [],
    observation: 'stable',
  };
}
export function deviation(event, world) {
  return {
    event: event.type,
    affects: world.commitments.map((c) => c.id),
    goalIds: world.goals.map((g) => g.id),
    status: 'detected',
  };
}
/** Verification predicates inspect resource state. Event completion alone is insufficient. */
export function verifyOutcome(run, predicates) {
  const evidence = predicates.map(({ id, label, check }) => ({
    id,
    label,
    passed: (() => {
      try {
        return check(run) === true;
      } catch {
        return false;
      }
    })(),
  }));
  return {
    verified:
      evidence.length > 0 &&
      new Set(evidence.map((e) => e.id)).size === evidence.length &&
      evidence.every((e) => typeof e.id === 'string' && e.id.length > 0 && e.passed),
    evidence,
    at: new Date().toISOString(),
  };
}
