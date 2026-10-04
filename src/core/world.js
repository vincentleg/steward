/** Domain-independent representation of the outcome, rather than a conversation history. */
export function personalWorld({ goals, commitments, resources, preferences, constraints }) {
  return {
    goals,
    commitments,
    resources,
    preferences,
    constraints,
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
    passed: check(run) === true,
  }));
  return {
    verified: evidence.length > 0 && evidence.every((e) => e.passed),
    evidence,
    at: new Date().toISOString(),
  };
}
