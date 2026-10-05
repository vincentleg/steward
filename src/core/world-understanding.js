import { commitmentModel, temporalConsequences, temporalFutures } from './outcome-intelligence.js';
/** Read-only, domain-independent operational projection. Never grants authority. */
export function understandWorld(world, { now = Date.now() } = {}) {
  if (!world) return null;
  const connected = world.mode === 'connected';
  const commitments = (world.commitments || [])
    .filter((c) => {
      if (['cancelled', 'completed'].includes(c.status)) return false;
      if (!c.start) return !connected;
      const end = Date.parse(c.end || c.start);
      return Number.isFinite(end) && end >= now;
    })
    .map((c) => ({
      id: c.id,
      label: c.title || c.label || 'Commitment',
      start: c.start || null,
      end: c.end || null,
      hour: c.hour ?? null,
      status: c.status || 'scheduled',
      importance: world.commitmentAnnotations?.[c.id]?.importance ?? c.importance ?? 'unknown',
      provenance: c.source || (connected ? 'Google Calendar' : 'Synthetic world'),
      confidence: c.confidence ?? (connected ? 1 : 1),
    }))
    .sort((a, b) => (Date.parse(a.start) || Infinity) - (Date.parse(b.start) || Infinity));
  const dependencies = (world.dependencies || [])
    .filter((e) => Array.isArray(e) && e.length === 2)
    .map(([from, to]) => ({ from, to }));
  const unknowns = [];
  if (connected && commitments.some((c) => c.importance === 'unknown'))
    unknowns.push(
      'Commitment importance is unknown; Calendar presence does not establish priority.',
    );
  if (
    connected &&
    commitments.length > 1 &&
    commitments.some(
      (c) =>
        world.commitmentAnnotations?.[c.id]?.travelMinutes == null ||
        world.commitmentAnnotations?.[c.id]?.preparationMinutes == null,
    )
  )
    unknowns.push('Travel and preparation time are not established; feasibility is not assumed.');
  const risks = (world.activeDeviations || []).map((d) => ({
    id: d.id,
    label: d.label || d.title || d.type || 'Outcome at risk',
    status: d.status || 'detected',
  }));
  const deadlines = Object.entries(world.deadlines || {})
    .filter(([, at]) => {
      const t = Date.parse(at);
      return Number.isFinite(t) && t >= now;
    })
    .map(([id, at]) => ({ id, at }))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const temporal = temporalConsequences(
    world.commitments || [],
    world.commitmentAnnotations || {},
    now,
  );
  return {
    mode: connected ? 'connected' : 'synthetic',
    commitments,
    models: commitments.map((c) =>
      commitmentModel(
        { ...(world.commitments || []).find((item) => item.id === c.id), source: c.provenance },
        world.commitmentAnnotations?.[c.id],
      ),
    ),
    temporalConsequences: temporal,
    planning: temporal
      .slice(0, 8)
      .map((c) => temporalFutures(c, world.commitments, world.commitmentAnnotations)),
    next: commitments.slice(0, 6),
    dependencies,
    risks,
    deadlines,
    goals: (world.goals || []).map((g) => ({ id: g.id, label: g.label || g.title || 'Goal' })),
    unknowns,
    protections: connected
      ? ['Observation only', 'No external actions']
      : [
          `Spending ceiling: $${world.settings?.maxSpend ?? 0}`,
          world.settings?.preserveMiles ? 'Preserve future miles' : 'Miles may be considered',
          `Authority: ${world.settings?.autonomy || 'ask'}`,
        ],
    verifiedOutcomes: (world.outcomeHistory || []).length,
  };
}
