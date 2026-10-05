import { randomUUID } from 'node:crypto';
import { principal, representationContext } from './identity.js';
import { personalWorld } from './world.js';
import { impactGraph, detectDeviation } from './impact.js';
import { simulateFutures, rankFutures, compressDecision } from './intelligence.js';
import { appendMemory } from './memory.js';
import { CONSTITUTION } from './constitution.js';
import { recordObservation, verifyExpectedOutcome, optionalityPlan } from './temporal-truth.js';
import { graphConsequences, worthToYou, meaningfulChange } from './outcome-intelligence.js';
import { SCENARIOS, capabilityPlan } from '../capabilities/life-library.js';
const MODES = ['observe', 'ask', 'rules'];
const ALLOWED = [
  'rebook',
  'update_commitment',
  'send_message',
  'request_refund',
  'reschedule',
  'reserve',
  'cancel',
  'verify',
  'replace',
  'accept_offer',
  'decline_offer',
  'activate_backup',
  'prepare',
  'submit_form',
];
const clock = (hour) => {
  const h = Math.floor(hour),
    minutes = Math.round((hour - h) * 60);
  return `${h % 12 || 12}${minutes ? ':' + String(minutes).padStart(2, '0') : ''} ${h >= 12 ? 'PM' : 'AM'}`;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export function seedLife(id = randomUUID()) {
  const identity = principal({ id: `person:${id}`, name: 'Alex · synthetic' });
  const context = representationContext({
    id: `personal:${id}`,
    principalId: identity.id,
    mandateId: `mandate:${id}`,
    resourceIds: ['cash', 'miles', 'hotspot'],
    timeZone: 'America/Los_Angeles',
    ephemeral: true,
  });
  const world = personalWorld({
    identity,
    context,
    goals: [
      { id: 'arrival', label: 'Protect commitments and flexible value' },
      { id: 'strategic-goal', label: 'Meet relevant founders without sacrificing commitments' },
    ],
    commitments: [
      {
        id: 'morning',
        label: 'Sarah · tomorrow',
        hour: 9,
        importance: 1,
        status: 'planned',
        preparationMinutes: 0,
        travelMinutes: 60,
        preferenceSource: 'Seeded synthetic preference',
      },
      { id: 'event-a', label: 'AI infrastructure · 6 PM', status: 'confirmed' },
      { id: 'founder', label: 'Founder event · 6:30 PM', status: 'waitlisted' },
      { id: 'event-c', label: 'Investor event · 8 PM', status: 'confirmed' },
      { id: 'work-meeting', label: 'Work meeting', status: '2 PM' },
      { id: 'preparation', label: 'Preparation', status: '1 PM' },
      { id: 'next-meeting', label: 'Next commitment', status: '4:30 PM' },
      { id: 'dinner', label: 'Dinner with a friend', status: '7 PM' },
    ],
  });
  return {
    ...world,
    id,
    revision: 0,
    commitmentAnnotations: {},
    observations: [],
    clockOffsetMinutes: 0,
    processedObservations: [],
    createdAt: new Date().toISOString(),
    deadlines: {
      benefit: new Date(Date.now() + 86400000).toISOString(),
      renewal: new Date(Date.now() + 172800000).toISOString(),
      call: new Date(Date.now() + 2700000).toISOString(),
    },
    resources: { cash: 5000, miles: 31000, hotspot: true, benefit: 300 },
    settings: {
      autonomy: 'ask',
      maxSpend: 250,
      spendingAuthority: 100,
      timeValue: 'medium',
      riskTolerance: 'balanced',
      calendarPriority: 'professional',
      preserveMiles: true,
      deliveryUrgent: true,
      subscriptionUsage: 'low',
      airlineUseProbability: 0.3,
      confirmationMode: 'immediate',
    },
    travel: { flight: 'SFO → JFK', status: 'scheduled', arrival: 'Tonight', hotel: 'confirmed' },
    money: { charges: [], refunds: [], credits: [] },
    purchases: { order: 'in transit' },
    subscriptions: { subscription: 'renewed' },
    benefits: { benefit: 'expires in 24 hours' },
    home: { internet: 'online', backup: null },
    admin: { renewal: 'pending', form: 'missing', document: 'missing' },
    people: [{ id: 'sarah', label: 'Sarah', communication: 'not prepared' }],
    work: {},
    opportunities: { invitation: 'pending' },
    rights: [{ id: 'refund-rights', label: 'Synthetic refund eligibility' }],
    dependencies: [
      ['flight', 'morning'],
      ['morning', 'sarah'],
      ['flight', 'cash'],
      ['flight', 'miles'],
      ['flight', 'refund-rights'],
      ['event-a', 'founder'],
      ['founder', 'event-c'],
      ['founder', 'strategic-goal'],
      ['founder', 'cash'],
      ['founder', 'sarah'],
      ['subscription', 'cash'],
      ['subscription', 'refund-rights'],
      ['order', 'cash'],
      ['order', 'delivery-deadline'],
      ['benefit', 'cash'],
      ['benefit', 'future-trip'],
      ['work-meeting', 'preparation'],
      ['work-meeting', 'next-meeting'],
      ['work-meeting', 'deadline'],
      ['work-meeting', 'sarah'],
      ['internet', 'call'],
      ['internet', 'hotspot'],
      ['internet', 'cash'],
      ['renewal', 'document'],
      ['renewal', 'form'],
      ['renewal', 'cash'],
      ['dinner', 'sarah'],
      ['dinner', 'next-meeting'],
      ['dinner', 'transport'],
      ['invitation', 'strategic-goal'],
      ['invitation', 'cash'],
      ['invitation', 'calendar'],
    ],
    ledger: [],
    resolutions: [],
    events: [],
    memory: [],
    prepared: [],
    watching: [
      'Time',
      'Money',
      'Travel',
      'People',
      'Work',
      'Opportunities',
      'Purchases',
      'Benefits',
      'Home',
      'Administration',
      'Transport',
      'Communications',
      'Resources',
      'Goals',
      'Constraints',
      'Rights',
    ],
    constitution: structuredClone(CONSTITUTION),
  };
}
export class LifeEngine {
  constructor({ pace = 350, now = () => Date.now() } = {}) {
    this.pace = pace;
    this.now = now;
    this.worlds = new Map();
    this.busy = new Set();
  }
  create() {
    const w = seedLife();
    this.worlds.set(w.id, w);
    return w;
  }
  emit(w, r, type, label, data = {}) {
    const e = {
      id: `event:${randomUUID()}`,
      type,
      label,
      at: new Date(this.now()).toISOString(),
      resolutionId: r?.id,
      ...data,
    };
    w.events.push(e);
    w.events = w.events.slice(-150);
    w.revision++;
    if (r) r.state = type;
    return e;
  }
  async wait(w, r) {
    if (!w.demo) return sleep(this.pace);
    let remaining = 1400;
    while (remaining > 0 && r.state !== 'stopped') {
      await sleep(100);
      if (!w.demo.paused) remaining -= 100;
    }
  }
  time(w) {
    return this.now() + (w.clockOffsetMinutes || 0) * 60000;
  }
  evaluate(w, r) {
    const { targets } = capabilityPlan(r.scenario, w);
    // Traverse the shared dependency graph; unreachable entities never affect the resolution.
    const source = targets[0],
      edges = w.dependencies.map(([from, to]) => ({
        from,
        to,
        relation: to === 'sarah' ? 'INVOLVES' : to === 'strategic-goal' ? 'SERVES GOAL' : 'AFFECTS',
      }));
    const ids = new Set([source]);
    let pending = [source];
    while (pending.length) {
      const id = pending.shift();
      for (const e of edges.filter((e) => e.from === id))
        if (!ids.has(e.to)) {
          ids.add(e.to);
          pending.push(e.to);
        }
    }
    const nodes = [...ids].map((id) => ({
      id,
      contextId: w.context.id,
      label:
        id === 'morning'
          ? `${clock(w.commitments.find((c) => c.id === 'morning').hour)} commitment`
          : {
              cash: 'Flexible cash',
              miles: `${w.resources.miles.toLocaleString()} miles`,
              sarah: 'Sarah',
              'refund-rights': 'Refund rights',
              'strategic-goal': 'Founder goals',
            }[id] ||
            w.commitments.find((c) => c.id === id)?.label ||
            id.replaceAll('-', ' '),
    }));
    r.impact = impactGraph({
      contextId: w.context.id,
      sourceId: source,
      nodes,
      edges: edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
    });
    // Source also counts as an affected outcome in the product tally.
    r.impact.affectedCount = r.impact.nodes.length + 1;
    const { options } = capabilityPlan(r.scenario, w, {
      affectedIds: [source, ...r.impact.nodes.map((n) => n.id)],
    });
    if (r.scenario === 'travel')
      for (const option of options) {
        option.constraints = [
          ...(option.constraints || []),
          { id: 'lodging', passed: w.travel.hotel !== 'cancelled' },
        ];
        option.operations = option.operations.filter(
          (op) =>
            !['update_commitment', 'send_message'].includes(op.type) ||
            r.impact.nodes.some((n) => n.id === op.id),
        );
      }
    r.futures = simulateFutures(
      w,
      options.map((o) => ({
        ...o,
        constraints: [
          ...(o.constraints || []),
          { id: 'cash', passed: (o.costs.money || 0) <= w.resources.cash },
        ],
      })),
    );
    const weights = {
      money: 1,
      futureValue: 1,
      commitments: 1,
      opportunityCost: 1,
      preferences: 1,
      risk: w.settings.riskTolerance === 'low' ? 2 : 1,
      time: w.settings.timeValue === 'high' ? 2 : w.settings.timeValue === 'low' ? 0.1 : 0.4,
    };
    r.evaluation = rankFutures(r.futures, { weights });
    r.options = options;
    r.recommended = r.evaluation.recommended;
    const selected = options.find((o) => o.id === r.recommended);
    r.selected = selected || null;
    r.consequences = graphConsequences(r.impact);
    r.relevance = meaningfulChange({ status: 'on-track' }, { status: 'at-risk' }, r.consequences);
    r.worth = worthToYou(selected, options, w.settings);
    r.requiresApproval =
      !selected ||
      w.settings.autonomy === 'ask' ||
      selected.requiresApproval === true ||
      selected.reversibility === 'irreversible' ||
      (selected.costs.money || 0) > w.settings.spendingAuthority;
    r.compression = compressDecision({
      impacts: { nodes: [{ id: source }, ...r.impact.nodes] },
      futures: r.futures,
      actions:
        w.settings.autonomy === 'observe'
          ? []
          : selected
            ? [{ id: selected.id, allowed: true, requiresApproval: r.requiresApproval }]
            : [{ id: 'evidence', allowed: false }],
    });
    r.evidence = selected?.evidence || [
      'No future satisfies every current constraint. Change the world or your budget.',
    ];
    r.worldRevision = w.revision;
    r.analysisSettings = JSON.stringify(w.settings);
    return r;
  }
  async start(w, scenario) {
    if (!SCENARIOS.some((s) => s.id === scenario)) throw Error('Unknown scenario');
    if (w.resolutions.length >= 30)
      throw Error('Reset this world before starting more resolutions.');
    if (w.resolutions.some((r) => !['outcome.restored', 'stopped'].includes(r.state)))
      throw Error('Finish or stop the active resolution first');
    if (w.resolutions.some((r) => r.scenario === scenario && r.state === 'outcome.restored'))
      throw Error('This event is already resolved. Reset the world to try it again.');
    const c = SCENARIOS.find((s) => s.id === scenario);
    const r = {
      id: randomUUID(),
      scenario,
      contextId: w.context.id,
      title: c.title,
      goal: c.goal,
      provider: c.provider,
      state: 'watching',
      actions: [],
      humanDecisions: 0,
      createdAt: new Date(this.now()).toISOString(),
      approved: false,
    };
    w.resolutions.push(r);
    w.resolutions = w.resolutions.slice(-30);
    if (scenario === 'travel') w.travel.status = 'cancelled';
    if (scenario === 'events') {
      w.commitments.find((c) => c.id === 'founder').status = 'accepted';
    }
    if (scenario === 'home') w.home.internet = 'outage';
    if (scenario === 'purchase') w.purchases.order = 'delivery failed';
    r.deviation = detectDeviation({
      id: `deviation:${r.id}`,
      contextId: w.context.id,
      intended: { outcome: c.goal },
      observed: { outcome: 'at risk' },
      evidenceIds: [c.event],
    });
    w.activeDeviations.push(r.deviation);
    w.activeResolutions.push({ id: r.id, capability: scenario });
    this.emit(w, r, 'deviation.detected', c.title, { source: c.event });
    await this.wait(w, r);
    if (r.state === 'stopped') return r;
    this.emit(w, r, 'impact.understood', 'Understanding connected consequences');
    this.evaluate(w, r);
    await this.wait(w, r);
    if (r.state === 'stopped') return r;
    this.emit(w, r, 'futures.simulated', 'Evaluating possible outcomes');
    await this.wait(w, r);
    if (r.state === 'stopped') return r;
    this.evaluate(w, r);
    this.emit(w, r, 'authority.checked', 'Checking your rules');
    if (w.settings.autonomy === 'observe') {
      this.emit(w, r, 'observing', 'Observe only · no action will execute');
      return r;
    }
    if (!r.selected) {
      this.emit(w, r, 'needs.information', 'No feasible plan · adjust a constraint');
      return r;
    }
    if (r.requiresApproval) {
      this.emit(w, r, 'decision.pending', 'One decision needs you');
      return r;
    }
    this.emit(w, r, 'action.authorized', 'Within your rules · no decision needed');
    await this.execute(w, r);
    return r;
  }
  async approve(w, id, revision) {
    const r = w.resolutions.find((r) => r.id === id);
    if (!r) throw Error('Resolution not found');
    if (r.approved) return r;
    if (r.state !== 'decision.pending' || w.settings.autonomy === 'observe')
      throw Error('No approval is available');
    if (revision !== w.revision) throw Error('The world changed. Review the updated plan.');
    this.evaluate(w, r);
    if (!r.selected) throw Error('No feasible plan');
    r.approved = true;
    r.humanDecisions = 1;
    r.approvedOption = r.recommended;
    this.emit(w, r, 'approval.received', 'Approved from your browser');
    await this.execute(w, r);
    return r;
  }
  policy(w, r, op) {
    if (
      r.contextId !== w.context.id ||
      !ALLOWED.includes(op.type) ||
      op.realMoney ||
      op.expandsAuthority ||
      op.modifiesConstitution ||
      w.settings.autonomy === 'observe' ||
      r.state === 'stopped'
    )
      throw Error('Action outside authority');
    if (r.requiresApproval && (!r.approved || r.approvedOption !== r.recommended))
      throw Error('Approval required');
    if ((op.amount || 0) > w.resources.cash && ['reserve', 'submit_form'].includes(op.type))
      throw Error('Insufficient synthetic resources');
  }
  async execute(w, r) {
    if (this.busy.has(r.id)) return;
    this.busy.add(r.id);
    r.intent ||= this.expectedOutcome(r);
    try {
      for (const [i, op] of r.selected.operations.entries()) {
        await this.wait(w, r);
        if (r.state === 'stopped') return;
        this.policy(w, r, op);
        const actionId = `${r.id}:${i}`;
        if (w.ledger.some((a) => a.id === actionId)) continue;
        this.emit(w, r, 'action.executing', op.type.replaceAll('_', ' '));
        if (op.type === 'request_refund') await this.negotiate(w, r, op, actionId);
        else this.apply(w, r, op, actionId);
        const a = {
          id: actionId,
          type: op.type,
          status: 'completed',
          at: new Date(this.now()).toISOString(),
          operation: structuredClone(op),
        };
        w.ledger.push(a);
        w.ledger = w.ledger.slice(-150);
        r.actions.push(a);
        this.emit(w, r, 'action.completed', `${op.type.replaceAll('_', ' ')} completed`);
      }
      this.emit(w, r, 'outcome.verifying', 'Verifying the intended outcome');
      await this.wait(w, r);
      if (r.state === 'stopped') return;
      this.checkOutcome(w, r);
      if (!r.outcome.verified) return;
      this.restore(w, r);
    } catch {
      if (r.state !== 'stopped')
        this.emit(
          w,
          r,
          'action.failed',
          'Action paused safely. Stop this resolution or reset the world.',
        );
    } finally {
      this.busy.delete(r.id);
    }
  }
  restore(w, r) {
    if (w.outcomeHistory.some((h) => h.resolutionId === r.id)) return;
    r.deviation.status = 'resolved';
    w.activeDeviations = w.activeDeviations.filter((d) => d.id !== r.deviation.id);
    w.activeResolutions = w.activeResolutions.filter((a) => a.id !== r.id);
    w.outcomeHistory.push({ resolutionId: r.id, scenario: r.scenario, ...r.outcome });
    w.outcomeHistory = w.outcomeHistory.slice(-30);
    appendMemory(w, {
      id: `resolution:${r.id}`,
      contextId: w.context.id,
      kind: 'resolution-history',
      value: { scenario: r.scenario, option: r.recommended, verified: true },
      source: { type: 'verification', id: r.id },
      evidenceIds: r.outcome.evidence.map((e) => e.id),
    });
    this.emit(w, r, 'outcome.restored', 'Outcome restored · watching again');
    if (r.monitor) r.monitor.status = 'resolved';
  }
  expectedOutcome(r) {
    const predicates = r.selected.operations.map((op, i) => ({
      entity: `check:${r.id}:${i}`,
      field: 'fulfilled',
      equals: true,
      label: this.verificationLabel(op, r),
    }));
    predicates.push({
      entity: `goal:${r.id}`,
      field: 'fulfilled',
      equals: true,
      label: 'Intended outcome independently verified',
    });
    const refundOp = r.selected.operations.find((op) => op.type === 'request_refund');
    if (refundOp)
      predicates.push({
        entity: `refund:${r.id}`,
        field: 'method',
        equals: r.offer?.accepted ? 'credit' : 'cash',
        label: r.offer?.accepted
          ? 'Authorized credit independently confirmed'
          : 'Cash received, not merely requested',
      });
    return { id: `outcome:${r.id}`, label: r.goal, predicates };
  }
  checkOutcome(w, r) {
    const now = this.time(w),
      at = new Date(now).toISOString();
    const refundOp = r.selected.operations.find((op) => op.type === 'request_refund');
    r.intent ||= this.expectedOutcome(r);
    if (r.offer?.accepted) {
      const method = r.intent.predicates.find((p) => p.entity === `refund:${r.id}`);
      method.equals = 'credit';
      method.label = 'Authorized credit independently confirmed';
      const request = r.intent.predicates.find(
        (p) => p.entity === `check:${r.id}:${r.selected.operations.indexOf(refundOp)}`,
      );
      request.label = 'Authorized airline credit confirmed';
    }
    r.intent.expectedBy = r.pendingRefund?.expectedBy || r.intent.expectedBy;
    for (const [i, op] of r.selected.operations.entries()) {
      if (op.type === 'request_refund' && r.pendingRefund) continue;
      recordObservation(w, {
        id: `verification:${r.id}:${i}:${w.revision}`,
        entity: `check:${r.id}:${i}`,
        field: 'fulfilled',
        value: this.verify(w, r, op),
        source: `world:${r.id}:${i}`,
        directness: 'direct',
        observedAt: at,
      });
    }
    if (!r.pendingRefund)
      recordObservation(w, {
        id: `verification:${r.id}:goal:${w.revision}`,
        entity: `goal:${r.id}`,
        field: 'fulfilled',
        value: this.goalSatisfied(w, r),
        source: `world:${r.id}:goal`,
        directness: 'direct',
        observedAt: at,
      });
    if (refundOp && !r.pendingRefund)
      recordObservation(w, {
        id: `verification:${r.id}:method:${w.revision}`,
        entity: `refund:${r.id}`,
        field: 'method',
        value: r.offer?.accepted
          ? w.money.credits.some(
              (receipt) => receipt.id === `${r.id}:${r.selected.operations.indexOf(refundOp)}`,
            )
            ? 'credit'
            : 'none'
          : w.money.refunds.some(
                (a) =>
                  a.id === `${r.id}:${r.selected.operations.indexOf(refundOp)}` &&
                  a.provider === r.provider &&
                  a.amount === refundOp.amount,
              )
            ? 'cash'
            : 'none',
        source: 'sandbox-receipt',
        directness: 'direct',
        observedAt: at,
      });
    r.verification = verifyExpectedOutcome(r.intent, w.observations, now);
    r.outcome = {
      verified: r.verification.verified,
      status: r.verification.status,
      at,
      evidence: r.verification.evidence.map((e, i) => ({
        id: `check:${r.id}:${i}`,
        label: e.label,
        passed: e.passed,
      })),
    };
    if (!r.outcome.verified) {
      const contradiction =
        w.observations.some((f) => f.entity === `refund:${r.id}` && f.field === 'method') &&
        verifyExpectedOutcome(
          {
            id: `refund-check:${r.id}`,
            label: 'Cash refund',
            predicates: [{ entity: `refund:${r.id}`, field: 'method', equals: 'cash' }],
          },
          w.observations,
          now,
        ).status === 'contradicted';
      const replan = r.verification.overdue || contradiction || r.verification.next === 'replan';
      r.monitor = {
        status: replan ? 'replanning' : 'watching',
        watchUntil: r.intent.expectedBy || null,
        lastObservedAt: at,
        condition: 'Independent confirmation that the intended outcome occurred',
        humanDecisions: 0,
        reason: contradiction
          ? 'Provider claims disagree. Preserve both claims and the existing request; wait for direct evidence.'
          : r.verification.overdue
            ? 'The confirmation window passed. Waiting now delays recovery. Preserve the original request and prepare a reversible evidence check.'
            : replan
              ? 'Observed state does not satisfy the intended outcome. Prepare safer possibilities without repeating actions.'
              : r.verification.waiting,
        futures: replan
          ? [
              {
                id: 'watch',
                label: 'Keep watching the existing request',
                feasible: !r.verification.overdue && !contradiction,
                reversibility: 'reversible',
              },
              {
                id: 'evidence',
                label: 'Prepare a confirmation check',
                feasible: true,
                reversibility: 'reversible',
              },
            ]
          : [],
        plan: null,
        worthToYou: r.verification.overdue
          ? 'Waiting now delays recovery; a reversible evidence check preserves the existing claim.'
          : contradiction
            ? 'A direct receipt is worth more than conflicting provider claims. Preserve optionality until it arrives.'
            : 'Waiting inside the confirmation window avoids unnecessary interruption and duplicate handling.',
      };
      if (replan)
        r.monitor.plan = optionalityPlan({
          uncertain: true,
          deadlinePassed: r.verification.overdue,
          options: r.monitor.futures,
        });
      r.compression.humanDecisions = r.monitor.plan?.humanDecisions || 0;
      this.emit(
        w,
        r,
        contradiction
          ? 'contradiction.detected'
          : replan
            ? 'outcome.replanning'
            : r.pendingRefund
              ? 'outcome.watching'
              : 'verification.failed',
        contradiction
          ? 'Conflicting refund evidence · watching for independent confirmation'
          : replan
            ? 'Expected outcome missing · plan adapted without repeating actions'
            : r.pendingRefund
              ? 'Refund requested, not received · continuing to watch'
              : 'Outcome not restored · preparation and evidence review continue',
      );
    }
  }
  monitor(w) {
    if (w.demo?.paused) return;
    for (const r of w.resolutions)
      if (
        r.pendingRefund &&
        !['stopped', 'outcome.restored'].includes(r.state) &&
        !this.busy.has(r.id) &&
        r.monitor?.status === 'watching' &&
        this.time(w) >= Date.parse(r.pendingRefund.expectedBy)
      )
        this.checkOutcome(w, r);
  }
  observe(w, input) {
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      Object.keys(input).some((k) => !['id', 'kind', 'minutes'].includes(k)) ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(input.id || '') ||
      !['advance', 'refund-confirmed'].includes(input.kind)
    )
      throw Error('Invalid synthetic observation');
    if (w.processedObservations.includes(input.id))
      return { recognized: true, message: 'Observation already processed.' };
    if (w.resolutions.some((r) => this.busy.has(r.id)))
      throw Error('An authorized action is running. Stop it before changing its mandate.');
    if (input.kind === 'advance') {
      if (
        !Number.isInteger(input.minutes) ||
        input.minutes < 1 ||
        input.minutes > 1440 ||
        w.clockOffsetMinutes + input.minutes > 10080
      )
        throw Error('Invalid synthetic time');
      w.clockOffsetMinutes += input.minutes;
      this.emit(
        w,
        null,
        'time.advanced',
        'Synthetic time advanced; monitored conditions re-evaluated',
      );
      this.monitor(w);
    } else {
      const r = w.resolutions.find(
        (r) => r.pendingRefund && !['stopped', 'outcome.restored'].includes(r.state),
      );
      if (!r) throw Error('No monitored refund');
      const { op, id } = r.pendingRefund;
      if (!w.money.refunds.some((a) => a.id === id)) {
        w.money.refunds.push({ id, amount: op.amount, provider: r.provider });
        w.resources.cash += op.amount;
      }
      // A direct synthetic receipt supersedes older claims, without deleting either claim.
      const at = new Date(this.time(w)).toISOString();
      recordObservation(w, {
        id: `receipt:${r.id}`,
        entity: `refund:${r.id}`,
        field: 'method',
        value: 'cash',
        source: 'sandbox-receipt',
        directness: 'direct',
        observedAt: at,
      });
      r.pendingRefund = null;
      this.emit(w, r, 'outcome.observed', 'Independent synthetic cash receipt observed');
      this.checkOutcome(w, r);
      if (r.outcome.verified) this.restore(w, r);
    }
    w.processedObservations.push(input.id);
    w.processedObservations = w.processedObservations.slice(-100);
    return { recognized: true, message: 'Synthetic observation processed. No external action.' };
  }
  async negotiate(w, r, op, id) {
    this.emit(w, r, 'provider.contacted', `Refund requested from ${r.provider}`);
    await this.wait(w, r);
    if (r.state === 'stopped') throw Error('Stopped');
    if (r.scenario === 'travel') {
      r.offer = {
        credit: 450,
        cash: 412,
        creditWorth: Math.round(450 * w.settings.airlineUseProbability),
        assumptions: ['Airline locked', 'Expires', 'Seeded expected airline use'],
      };
      this.emit(w, r, 'counteroffer.received', '$450 airline credit offered');
      await this.wait(w, r);
      if (r.state === 'stopped') throw Error('Stopped');
      r.offer.accepted = r.offer.creditWorth > 412;
      this.emit(
        w,
        r,
        'offer.evaluated',
        r.offer.accepted
          ? 'Credit is worth more under your explicit preference'
          : '$412 cash is worth more to you',
      );
      if (r.offer.accepted) {
        if (!w.money.credits.some((receipt) => receipt.id === id)) {
          w.resources.airlineCredit = (w.resources.airlineCredit || 0) + 450;
          w.money.credits.push({ id, provider: r.provider, amount: 450 });
        }
        r.offer.status = 'credit accepted';
        return;
      }
      this.emit(w, r, 'negotiating', 'Credit rejected · cash requested within the mandate');
      await this.wait(w, r);
      if (r.state === 'stopped') throw Error('Stopped');
    } else {
      this.emit(w, r, 'provider.responded', 'Provider checked synthetic eligibility');
      await this.wait(w, r);
      if (r.state === 'stopped') throw Error('Stopped');
      this.emit(w, r, 'negotiating', 'Refund terms confirmed');
    }
    if (w.settings.confirmationMode !== 'immediate') {
      r.pendingRefund = {
        op: structuredClone(op),
        id,
        expectedBy: new Date(this.time(w) + 20 * 60000).toISOString(),
      };
      if (w.settings.confirmationMode === 'conflicting') {
        const at = new Date(this.time(w)).toISOString();
        for (const [source, value] of [
          ['provider-status', 'cash'],
          ['fulfillment-status', 'credit'],
        ])
          recordObservation(w, {
            id: `claim:${r.id}:${source}`,
            entity: `refund:${r.id}`,
            field: 'method',
            value,
            source,
            directness: 'claim',
            observedAt: at,
          });
      }
      this.emit(
        w,
        r,
        'provider.pending',
        'Refund request acknowledged; independent receipt still missing',
      );
      return;
    }
    if (!w.money.refunds.some((a) => a.id === id)) {
      w.money.refunds.push({ id, amount: op.amount, provider: r.provider });
      w.resources.cash += op.amount;
    }
    appendMemory(w, {
      id: `counterparty:${id}`,
      contextId: w.context.id,
      kind: 'counterparty-history',
      value: { provider: r.provider, refund: op.amount, method: 'cash' },
      source: { type: 'sandbox-provider', id: r.id },
    });
    this.emit(w, r, 'refund.confirmed', `$${op.amount} cash refund confirmed`);
  }
  apply(w, r, op, id) {
    const c = w.commitments.find((c) => c.id === op.id);
    switch (op.type) {
      case 'rebook':
        w.travel.status = 'rebooked';
        w.travel.choice = op.choice;
        w.travel.arrival = op.choice === 'A' ? 'Tomorrow evening' : '6:05 AM tomorrow';
        if (op.choice === 'B') {
          w.resources.cash -= 504;
          w.money.charges.push({ id, amount: 504, reason: 'Replacement flight' });
        }
        if (op.choice === 'C') w.resources.miles -= 31000;
        break;
      case 'update_commitment':
      case 'reschedule':
        if (c) c.status = op.status;
        else w.work[op.id] = op.status;
        break;
      case 'send_message':
        w.people.find((p) => p.id === op.id).communication = 'sandbox update sent';
        break;
      case 'reserve':
      case 'submit_form':
        w.resources.cash -= op.amount;
        w.money.charges.push({ id, amount: op.amount, reason: op.id });
        if (op.type === 'submit_form') w.admin.renewal = 'submitted';
        else w.work[op.id] = 'reserved';
        break;
      case 'cancel':
        if (op.id === 'subscription') w.subscriptions.subscription = 'cancelled';
        if (op.id === 'order') w.purchases.order = 'cancelled';
        if (c) c.status = 'cancelled';
        break;
      case 'replace':
        w.purchases.order = 'replacement arrives tonight';
        break;
      case 'accept_offer':
        if (op.id === 'benefit') {
          w.resources.benefit = 0;
          w.benefits.benefit = 'applied to planned trip';
        } else w.opportunities[op.id] = 'accepted';
        break;
      case 'decline_offer':
        if (op.id === 'benefit') w.benefits.benefit = 'expired';
        else w.opportunities[op.id] = 'declined';
        break;
      case 'activate_backup':
        w.home.backup = op.id;
        w.home.call = 'protected';
        break;
      case 'prepare':
        if (!w.prepared.includes(op.id)) w.prepared.push(op.id);
        if (['form', 'document'].includes(op.id)) w.admin[op.id] = 'prepared';
        break;
      case 'verify':
        break;
    }
  }
  goalSatisfied(w, r) {
    switch (r.scenario) {
      case 'travel':
        return (
          w.travel.status === 'rebooked' &&
          w.travel.hotel !== 'cancelled' &&
          (!r.impact.nodes.some((n) => n.id === 'morning') ||
            w.commitments.find((c) => c.id === 'morning').importance < 0.5 ||
            w.commitments.find((c) => c.id === 'morning').status === 'protected') &&
          (r.selected.id === 'A' ||
            r.offer?.accepted === true ||
            w.money.refunds.some((a) => a.provider === 'Airline' && a.amount === 412))
        );
      case 'events':
        return w.commitments.find((c) => c.id === 'event-c').status !== 'declined';
      case 'money':
        return (
          w.settings.subscriptionUsage === 'high' || w.subscriptions.subscription === 'cancelled'
        );
      case 'purchase':
        return w.settings.deliveryUrgent
          ? w.purchases.order === 'replacement arrives tonight'
          : w.purchases.order === 'cancelled' ||
              w.purchases.order === 'replacement arrives tonight';
      case 'benefits':
        return w.benefits.benefit === 'applied to planned trip';
      case 'work':
        return (
          w.commitments.find((c) => c.id === 'preparation').status === '2:45 PM' &&
          w.commitments.find((c) => c.id === 'next-meeting').status === 'protected'
        );
      case 'home':
        return w.home.call === 'protected';
      case 'admin':
        return (
          w.admin.renewal === 'submitted' &&
          w.admin.form === 'prepared' &&
          w.admin.document === 'prepared'
        );
      case 'people':
        return (
          w.commitments.find((c) => c.id === 'dinner').status === '45 minutes later' &&
          w.prepared.includes('message')
        );
      case 'opportunity':
        return ['accepted', 'declined'].includes(w.opportunities.invitation);
      default:
        return false;
    }
  }
  verificationLabel(op, r) {
    if (op.type === 'rebook')
      return r.selected.id === 'A'
        ? 'Tomorrow’s rebooking confirmed'
        : 'Arrival tonight’s departure confirmed';
    if (op.type === 'request_refund')
      return r.offer?.accepted ? 'Airline credit confirmed' : `$${op.amount} cash refund confirmed`;
    if (op.type === 'update_commitment') return `Commitment ${op.status}`;
    return `${op.type.replaceAll('_', ' ')}: ${op.id || 'world'}`;
  }
  verify(w, r, op) {
    const c = w.commitments.find((c) => c.id === op.id);
    switch (op.type) {
      case 'rebook':
        return w.travel.choice === op.choice && w.travel.status === 'rebooked';
      case 'update_commitment':
      case 'reschedule':
        return (c?.status || w.work[op.id]) === op.status;
      case 'request_refund':
        return r.offer?.accepted
          ? w.money.credits.some(
              (receipt) =>
                receipt.id === `${r.id}:${r.selected.operations.indexOf(op)}` &&
                receipt.amount === 450,
            )
          : w.money.refunds.some(
              (a) =>
                a.id === `${r.id}:${r.selected.operations.indexOf(op)}` &&
                a.provider === r.provider &&
                a.amount === op.amount,
            );
      case 'send_message':
        return w.people.find((p) => p.id === op.id)?.communication === 'sandbox update sent';
      case 'reserve':
        return w.work[op.id] === 'reserved';
      case 'submit_form':
        return w.admin.renewal === 'submitted';
      case 'cancel':
        return op.id === 'subscription'
          ? w.subscriptions.subscription === 'cancelled'
          : op.id === 'order'
            ? w.purchases.order === 'cancelled'
            : c?.status === 'cancelled';
      case 'replace':
        return w.purchases.order === 'replacement arrives tonight';
      case 'accept_offer':
        return op.id === 'benefit'
          ? w.benefits.benefit === 'applied to planned trip'
          : w.opportunities[op.id] === 'accepted';
      case 'decline_offer':
        return op.id === 'benefit'
          ? w.benefits.benefit === 'expired'
          : w.opportunities[op.id] === 'declined';
      case 'activate_backup':
        return w.home.backup === op.id && w.home.call === 'protected';
      case 'prepare':
        return w.prepared.includes(op.id);
      case 'verify':
        return true;
      default:
        return false;
    }
  }
  change(w, input) {
    if (input.observation) {
      if (Object.keys(input).some((k) => k !== 'observation'))
        throw Error('Observation must be separate from rule changes');
      return this.observe(w, input.observation);
    }
    const active = w.resolutions.find((r) => !['outcome.restored', 'stopped'].includes(r.state));
    if (active && this.busy.has(active.id))
      throw Error('An authorized action is running. Stop it before changing its mandate.');
    if (active?.actions.length)
      throw Error('Stop the partially executed resolution before changing its plan.');
    const beforeMeeting = structuredClone(w.commitments.find((c) => c.id === 'morning'));
    const changes = {};
    if (typeof input.text === 'string') {
      const t = input.text.toLowerCase().trim();
      if (t.length > 300) throw Error('Use a short synthetic update');
      if (
        /(meeting|commitment).*(isn.t important|not important|doesn.t matter|less important)/.test(
          t,
        )
      )
        changes.meetingImportance = 0;
      else if (/(meeting|commitment).*(important|must preserve)/.test(t))
        changes.meetingImportance = 1;
      const hour = t.match(/meeting.*?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
      if (hour)
        changes.meetingHour =
          (Number(hour[1]) % 12) + (hour[3] === 'pm' ? 12 : 0) + Number(hour[2] || 0) / 60;
      const budget = t.match(/(?:spend|budget|more than|limit).*?\$\s*(\d{1,4})/);
      if (budget) changes.maxSpend = Number(budget[1]);
      if (/preserve.*miles|keep.*miles/.test(t)) changes.preserveMiles = true;
      if (/(use|spend).*miles|miles.*(not important|don.t matter)/.test(t))
        changes.preserveMiles = false;
      if (/delivery.*(not urgent|isn.t urgent|no longer urgent)/.test(t))
        changes.deliveryUrgent = false;
      if (/rather.*dinner|personal.*priority/.test(t)) changes.calendarPriority = 'personal';
      if (/hotel.*cancel/.test(t)) changes.hotel = 'cancelled';
      else if (/hotel.*confirmed/.test(t)) changes.hotel = 'confirmed';
      if (!Object.keys(changes).length)
        return {
          recognized: false,
          message:
            'I could not safely interpret that update. Use the structured controls below; no state changed.',
        };
    } else if (
      input.settings &&
      typeof input.settings === 'object' &&
      !Array.isArray(input.settings)
    )
      Object.assign(changes, input.settings);
    else throw Error('A supported update is required');
    const bounds = {
      maxSpend: [0, 2000],
      spendingAuthority: [0, 250],
      meetingHour: [0, 23.99],
      meetingImportance: [0, 1],
      meetingPreparation: [0, 240],
      meetingTravel: [0, 240],
      airlineUseProbability: [0, 1],
    };
    const enums = {
      autonomy: MODES,
      timeValue: ['low', 'medium', 'high'],
      riskTolerance: ['low', 'balanced', 'high'],
      calendarPriority: ['personal', 'balanced', 'professional'],
      subscriptionUsage: ['low', 'high'],
      confirmationMode: ['immediate', 'delayed', 'conflicting'],
    };
    for (const [key, value] of Object.entries(changes)) {
      if (bounds[key]) {
        if (
          typeof value !== 'number' ||
          !Number.isFinite(value) ||
          value < bounds[key][0] ||
          value > bounds[key][1]
        )
          throw Error('Invalid constraint');
      } else if (enums[key]) {
        if (!enums[key].includes(value)) throw Error('Invalid preference');
      } else if (['preserveMiles', 'deliveryUrgent'].includes(key)) {
        if (typeof value !== 'boolean') throw Error('Invalid preference');
      } else if (key === 'hotel') {
        if (!['cancelled', 'confirmed'].includes(value)) throw Error('Invalid hotel observation');
      } else throw Error('This field cannot be changed');
    }
    for (const [key, value] of Object.entries(changes)) {
      if (key === 'meetingImportance')
        w.commitments.find((c) => c.id === 'morning').importance = value;
      else if (key === 'meetingHour') w.commitments.find((c) => c.id === 'morning').hour = value;
      else if (key === 'meetingPreparation' || key === 'meetingTravel') {
        const c = w.commitments.find((c) => c.id === 'morning');
        c[key === 'meetingPreparation' ? 'preparationMinutes' : 'travelMinutes'] = value;
        c.preferenceSource = 'Explicit user rule';
      } else if (key === 'hotel') {
        w.travel.hotel = value;
        if (!w.dependencies.some(([a, b]) => a === 'flight' && b === 'hotel'))
          w.dependencies.push(['flight', 'hotel'], ['hotel', 'cash']);
      } else w.settings[key] = value;
    }
    if (
      [
        ['meetingHour', 'hour'],
        ['meetingPreparation', 'preparationMinutes'],
        ['meetingTravel', 'travelMinutes'],
      ].some(([key, field]) => Object.hasOwn(changes, key) && changes[key] !== beforeMeeting[field])
    ) {
      const after = w.commitments.find((c) => c.id === 'morning'),
        at = new Date(this.time(w)).toISOString();
      w.temporalChanges ||= [];
      w.temporalChanges.push({
        id: `temporal:${randomUUID()}`,
        entity: after.id,
        expected: {
          hour: beforeMeeting.hour,
          preparationMinutes: beforeMeeting.preparationMinutes,
          travelMinutes: beforeMeeting.travelMinutes,
        },
        observed: {
          hour: after.hour,
          preparationMinutes: after.preparationMinutes,
          travelMinutes: after.travelMinutes,
        },
        observedAt: at,
        source: 'Explicit synthetic world update',
        operationalHour:
          after.hour - ((after.preparationMinutes || 0) + (after.travelMinutes || 0)) / 60,
        conclusion:
          'The nominal start and the time required to protect this commitment are different.',
      });
      w.temporalChanges = w.temporalChanges.slice(-30);
      recordObservation(w, {
        id: `meeting:${randomUUID()}`,
        entity: 'morning',
        field: 'hour',
        value: after.hour,
        source: 'synthetic-world-update',
        directness: 'direct',
        observedAt: at,
      });
    }
    const temporary = Object.keys(changes).some((k) =>
      [
        'meetingHour',
        'meetingImportance',
        'meetingPreparation',
        'meetingTravel',
        'deliveryUrgent',
      ].includes(k),
    );
    const fact = Object.keys(changes).every((k) => k === 'hotel');
    appendMemory(w, {
      id: `change:${randomUUID()}`,
      contextId: w.context.id,
      kind: fact ? 'historical-observation' : temporary ? 'current-constraint' : 'explicit-rule',
      value: changes,
      source: { type: 'human', id: `visitor:${w.id}` },
      explicit: true,
      ...(temporary ? { expiresAt: new Date(this.now() + 30 * 60 * 1000).toISOString() } : {}),
    });
    this.emit(w, null, 'world.changed', 'Explicit synthetic constraints updated', { changes });
    if (active) {
      active.approved = false;
      this.evaluate(w, active);
      if (w.settings.autonomy === 'observe')
        this.emit(w, active, 'observing', 'Observe only · actions paused');
      else if (!active.selected)
        this.emit(w, active, 'needs.information', 'No feasible plan · adjust a constraint');
      else if (active.requiresApproval)
        this.emit(w, active, 'decision.pending', 'Plan recalculated · review the new decision');
      else {
        this.emit(w, active, 'action.authorized', 'Updated rules permit a reversible action');
        void this.execute(w, active);
      }
    }
    if (changes.hotel === 'cancelled')
      this.emit(
        w,
        null,
        'needs.information',
        'Hotel cancellation recorded. Hotel recovery is not available yet.',
      );
    return {
      recognized: true,
      message: 'World updated. Recommendations use the new constraints.',
      changes,
    };
  }
  stop(w, id) {
    const r = w.resolutions.find((r) => r.id === id);
    if (!r) throw Error('Resolution not found');
    if (r.state === 'outcome.restored' || r.state === 'stopped') return;
    this.emit(w, r, 'stopped', 'No further actions will execute');
    if (r.deviation) r.deviation.status = 'paused'; // Stopping work does not restore reality.
    w.activeResolutions = w.activeResolutions.filter((a) => a.id !== r.id);
  }
  reset(w) {
    if (w.resolutions.some((r) => this.busy.has(r.id)))
      throw Error('Stop the active resolution and wait for its action to settle before resetting');
    for (const r of w.resolutions) this.stop(w, r.id);
    const fresh = seedLife(w.id);
    Object.keys(w).forEach((k) => delete w[k]);
    Object.assign(w, fresh);
    this.emit(w, null, 'world.reset', 'Synthetic world reset');
    return w;
  }
}
