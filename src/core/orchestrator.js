import { authorize } from './constitution.js';
import { deviation } from './world.js';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export class OutcomeWorkflow {
  constructor(
    store,
    capability,
    {
      pace = 1,
      sendDecision = async () => ({ channel: 'local' }),
      communicate = async () => ({ channel: 'sandbox' }),
      onEvent = () => {},
    } = {},
  ) {
    this.store = store;
    this.capability = capability;
    this.pace = pace;
    this.sendDecision = sendDecision;
    this.communicate = communicate;
    this.onEvent = onEvent;
    this.running = new Set();
  }
  active(run) {
    return !run.stopped && (!run.expiresAt || Date.parse(run.expiresAt) > Date.now());
  }
  emit(run, type, data = {}, state) {
    const e = this.store.emit(run, type, data, state);
    this.onEvent(run, e);
    return e;
  }
  stop(run) {
    if (run.state === 'RESOLVED' || run.stopped) return;
    run.stopped = true;
    this.emit(run, 'workflow.stopped', { message: 'No further actions will execute.' }, 'STOPPED');
  }
  async analyze(run) {
    if (
      this.running.has(run.id) ||
      !['CALM', ...this.capability.analysisSteps.map((step) => step[2])].includes(run.state) ||
      !this.active(run)
    )
      return;
    this.running.add(run.id);
    try {
      for (const [type, data, state, ms] of this.capability.analysisSteps) {
        if (run.events.some((e) => e.type === type)) continue;
        await delay(ms * this.pace);
        if (!this.active(run)) return;
        authorize(this.capability.authority(type), run);
        if (type === 'decision.sent') {
          this.emit(run, type, { delivery: 'preparing' }, state);
          try {
            run.delivery = await this.sendDecision(run);
            this.emit(run, 'decision.delivery_updated', run.delivery);
          } catch {
            run.delivery = {
              channel: 'local',
              error: 'Approval email unavailable. Use the local approval link or replay.',
            };
            this.emit(run, 'decision.delivery_updated', run.delivery);
          }
        } else {
          this.capability.apply(run, type, data);
          if (type === this.capability.analysisSteps[0][0] && run.personalWorld) {
            run.deviation = deviation({ type }, run.personalWorld);
            run.personalWorld.observation = 'deviated';
          }
          this.emit(run, type, data, state);
        }
      }
    } finally {
      this.running.delete(run.id);
    }
  }
  approve(run, device = 'Browser') {
    if (!this.active(run)) throw Error('Run is no longer active');
    if (run.decision.status === 'approved') return { alreadyApproved: true };
    if (run.state !== 'WAITING_FOR_APPROVAL') throw Error('Decision is not awaiting approval');
    run.decision.status = 'approved';
    run.decision.approvedAt = new Date().toISOString();
    this.emit(
      run,
      'approval.received',
      { by: run.mode === 'public' ? 'You' : run.context.name, device },
      'APPROVED',
    );
    void this.execute(run).catch(() =>
      this.emit(run, 'workflow.error', {
        message: 'Recovery paused. Restart the server to resume safely.',
      }),
    );
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
    if (this.running.has(`execution:${run.id}`) || !this.active(run)) return;
    this.running.add(`execution:${run.id}`);
    try {
      for (const [type, data, state, ms] of this.capability.executionSteps(run)) {
        if (run.events.some((e) => e.type === type)) continue;
        await delay(ms * this.pace);
        if (!this.active(run)) return;
        const authority = authorize(this.capability.authority(type), run);
        this.capability.apply(run, type, data);
        if (this.capability.shouldCommunicate?.(type)) await this.message(run, type);
        if (type === this.capability.resolutionEvent) {
          run.outcome = this.capability.verify(run);
          this.emit(run, 'outcome.verified', run.outcome);
          if (!run.outcome.verified) throw Error('Outcome verification failed');
          if (run.personalWorld) {
            run.personalWorld.observation = 'stable';
            run.personalWorld.memory.push({
              kind: 'historical-observation',
              value: 'Authorized recovery verified',
              at: run.outcome.at,
            });
          }
        }
        this.emit(run, type, { ...data, authority: authority.level }, state);
      }
    } finally {
      this.running.delete(`execution:${run.id}`);
    }
  }
  async resume() {
    for (const run of this.store.runs.values()) {
      if (run.mode !== 'live' || !this.active(run)) continue;
      if (run.decision.status === 'approved' && run.state !== 'RESOLVED') void this.execute(run);
      else if (this.capability.analysisSteps.some((step) => step[2] === run.state))
        void this.analyze(run);
    }
  }
}
