/** Observable orchestration state. Never private model reasoning. */
export function intelligenceState(world, decisions = [], now = Date.now()) {
  const active = world?.resolutions?.findLast(
    (r) => !['outcome.restored', 'stopped'].includes(r.state),
  );
  const last = active || world?.resolutions?.at(-1);
  const states = {
    'deviation.detected': 'deviation',
    'impact.understood': 'modeling',
    'futures.simulated': 'simulating',
    'authority.checked': 'evaluating',
    'decision.pending': 'needs-you',
    'needs.information': 'needs-you',
    'approval.received': 'acting',
    'action.authorized': 'acting',
    'action.executing': 'acting',
    'action.completed': 'acting',
    'provider.contacted': 'acting',
    'provider.responded': 'evaluating',
    'counteroffer.received': 'evaluating',
    'offer.evaluated': 'evaluating',
    negotiating: 'acting',
    'refund.confirmed': 'verifying',
    'outcome.verifying': 'verifying',
    'outcome.restored': 'resolved',
    'verification.failed': 'replanning',
    'provider.pending': 'watching',
    'outcome.watching': 'watching',
    'outcome.replanning': 'replanning',
    'contradiction.detected': 'contradicted',
    'outcome.observed': 'verifying',
    'action.failed': 'needs-you',
    observing: 'observing',
    stopped: 'observing',
  };
  const needsYou = decisions.some((d) => d.status === 'needs-you');
  let state = needsYou
    ? 'needs-you'
    : last
      ? states[last.state] || 'observing'
      : world?.calendarAnalysis?.changedEvents
        ? 'signal'
        : 'stable';
  const eventTime = Date.parse(world?.events?.at(-1)?.at);
  if (state === 'resolved' && Number.isFinite(eventTime) && now - eventTime > 8000)
    state = 'stable';
  return {
    state,
    consequences:
      state === 'stable'
        ? 0
        : last?.impact?.affectedCount || world?.calendarAnalysis?.consequences || 0,
    futures: state === 'stable' ? 0 : last?.futures?.length || 0,
    decisions: state === 'needs-you' ? 1 : 0,
    uncertainty:
      last?.verification && !last.verification.verified
        ? 1
        : last?.evaluation?.requiresJudgment
          ? 1
          : 0,
    temporalPressure: ['stable', 'resolved'].includes(state)
      ? 0
      : last?.verification?.overdue
        ? 1
        : last?.pendingRefund
          ? Math.max(
              0,
              Math.min(
                1,
                1 -
                  (Date.parse(last.pendingRefund.expectedBy) -
                    (now + (world.clockOffsetMinutes || 0) * 60000)) /
                    1200000,
              ),
            )
          : 0,
    contradiction: last?.verification?.status === 'contradicted',
    signalId: world?.events?.at(-1)?.id || world?.calendarAssessments?.at(-1)?.observedAt || null,
  };
}
