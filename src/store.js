import { EventStore } from './core/store.js';
import { travelCapability } from './capabilities/travel.js';
export class Store extends EventStore {
  constructor(path = '.data/runs.json') {
    super(path, {
      seed: (mode) => ({ capability: travelCapability.id, ...travelCapability.seed(mode) }),
    });
  }
}
