import { impactGraph, detectDeviation } from '../core/impact.js';
import { compressDecision } from '../core/intelligence.js';
import { context, evaluateRecovery, evaluateOffer, flightInventory } from '../domain.js';
import { airlineCommand, lifeCommand } from '../simulator.js';
import { personalWorld, verifyOutcome } from '../core/world.js';
import { snapshotConstitution } from '../core/constitution.js';
export const analysisSteps = [
  [
    'flight.cancelled',
    { flight: 'SFO → JFK', source: 'Sandbox airline event' },
    'CANCELLATION_RECEIVED',
    0,
  ],
  ['context.loaded', {}, 'CONTEXT_LOADED', 1700],
  ['calendar.conflict_found', { time: '9 AM', person: 'Sarah' }, 'CONTEXT_LOADED', 2200],
  ['alternatives.found', { checked: flightInventory.length }, 'CONTEXT_LOADED', 1300],
  [
    'economics.calculated',
    { fare: 504, refund: 412, net: 92, milesValue: 560 },
    'OPTIONS_CALCULATED',
    1200,
  ],
  ['recommendation.ready', { option: 'B' }, 'RECOMMENDATION_READY', 1900],
  ['decision.sent', {}, 'WAITING_FOR_APPROVAL', 2300],
];
export function executionSteps(run) {
  return [
    ['booking.started', { option: 'B', price: 504 }, 'EXECUTING_RECOVERY', 1700],
    [
      'booking.completed',
      { confirmation: `ST-${run.id.slice(0, 6).toUpperCase()}`, price: 504 },
      'EXECUTING_RECOVERY',
      2700,
    ],
    [
      'calendar.updated',
      { meeting: '9 AM tomorrow', arrival: '6:05 AM' },
      'EXECUTING_RECOVERY',
      1300,
    ],
    [
      'sarah.notified',
      { person: 'Sarah', message: `${run.context.name} will be there at 9 AM.` },
      'EXECUTING_RECOVERY',
      1100,
    ],
    ['refund.requested', { amount: 412 }, 'REFUND_REQUESTED', 1400],
    ['airline.offer_received', { credit: 450, originalFare: 412 }, 'COUNTERPARTY_RESPONSE', 4500],
    ['offer.evaluated', evaluateOffer(450, run.context), 'OFFER_EVALUATED', 3300],
    [
      'rebuttal.sent',
      {
        requested: 412,
        reason: `Cash has greater value to ${run.context.name}. Please refund the original payment method.`,
      },
      'REBUTTAL_SENT',
      4200,
    ],
    ['refund.confirmed', { amount: 412, method: 'original payment method' }, 'REBUTTAL_SENT', 3600],
    ['outcome.verification_started', {}, 'VERIFYING_OUTCOME', 1800],
    [
      'exception.resolved',
      { humanDecisions: 1, meetingSaved: true, milesPreserved: 31000, refund: 412, net: 92 },
      'RESOLVED',
      2700,
    ],
  ];
}

export const travelCapability = {
  id: 'travel-disruption',
  authorization: {
    spendingLimit: 504,
    costs: { 'booking.started': 504, 'booking.completed': 504 },
  },
  resolutionEvent: 'exception.resolved',
  shouldCommunicate: (type) => type === 'sarah.notified',
  seed(mode) {
    const c = structuredClone(context);
    if (mode === 'public') c.name = 'Alex';
    return {
      context: c,
      decision: {
        id: 'flight-recovery',
        ...evaluateRecovery(c),
        status: 'pending',
        futures: evaluateRecovery(c).options.map((o) => ({
          optionId: o.id,
          commitmentPreserved: o.preservesMeeting,
          incrementalCost: o.net,
          resourcesPreserved: c.rewards.miles - o.miles,
          assumptions: [
            'Seeded inventory available',
            'Original fare refundable when rebooking and credit are declined',
          ],
        })),
      },
      constitution: snapshotConstitution(),
      personalWorld: personalWorld({
        goals: [
          {
            id: 'keep-plans',
            intent: 'Arrive before the meeting while protecting cash and future travel',
          },
        ],
        commitments: [
          { id: 'meeting', person: c.meeting.person, time: c.meeting.time, priority: 'protect' },
        ],
        resources: [
          { id: 'cash', amount: 412, unit: 'USD' },
          { id: 'rewards', amount: 31000, unit: 'miles' },
        ],
        preferences: [
          { kind: 'explicit-demo-preference', value: 'Cash flexibility' },
          { kind: 'temporary-plan', value: 'December rewards worth approximately $560' },
        ],
        constraints: [
          { id: 'arrival', value: 'Arrive at least 90 minutes before the 9 AM meeting' },
        ],
      }),
    };
  },
  analysisSteps,
  executionSteps,
  authority(type) {
    if (type === 'outcome.verification_started')
      return { authority: 'YELLOW', requiresApproval: true };
    if (type === 'booking.started' || type === 'booking.completed')
      return { authority: 'RED', requiresApproval: true };
    if (
      [
        'calendar.updated',
        'sarah.notified',
        'refund.requested',
        'airline.offer_received',
        'offer.evaluated',
        'rebuttal.sent',
        'refund.confirmed',
        'exception.resolved',
        'outcome.verification_started',
      ].includes(type)
    )
      return { authority: 'YELLOW', requiresApproval: true };
    if (analysisSteps.some((s) => s[0] === type)) return { authority: 'GREEN' };
    return { authority: 'BLACK' };
  },
  apply(run, type, data) {
    if (type === 'flight.cancelled') {
      airlineCommand(run, 'CANCEL_FLIGHT');
      const contextId = run.representation.id;
      run.deviation = detectDeviation({
        id: `deviation:${run.id}`,
        contextId,
        intended: { transportAvailable: true },
        observed: { transportAvailable: false },
        evidenceIds: ['flight.cancelled'],
      });
      const domains = ['travel', 'calendar', 'people', 'money', 'rewards', 'rights'];
      run.impactGraph = impactGraph({
        contextId,
        sourceId: 'cancellation',
        nodes: ['cancellation', ...domains].map((id) => ({ id, contextId })),
        edges: domains.map((to) => ({ from: 'cancellation', to })),
      });
      run.compression = compressDecision({
        impacts: run.impactGraph,
        futures: run.decision.futures,
        actions: [
          {
            id: 'recovery',
            requiresApproval: true,
            reason: 'Authorize the $504 booking; $92 net after refund',
          },
        ],
      });
    }
    const commands = {
      'booking.completed': 'ACCEPT_BOOKING',
      'refund.requested': 'RECEIVE_REFUND_REQUEST',
      'airline.offer_received': 'OFFER_VOUCHER',
      'rebuttal.sent': 'RECEIVE_REJECTION',
      'refund.confirmed': 'APPROVE_CASH_REFUND',
    };
    if (commands[type])
      airlineCommand(
        run,
        commands[type],
        type === 'booking.completed' ? { option: 'B', price: 504 } : data,
      );
    const life = {
      'booking.completed': 'CHARGE_BOOKING',
      'calendar.updated': 'UPDATE_CALENDAR',
      'sarah.notified': 'NOTIFY_SARAH',
      'refund.confirmed': 'CREDIT_REFUND',
    };
    if (life[type]) lifeCommand(run, life[type]);
    if (type === 'booking.completed') run.actions.booking = { status: 'completed', ...data };
    if (type === 'refund.confirmed') run.actions.refund = { status: 'completed', ...data };
  },
  worldState(run) {
    return {
      people: [
        {
          id: 'sarah',
          relationship: 'meeting counterpart',
          notified: (run.world?.people.sarahInbox.length || 0) > 0,
        },
      ],
      time: [
        {
          id: 'meeting',
          startsAt: run.context.meeting.startsAt,
          status: run.world?.calendar.status || 'scheduled',
        },
      ],
      travel: [{ id: 'trip', route: 'SFO-JFK', status: run.airline?.state || 'SCHEDULED' }],
      money: [
        {
          id: 'booking-payment',
          charges: run.world?.payments.charges || [],
          refunds: run.world?.payments.refunds || [],
        },
      ],
      rights: [{ id: 'refund', amount: 412, source: 'Seeded cancellation refund condition' }],
      counterparties: [{ id: 'sandbox-airline', kind: 'airline' }],
      observedState: {
        transportAvailable: Boolean(run.actions.booking),
        meetingProtected: run.world?.calendar.status === 'safe',
        cashRefundConfirmed: Boolean(run.actions.refund),
      },
    };
  },
  verify(run) {
    return verifyOutcome(run, [
      {
        id: 'travel',
        label: 'Flight confirmed and paid once',
        check: (r) =>
          r.actions.booking?.status === 'completed' &&
          r.world?.payments.charges.length === 1 &&
          r.world.payments.charges[0].amount === 504,
      },
      {
        id: 'time',
        label: '9 AM commitment protected',
        check: (r) => r.world?.calendar.status === 'safe',
      },
      {
        id: 'people',
        label: 'Sarah notification received once',
        check: (r) => r.world?.people.sarahInbox.length === 1,
      },
      {
        id: 'resources',
        label: '31,000 miles preserved',
        check: (r) => r.decision.milesPreserved === 31000,
      },
      {
        id: 'money',
        label: '$412 cash returned once',
        check: (r) =>
          r.airline?.state === 'REFUNDED' &&
          r.world?.payments.refunds.length === 1 &&
          r.world.payments.refunds[0].amount === 412,
      },
      {
        id: 'authority',
        label: 'One human decision, approved plan only',
        check: (r) =>
          r.decision.status === 'approved' &&
          r.events.filter((e) => e.type === 'approval.received').length === 1,
      },
    ]);
  },
};
