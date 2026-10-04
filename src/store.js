import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { context, evaluateRecovery } from './domain.js';
export class Store {
  constructor(path = '.data/runs.json') {
    this.path = path;
    this.runs = new Map();
    if (path) {
      mkdirSync(path.slice(0, path.lastIndexOf('/')) || '.', { recursive: true });
      try {
        this.runs = new Map(JSON.parse(readFileSync(path, 'utf8')).map((r) => [r.id, r]));
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
    }
  }
  save() {
    if (this.path) {
      writeFileSync(`${this.path}.tmp`, JSON.stringify([...this.runs.values()]));
      renameSync(`${this.path}.tmp`, this.path);
    }
  }
  create(mode = 'live') {
    const run = {
      id: randomUUID(),
      mode,
      state: 'CALM',
      createdAt: new Date().toISOString(),
      context,
      decision: { ...evaluateRecovery(), status: 'pending' },
      events: [],
      actions: {},
      messages: [],
    };
    this.runs.set(run.id, run);
    this.save();
    return run;
  }
  emit(run, type, data = {}, state = run.state) {
    const event = {
      id: `${run.id}:${run.events.length + 1}`,
      sequence: run.events.length + 1,
      type,
      at: new Date().toISOString(),
      data,
    };
    run.events.push(event);
    run.state = state;
    this.save();
    return event;
  }
}
