/** Read-only, bounded evidence projection. No tools, credentials, provider or mutation access. */
export function conversationContext(
  world,
  { resolutionId = null, activity = [], decisions = [], actions = [], now = Date.now() } = {},
) {
  const facts = [];
  const add = (id, label, evidence, status = 'observed', source = 'Steward state') => {
    if (typeof evidence !== 'string' || !evidence) return;
    facts.push({
      id: String(id).slice(0, 200),
      label: String(label).slice(0, 180),
      evidence: evidence.slice(0, 1600),
      status,
      source,
    });
  };
  const synthetic = world?.mode !== 'connected';
  add(
    'scope',
    'What I can access',
    synthetic
      ? 'This is an isolated synthetic world. All actions and people here are synthetic. No personal accounts or external actions.'
      : 'This private world belongs to your authenticated account. Calendar is read-only. Gmail is disabled. No external messages or Calendar writes.',
    'known',
  );
  for (const goal of (world?.goals || []).slice(0, 8))
    add(
      'goal:' + goal.id,
      'Outcome to protect',
      goal.label || goal.title || 'Goal without a label',
      'explicit goal',
    );
  if (world?.settings)
    add(
      'rules',
      'Budget, priorities and authority',
      `Incremental spending limit: ${world.settings.maxSpend}; spending authority: ${world.settings.spendingAuthority}; autonomy: ${world.settings.autonomy}; preserve miles: ${world.settings.preserveMiles}; risk tolerance: ${world.settings.riskTolerance}.`,
      'explicit synthetic rules',
    );
  for (const item of (world?.memory || []).slice(-5))
    add(
      'memory:' + (item.id || item.at),
      'Operational memory',
      JSON.stringify({
        category: item.category || item.kind,
        value: item.value,
        source: item.source,
      }),
      'recorded memory',
    );
  const resolutions = (world?.resolutions || []).slice(-8);
  add(
    'attention',
    'Current attention',
    `${resolutions.filter((r) => ['decision.pending', 'needs.information'].includes(r.state)).length + decisions.filter((d) => d.status === 'needs-you').length} decisions need you. ${resolutions.filter((r) => !['outcome.restored', 'stopped'].includes(r.state)).length} synthetic resolutions remain open.`,
    'observed',
  );
  for (const r of resolutions) {
    add(
      'resolution:' + r.id,
      r.title,
      `${r.goal}. Current state: ${r.state}. ${r.humanDecisions || 0} human decisions.`,
      'observed',
    );
    if (r.worth)
      add(
        'worth:' + r.id,
        'Worth to you',
        [
          r.worth.headline,
          ...(r.worth.tradeoffs || []).map(
            (t) => `${t.protects}; tradeoff: ${t.givesUp}; basis: ${t.basis}`,
          ),
        ].join('. '),
        'decision evidence',
      );
    for (const o of r.options || [])
      add(
        'option:' + r.id + ':' + o.id,
        o.title,
        `${o.id === r.recommended ? 'Recommended' : 'Alternative'}; ${(o.evidence || []).join('; ')}; incremental cost: ${o.costs?.money ?? 'unknown'}; reversibility: ${o.reversibility || 'unknown'}.`,
        'simulated',
      );
    if (r.monitor)
      add(
        'monitor:' + r.id,
        'What I am waiting for',
        `${r.monitor.reason}. ${r.monitor.worthToYou || ''}. Expected by: ${r.verification?.expectedBy || 'unknown'}.`,
        'expected',
      );
    if (r.verification)
      add(
        'verification:' + r.id,
        'Did the outcome happen?',
        `Verification: ${r.verification.status}. ${(r.verification.evidence || []).map((e) => `${e.label || e.predicate?.label || 'Condition'}: ${e.truth?.status || e.status || 'unknown'}`).join('; ')}. ${r.verification.verified ? 'All bounded outcome conditions were confirmed.' : 'Do not claim restored: confirmation is incomplete or contradicted.'}`,
        r.verification.verified ? 'verified' : 'unverified',
      );
  }
  for (const f of (world?.observations || []).filter((f) => f.directness !== 'direct').slice(-8))
    add(
      'claim:' + f.id,
      'Evidence that is not yet confirmed',
      `${f.field}: ${JSON.stringify(f.value)}; observed: ${f.observedAt}; source: ${f.source}. This is not authority or proof of action.`,
      f.directness || 'uncertain',
      f.source,
    );
  for (const c of (world?.commitments || []).slice(0, 30))
    add(
      'commitment:' + c.id,
      c.label || c.title || 'Commitment',
      `Status: ${c.status || 'unknown'}; starts: ${c.start || c.startsAt || (c.hour === undefined ? 'unknown' : c.hour + ' (synthetic hour)')}; preparation: ${c.preparationMinutes ?? 'unknown'} minutes; travel: ${c.travelMinutes ?? 'unknown'} minutes; importance: ${c.importance ?? 'unknown'}.`,
      'observed',
      c.provenance?.source ||
        c.source ||
        (synthetic ? 'Synthetic seed' : 'Private Calendar projection'),
    );
  for (const e of (world?.events || []).slice(-20))
    add(
      'activity:' + e.id,
      e.label || e.type,
      `${e.label || e.type}; observed at: ${e.at || 'unknown'}.`,
      synthetic ? 'synthetic activity' : 'observed',
    );
  for (const e of activity.slice(-15))
    add(
      'activity:' + e.id,
      e.type || e.label || 'Activity',
      `${e.label || e.summary || e.type || 'Recorded activity'}; observed: ${e.at || e.createdAt || 'unknown'}.`,
      'observed',
    );
  for (const d of decisions.slice(-10))
    add(
      'decision:' + d.id,
      d.title || 'Decision',
      `${d.summary || d.reason || ''}; status: ${d.status}.`,
      'recorded decision',
    );
  for (const a of actions.slice(-10))
    add(
      'action:' + a.id,
      a.type || 'Internal action',
      `${a.title || ''}; status: ${a.status}; verification: ${a.verification}; scope: ${a.scope || 'unknown'}.`,
      a.verification === 'verified' ? 'verified' : 'unverified',
    );
  for (const t of (world?.temporalChanges || []).slice(-6))
    add(
      'change:' + (t.id || t.observedAt),
      'Expected versus observed',
      JSON.stringify({
        expected: t.expected,
        observed: t.observed,
        source: t.source,
        observedAt: t.observedAt,
        conclusion: t.conclusion,
      }),
      'observed',
    );
  add(
    'limits',
    'What I do not know',
    'Unknown importance, missing confirmations and unverified outcomes stay unknown. A provider claim is not proof. I have no evidence about parts of your life absent from this world. Conversation cannot authorize or execute actions.',
    'known',
  );
  return {
    mode: synthetic ? 'synthetic' : 'connected',
    capturedAt: new Date(now).toISOString(),
    focus: facts.some((f) => f.id === 'resolution:' + resolutionId)
      ? 'resolution:' + resolutionId
      : null,
    facts: facts.slice(0, 110),
    capability: 'evidence-only',
    languageModel: 'not-configured',
    externalProcessing: false,
  };
}
