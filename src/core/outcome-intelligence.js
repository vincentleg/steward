/** Bounded, deterministic reasoning over facts and explicit preferences. No tools or authority. */
export function commitmentModel(item, annotation = {}) {
  const known = (key) =>
    (annotation[key] ?? item[key]) === 'unknown' ? null : (annotation[key] ?? item[key] ?? null);
  return {
    id: item.id,
    label: item.title || item.label || 'Commitment',
    facts: {
      start: item.start ?? null,
      end: item.end ?? null,
      hour: item.hour ?? null,
      location: item.location ?? null,
      status: item.status || 'scheduled',
      provenance: item.source || 'Synthetic world',
      confidence: item.confidence ?? null,
      peopleAffected: item.peopleAffected ?? null,
    },
    preferences: {
      importance: known('importance'),
      flexibility: known('flexibility'),
      preparationMinutes: known('preparationMinutes'),
      travelMinutes: known('travelMinutes'),
      goalIds: known('goalIds'),
      relationshipRelevance: known('relationshipRelevance'),
    },
    dependencies: item.dependencies || [],
    deadline: item.deadline ?? null,
    financialExposure: item.financialExposure ?? null,
    opportunityValue: item.opportunityValue ?? null,
    reversibility: item.reversibility || 'unknown',
    uncertainty: ['importance', 'preparationMinutes', 'travelMinutes'].filter(
      (k) => known(k) === null,
    ),
    preferenceSource: Object.keys(annotation).length
      ? 'Explicit user rule'
      : item.preferenceSource || 'Unknown',
  };
}

export function temporalConsequences(commitments, annotations = {}, now = Date.now()) {
  const timed = commitments
    .filter(
      (c) =>
        c.start?.includes('T') &&
        c.end?.includes('T') &&
        Date.parse(c.end) > now &&
        c.status !== 'cancelled',
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const results = [];
  for (let i = 0; i < timed.length; i++) {
    const a = timed[i];
    for (let j = i + 1; j < timed.length; j++) {
      const b = timed[j],
        q = commitmentModel(b, annotations[b.id]).preferences;
      const gap = (Date.parse(b.start) - Date.parse(a.end)) / 60000;
      if (gap < 0)
        results.push({
          from: a.id,
          to: b.id,
          relation: 'CONFLICTS WITH',
          kind: 'fact',
          confidence: 1,
          label: 'Commitments overlap',
          minutes: Math.min(-gap, (Date.parse(b.end) - Date.parse(b.start)) / 60000),
        });
      else if (
        j === i + 1 &&
        q.preparationMinutes !== null &&
        q.travelMinutes !== null &&
        gap < q.preparationMinutes + q.travelMinutes
      )
        results.push({
          from: a.id,
          to: b.id,
          relation: 'THREATENS',
          kind: 'inference',
          confidence: 1,
          label: 'Preparation and travel buffer do not fit',
          minutes: q.preparationMinutes + q.travelMinutes - gap,
          basis: 'Observed times and explicit buffer requirements',
        });
      // An unknown priority never becomes permission to sacrifice a commitment.
      if (results.length >= 100) return results;
    }
  }
  return results;
}

export function temporalFutures(consequence, commitments, annotations = {}) {
  const a = commitmentModel(
    commitments.find((c) => c.id === consequence.from),
    annotations[consequence.from],
  );
  const b = commitmentModel(
    commitments.find((c) => c.id === consequence.to),
    annotations[consequence.to],
  );
  const fixed = (c) =>
    c.preferences.importance === 'must-protect' || c.preferences.importance === 1;
  const flexible = (c) => c.preferences.importance === 'optional' || c.preferences.importance === 0;
  const recommendation =
    fixed(a) && flexible(b) ? 'protect-first' : fixed(b) && flexible(a) ? 'protect-next' : null;
  return {
    affected: [a.id, b.id],
    kind: consequence.kind,
    evidence: consequence.label,
    futures: [
      {
        id: 'protect-first',
        label: `Protect ${a.label}`,
        preserves: [a.id],
        requires: 'Confirm flexibility of the next commitment',
      },
      {
        id: 'protect-next',
        label: `Protect ${b.label}`,
        preserves: [b.id],
        requires: 'Confirm flexibility of the earlier commitment',
      },
    ],
    recommended: recommendation,
    humanDecisions: recommendation ? 0 : 1,
    disposition: recommendation
      ? 'Prepared internally; no Calendar changes'
      : 'Your relative priorities are needed',
    verified: false,
    externalActions: 0,
  };
}

export function meaningfulChange(expected, observed, consequences = []) {
  const fields = ['start', 'end', 'hour', 'status', 'location', 'deadline', 'cost'];
  const changed = fields.filter(
    (k) => JSON.stringify(expected?.[k]) !== JSON.stringify(observed?.[k]),
  );
  return {
    changed: changed.length > 0,
    meaningful:
      changed.length > 0 &&
      (consequences.length > 0 ||
        observed?.status === 'cancelled' ||
        changed.some((k) => ['deadline', 'cost'].includes(k))),
    fields: changed,
    disposition: consequences.length
      ? 'analyze'
      : observed?.status === 'cancelled'
        ? 'analyze'
        : 'watch',
    humanDecisions: 0,
  }; // Observation alone never requires authority.
}

export function graphConsequences(graph) {
  const depth = new Map([[graph.sourceId, 0]]),
    queue = [graph.sourceId];
  while (queue.length) {
    const from = queue.shift();
    for (const e of graph.edges.filter((e) => e.from === from))
      if (!depth.has(e.to)) {
        depth.set(e.to, depth.get(from) + 1);
        queue.push(e.to);
      }
  }
  return graph.nodes.map((n) => ({
    id: n.id,
    label: n.label || n.id,
    kind: 'inference',
    direct: depth.get(n.id) === 1,
    depth: depth.get(n.id),
    relation: graph.edges.find((e) => e.to === n.id)?.relation || 'AFFECTS',
    confidence: n.confidence ?? null,
    provenance: 'Explicit World State dependency',
    conclusion: `${n.label || n.id} may be affected; a dependency is not proof of loss.`,
  }));
}

export function worthToYou(selected, alternatives, { preserveMiles = false } = {}) {
  if (!selected)
    return {
      headline: 'More evidence is needed before choosing a future.',
      tradeoffs: [],
      uncertainty: true,
    };
  const tradeoffs = [];
  for (const other of alternatives.filter((o) => o.id !== selected.id)) {
    const money = (selected.costs.money || 0) - (other.costs.money || 0);
    const preserved =
      selected.projected?.meetingPreserved && other.projected?.meetingPreserved === false;
    if (preserved && money > 0)
      tradeoffs.push({
        protects: 'The commitment',
        givesUp: `$${money} additional cost`,
        basis: 'Your explicit commitment priority',
      });
    if (preserveMiles && (other.costs.futureValue || 0) > (selected.costs.futureValue || 0))
      tradeoffs.push({
        protects: 'Future resource value',
        givesUp: money > 0 ? `$${money} additional cost` : 'The alternative use of resources',
        basis: 'Your explicit resource preference',
      });
    if ((selected.benefits.money || 0) > (other.benefits.money || 0))
      tradeoffs.push({
        protects: 'Recoverable money',
        givesUp: 'Keeping the current arrangement',
        basis: 'Available refund or benefit evidence',
      });
    if ((selected.benefits.commitments || 0) > (other.benefits.commitments || 0) && !preserved)
      tradeoffs.push({
        protects: 'The intended commitment',
        givesUp: money > 0 ? `$${money} additional cost` : 'Leaving dependent plans unchanged',
        basis: 'The capability’s explicit outcome and feasibility evidence',
      });
    if ((selected.costs.risk || 0) < (other.costs.risk || 0))
      tradeoffs.push({
        protects: 'Outcome reliability',
        givesUp: 'Waiting for an uncertain recovery',
        basis: 'Documented risk in the alternative',
      });
    if ((selected.benefits.preferences || 0) > (other.benefits.preferences || 0))
      tradeoffs.push({
        protects: 'Your stated preference',
        givesUp: 'The alternative arrangement',
        basis: 'Your explicit current rules',
      });
    if ((selected.benefits.opportunityCost || 0) > (other.benefits.opportunityCost || 0))
      tradeoffs.push({
        protects: 'Goal-aligned opportunity',
        givesUp: 'The original plan',
        basis: 'Your current priorities',
      });
  }
  return {
    headline: tradeoffs.length
      ? `${tradeoffs[0].protects} over ${tradeoffs[0].givesUp.toLowerCase()}.`
      : 'Protect the intended outcome with the least unnecessary disruption.',
    tradeoffs: tradeoffs.slice(0, 3),
    uncertainty: false,
    dimensions: Object.keys({ ...selected.costs, ...selected.benefits }),
    reversibility: selected.reversibility,
    evidence: selected.evidence,
    score: null,
  };
}
