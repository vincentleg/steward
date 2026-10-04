import { StewardCore } from './steward.js';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
export class EventStore {
  constructor(path = null, { seed } = {}) {
    if (typeof seed !== 'function') throw Error('A capability seed is required');
    this.seed = seed;
    this.path = path;
    this.runs = new Map();
    this.core = new StewardCore();
    if (path) {
      mkdirSync(path.slice(0, path.lastIndexOf('/')) || '.', { recursive: true });
      try {
        const snapshot = JSON.parse(readFileSync(path, 'utf8'));
        const runs = Array.isArray(snapshot) ? snapshot : snapshot.runs;
        if (!Array.isArray(runs)) throw Error('Malformed persisted state');
        this.runs = new Map(runs.map((r) => [r.id, r]));
        this.core = new StewardCore(Array.isArray(snapshot) ? {} : snapshot.core);
      } catch (e) {
        if (e.code !== 'ENOENT') throw e;
      }
    }
    for (const run of this.runs.values()) this.core.attach(run);
  }
  save() {
    if (this.path) {
      writeFileSync(
        `${this.path}.tmp`,
        JSON.stringify({ version: 2, runs: [...this.runs.values()], core: this.core.snapshot() }),
        { mode: 0o600 },
      );
      renameSync(`${this.path}.tmp`, this.path);
    }
  }
  create(mode = 'live') {
    const run = {
      id: randomUUID(),
      mode,
      state: 'CALM',
      createdAt: new Date().toISOString(),
      ...this.seed(mode),
      events: [],
      actions: {},
      messages: [],
    };
    this.core.attach(run);
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
    this.core.observe(run, event);
    run.events.push(event);
    run.state = state;
    this.save();
    return event;
  }
}
