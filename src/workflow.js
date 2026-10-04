import { evaluateOffer, flightInventory } from './domain.js';
import { airlineCommand, lifeCommand } from './simulator.js';
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
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
export class Workflow {
  constructor(
    store,
    {
      pace = 1,
      sendDecision = async () => ({ channel: 'local' }),
      communicate = async () => ({ channel: 'sandbox' }),
      onEvent = () => {},
    } = {},
  ) {
    this.store = store;
    this.pace = pace;
    this.sendDecision = sendDecision;
    this.communicate = communicate;
    this.onEvent = onEvent;
    this.running = new Set();
  }
  emit(run, type, data = {}, state) {
    const e = this.store.emit(run, type, data, state);
    this.onEvent(run, e);
    return e;
  }
  async analyze(run) {
    if (
      this.running.has(run.id) ||
      ![
        'CALM',
        'CANCELLATION_RECEIVED',
        'CONTEXT_LOADED',
        'OPTIONS_CALCULATED',
        'RECOMMENDATION_READY',
      ].includes(run.state)
    )
      return;
    this.running.add(run.id);
    try {
      for (const [type, data, state, ms] of analysisSteps) {
        if (run.events.some((e) => e.type === type)) continue;
        await delay(ms * this.pace);
        if (type === 'decision.sent') {
          this.emit(run, type, { delivery: 'preparing' }, state);
          try {
            const result = await this.sendDecision(run);
            run.delivery = result;
            this.emit(run, 'decision.delivery_updated', result);
          } catch {
            run.delivery = {
              channel: 'local',
              error: 'Approval email unavailable. Use the local approval link or replay.',
            };
            this.emit(run, 'decision.delivery_updated', run.delivery);
          }
        } else {
          if (type === 'flight.cancelled') airlineCommand(run, 'CANCEL_FLIGHT');
          this.emit(run, type, data, state);
        }
      }
    } finally {
      this.running.delete(run.id);
    }
  }
  approve(run, device = 'Browser') {
    if (run.decision.status === 'approved') return { alreadyApproved: true };
    if (run.state !== 'WAITING_FOR_APPROVAL') throw new Error('Decision is not awaiting approval');
    run.decision.status = 'approved';
    run.decision.approvedAt = new Date().toISOString();
    this.emit(run, 'approval.received', { by: 'Vincent', device }, 'APPROVED');
    void this.execute(run).catch(() => {
      this.emit(run, 'workflow.error', {
        message: 'Recovery paused. Restart the server to resume safely.',
      });
    });
    return { alreadyApproved: false };
  }
  async message(run, kind) {
    try {
      const result = await this.communicate(run, kind);
      run.messages.push({ kind, at: new Date().toISOString(), ...result });
      this.store.save();
      return result;
    } catch {
      const result = { channel: 'sandbox', delivery: 'unavailable' };
      run.messages.push({ kind, at: new Date().toISOString(), ...result });
      this.store.save();
      return result;
    }
  }
  async execute(run) {
    if (this.running.has(`execution:${run.id}`)) return;
    this.running.add(`execution:${run.id}`);
    try {
      const steps = [
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
          { person: 'Sarah', message: 'Vincent will be there at 9 AM.' },
          'EXECUTING_RECOVERY',
          1100,
        ],
        ['refund.requested', { amount: 412 }, 'REFUND_REQUESTED', 1400],
        [
          'airline.offer_received',
          { credit: 450, originalFare: 412 },
          'COUNTERPARTY_RESPONSE',
          4500,
        ],
        ['offer.evaluated', evaluateOffer(), 'OFFER_EVALUATED', 3300],
        [
          'rebuttal.sent',
          {
            requested: 412,
            reason: 'Cash has greater value to Vincent. Please refund the original payment method.',
          },
          'REBUTTAL_SENT',
          4200,
        ],
        [
          'refund.confirmed',
          { amount: 412, method: 'original payment method' },
          'REBUTTAL_SENT',
          3600,
        ],
        [
          'exception.resolved',
          { humanDecisions: 1, meetingSaved: true, milesPreserved: 31000, refund: 412, net: 92 },
          'RESOLVED',
          2700,
        ],
      ];
      for (const [type, data, state, ms] of steps) {
        if (run.events.some((e) => e.type === type)) continue;
        await delay(ms * this.pace);
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
        const lifeCommands = {
          'booking.completed': 'CHARGE_BOOKING',
          'calendar.updated': 'UPDATE_CALENDAR',
          'sarah.notified': 'NOTIFY_SARAH',
          'refund.confirmed': 'CREDIT_REFUND',
        };
        if (lifeCommands[type]) lifeCommand(run, lifeCommands[type]);
        if (type === 'sarah.notified') await this.message(run, type);
        if (type === 'booking.completed') run.actions.booking = { status: 'completed', ...data };
        if (type === 'refund.confirmed') run.actions.refund = { status: 'completed', ...data };
        this.emit(run, type, data, state);
      }
    } finally {
      this.running.delete(`execution:${run.id}`);
    }
  }
  async resume() {
    for (const run of this.store.runs.values()) {
      if (run.mode === 'live' && run.decision.status === 'approved' && run.state !== 'RESOLVED')
        void this.execute(run);
      else if (
        run.mode === 'live' &&
        [
          'CANCELLATION_RECEIVED',
          'CONTEXT_LOADED',
          'OPTIONS_CALCULATED',
          'RECOMMENDATION_READY',
        ].includes(run.state)
      ) {
        void this.analyze(run);
      }
    }
  }
}
