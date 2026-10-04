// Compatibility entry point: today's flight story is a capability, not the core.
import { OutcomeWorkflow } from './core/orchestrator.js';
import { travelCapability } from './capabilities/travel.js';
export { analysisSteps } from './capabilities/travel.js';
export class Workflow extends OutcomeWorkflow {
  constructor(store, options = {}) {
    super(store, travelCapability, options);
  }
}
