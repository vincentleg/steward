import { authorityGrant, checkAuthority } from './authority.js';
import { principal, representationContext, scopeKey, assertContext } from './identity.js';
import { personalWorld } from './world.js';
import { appendMemory, memoryEntry } from './memory.js';
import { copy, safeData } from './contracts.js';

/** One context-scoped intelligence shared by surfaces; capabilities supply domain facts. */
export class StewardCore {
  constructor(snapshot = {}) {
    this.worlds = new Map(snapshot.worlds || []);
    this.bindings = new WeakMap();
  }
  snapshot() {
    return { version: 1, worlds: [...this.worlds] };
  }
  attach(run, trustedRepresentation = null) {
    const isolated = run.mode !== 'live';
    const suffix = isolated ? run.id : 'default';
    const identity = trustedRepresentation
      ? principal(trustedRepresentation.identity)
      : principal({ id: `person:${suffix}`, name: 'Synthetic principal' });
    const context = representationContext(
      trustedRepresentation?.context || {
        id: `personal:${suffix}`,
        principalId: identity.id,
        mandateId: `mandate:${suffix}`,
        resourceIds: (run.personalWorld?.resources || []).map((r) => r.id),
        timeZone: 'America/Los_Angeles',
        ephemeral: isolated,
      },
    );
    if (context.principalId !== identity.id) throw Error('Principal representation mismatch');
    const key = scopeKey(context);
    if (!this.worlds.has(key)) {
      this.worlds.set(key, personalWorld({ ...run.personalWorld, identity, context }));
    }
    this.bindings.set(run, context);
    run.representation = copy(context);
    run.personalWorld = copy(this.worlds.get(key));
    return this.worlds.get(key);
  }
  contribute(run, contribution) {
    const world = this.world(run);
    const allowed = [
      'people',
      'time',
      'money',
      'travel',
      'purchases',
      'benefits',
      'rights',
      'risks',
      'counterparties',
      'observedState',
    ];
    const data = safeData(contribution);
    for (const key of Object.keys(data))
      if (!allowed.includes(key))
        throw Error('World contribution cannot alter mandate or preferences');
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'observedState' && !Array.isArray(value))
        throw Error('Invalid domain collection');
      world[key] = copy(value);
    }
  }
  authorize(run, capability, type, action) {
    const world = this.world(run);
    const allowed = [
      ...capability.analysisSteps.map((s) => s[0]),
      ...capability.executionSteps(run).map((s) => s[0]),
    ];
    const grant = authorityGrant({
      id: world.context.mandateId,
      context: world.context,
      actionIds: allowed,
      resourceIds: world.context.resourceIds,
      spendingLimit: capability.authorization?.spendingLimit || 0,
    });
    return checkAuthority(
      {
        ...action,
        id: type,
        cost: capability.authorization?.costs?.[type] || 0,
        currency: 'USD',
        resourceIds: world.context.resourceIds,
      },
      world.context,
      grant,
      { approved: run.decision.status === 'approved' },
    );
  }
  world(run) {
    const binding = this.bindings.get(run);
    if (!binding) throw Error('Unbound representation');
    assertContext(run.representation, binding);
    const world = this.worlds.get(scopeKey(binding));
    if (!world) throw Error('World unavailable');
    assertContext(run.representation, world.context);
    return world;
  }
  observe(run, event) {
    const world = this.world(run);
    world.observedState.lastEvent = { type: event.type, at: event.at, runId: run.id };
    if (run.deviation && run.deviation.status !== 'resolved') {
      world.observation = 'deviated';
      world.activeDeviations = world.activeDeviations.filter((d) => d.runId !== run.id);
      world.activeDeviations.push({ ...copy(run.deviation), runId: run.id });
      if (!world.activeResolutions.some((r) => r.id === run.id))
        world.activeResolutions.push({ id: run.id, capability: run.capability, status: 'active' });
    }
    if (event.type === 'outcome.verified' && run.outcome?.verified) {
      if (run.deviation) run.deviation.status = 'resolved';
      if (!world.outcomeHistory.some((o) => o.runId === run.id)) {
        world.outcomeHistory.push({ runId: run.id, ...copy(run.outcome) });
        world.outcomeHistory = world.outcomeHistory.slice(-100);
        appendMemory(
          world,
          memoryEntry({
            id: `outcome:${run.id}`,
            contextId: world.context.id,
            kind: 'resolution-history',
            value: { capability: run.capability, verified: true },
            source: { type: 'verification', id: run.id },
            evidenceIds: run.outcome.evidence.map((e) => e.id),
          }),
        );
      }
      world.activeDeviations = world.activeDeviations.filter((d) => d.runId !== run.id);
      world.activeResolutions = world.activeResolutions.filter((r) => r.id !== run.id);
      world.observation = world.activeDeviations.length ? 'deviated' : 'stable';
    }
    run.personalWorld = copy(world);
  }
  forget(run) {
    if (run.representation?.ephemeral) this.worlds.delete(scopeKey(run.representation));
  }
}
