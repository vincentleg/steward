import { createHash } from 'node:crypto';
import { impactGraph, detectDeviation } from '../core/impact.js';
import { simulateFutures, rankFutures, compressDecision } from '../core/intelligence.js';
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clean = (value, limit = 180) =>
  String(value || '')
    .replace(/[\x00-\x1f]/g, ' ')
    .slice(0, limit);
export class ConnectedObserver {
  constructor({ store, google, now = Date.now }) {
    Object.assign(this, { store, google, now });
    this.busy = new Set();
  }
  event(owner, provider, id, type, data, confidence = 1) {
    if (!this.store.connection(owner, provider)) throw Error('Owner connection required');
    const key = `${provider}:${id}:${digest(data)}`;
    if (this.store.get(owner, 'event', key)) return false;
    const value = {
      type,
      source: provider,
      observedAt: new Date(this.now()).toISOString(),
      confidence,
      data,
    };
    this.store.put(owner, 'event', key, value);
    this.store.put(owner, 'activity', key, { type, at: value.observedAt });
    return key;
  }
  async calendar(owner) {
    const connection = this.store.connection(owner, 'calendar');
    if (!connection) throw Error('Not connected');
    const items = [];
    let pageToken;
    let syncToken = connection.syncToken;
    for (let page = 0; page < 10; page++) {
      let result;
      try {
        result = await this.google.read(owner, 'calendar', 'calendars/primary/events', {
          maxResults: '100',
          ...(syncToken ? { syncToken } : {}),
          ...(pageToken ? { pageToken } : {}),
        });
      } catch (error) {
        if (error.status === 410 && syncToken) {
          syncToken = null;
          pageToken = null;
          continue;
        }
        throw error;
      }
      items.push(...(result.items || []));
      pageToken = result.nextPageToken;
      if (!pageToken) {
        const current = this.store.connection(owner, 'calendar');
        if (!current || current.id !== connection.id) throw Error('Connection revoked');
        const world = this.store.get(owner, 'world', 'connected') || {
          mode: 'connected',
          context: { id: `personal:${owner}`, principalId: owner, kind: 'personal' },
          intendedState: { overlappingCommitments: 0 },
          commitments: [],
          goals: [],
          constraints: [],
          memory: [],
        };
        if (!syncToken)
          world.commitments = world.commitments.filter((existing) =>
            items.some((item) => item.id === existing.id),
          );
        for (const item of items) {
          const projected = {
            id: item.id,
            title: clean(item.summary),
            start: item.start?.dateTime || item.start?.date,
            end: item.end?.dateTime || item.end?.date,
            timeZone: item.start?.timeZone || null,
            status: item.status,
            location: clean(item.location),
            updated: item.updated,
            source: 'google-calendar',
            confidence: 1,
            importance: 'unknown',
          };
          const old = world.commitments.find((x) => x.id === item.id);
          if (old && digest(old) !== digest(projected))
            this.event(
              owner,
              'calendar',
              item.id,
              item.status === 'cancelled' ? 'commitment.cancelled' : 'commitment.changed',
              projected,
            );
          if (!old && connection.lastSyncAt)
            this.event(owner, 'calendar', item.id, 'commitment.created', projected);
          world.commitments = world.commitments.filter((x) => x.id !== item.id);
          if (item.status !== 'cancelled') world.commitments.push(projected);
        }
        if (world.commitments.length > 1000) throw Error('Calendar exceeds private testing limit');
        const conflicts = [];
        const timed = world.commitments.filter(
          (x) => x.start?.includes('T') && x.end?.includes('T') && Date.parse(x.end) > this.now(),
        );
        for (let i = 0; i < timed.length; i++)
          for (let j = i + 1; j < timed.length; j++) {
            if (
              Date.parse(timed[i].start) < Date.parse(timed[j].end) &&
              Date.parse(timed[j].start) < Date.parse(timed[i].end)
            )
              conflicts.push([timed[i].id, timed[j].id]);
          }
        world.conflicts = conflicts;
        this.store.put(owner, 'world', 'connected', world);
        for (const ids of conflicts) {
          const id = digest(ids.sort());
          const contextId = world.context.id,
            sourceId = `change:${id}`;
          const nodes = [
            { id: sourceId, contextId },
            ...ids.map((eventId) => ({
              id: `commitment:${digest(eventId)}`,
              contextId,
              providerEventId: eventId,
              domain: 'time',
            })),
          ];
          const impacts = impactGraph({
            contextId,
            sourceId,
            nodes,
            edges: nodes.slice(1).map((node) => ({ from: sourceId, to: node.id })),
          });
          const deviation = detectDeviation({
            id,
            contextId,
            intended: { overlappingCommitments: 0 },
            observed: { overlappingCommitments: 1 },
            evidenceIds: ids,
          });
          const futures = simulateFutures(
            world,
            ids.map((eventId, index) => ({
              id: `preserve:${index}`,
              confidence: 0.5,
              reversibility: 'reversible',
              projected: { preserveCommitment: eventId, prepareRequestForOther: true },
              benefits: { commitments: 1 },
              assumptions: [
                'Commitment importance is unknown. No organizer response or availability is assumed.',
              ],
            })),
          );
          const evaluation = rankFutures(futures, {
            weights: { commitments: 1, reversibility: 1 },
          });
          const compression = compressDecision({
            impacts,
            futures,
            actions: [
              {
                id: 'choose-priority',
                allowed: false,
                requiresApproval: true,
                reason:
                  'Your commitment priorities are unknown; external updates are not authorized',
              },
            ],
          });
          this.store.put(owner, 'decision', id, {
            status: 'needs-you',
            type: 'calendar.conflict',
            commitments: ids,
            impacts,
            deviation,
            futures,
            evaluation,
            compression,
            evidence: 'Authorized event times overlap',
            action: 'Review commitments; no provider modification authorized',
          });
          this.store.put(owner, 'notification', id, {
            status: 'unread',
            title: '1 decision needs you',
            decisionId: id,
          });
        }
        for (const decision of this.store.list(owner, 'decision'))
          if (
            decision.type === 'calendar.conflict' &&
            !conflicts.some((ids) => digest([...ids].sort()) === decision.id)
          )
            this.store.put(owner, 'decision', decision.id, { ...decision, status: 'resolved' });
        this.store.connect(owner, 'calendar', {
          ...current,
          syncToken: result.nextSyncToken,
          lastSyncAt: new Date(this.now()).toISOString(),
          status: 'connected',
        });
        return;
      }
    }
    throw Error('Calendar sync exceeds bounded page limit');
  }
  async gmail(owner) {
    const connection = this.store.connection(owner, 'gmail');
    if (!connection) throw Error('Not connected');
    const result = await this.google.read(owner, 'gmail', 'messages', {
      maxResults: '20',
      q: 'newer_than:7d {cancelled canceled delayed renewal renewed refund waitlist accepted reservation delivery}',
    });
    for (const message of result.messages || []) {
      if (this.store.get(owner, 'memory', `gmail:${message.id}`)) continue;
      const item = await this.google.read(owner, 'gmail', `messages/${message.id}`, {
        format: 'metadata',
        metadataHeaders: 'Subject',
      });
      const subject = clean(
        item.payload?.headers?.find((x) => x.name.toLowerCase() === 'subject')?.value,
      );
      // Deterministic classification. No body storage, model calls, or execution based on email instructions.
      const rules = [
        [/flight.*(cancelled|canceled)/i, 'travel.flight.cancelled'],
        [/waitlist.*(accepted|cleared|promoted)/i, 'event.waitlist_promoted'],
        [/delivery.*(failed|delayed)/i, 'delivery.failed'],
        [/subscription.*renew/i, 'subscription.renewed'],
        [/refund.*denied/i, 'refund.denied'],
        [/reservation.*(changed|cancelled|canceled)/i, 'reservation.changed'],
      ];
      const type = rules.find(([pattern]) => pattern.test(subject))?.[1];
      if (type) {
        const key = this.event(
          owner,
          'gmail',
          message.id,
          type,
          {
            providerMessageId: message.id,
            interpretation: 'Subject indicates a possible change; resource match requires review',
          },
          0.65,
        );
        if (key)
          this.store.put(owner, 'decision', key, {
            type,
            status: 'watching',
            confidence: 0.65,
            evidence: 'Relevant authorized message metadata',
            action: 'Review source before consequential action',
          });
      }
      this.store.put(owner, 'memory', `gmail:${message.id}`, {
        category: 'historical-observation',
        source: 'gmail',
        processedAt: new Date(this.now()).toISOString(),
      });
    }
    const current = this.store.connection(owner, 'gmail');
    if (!current || current.id !== connection.id) throw Error('Connection revoked');
    this.store.connect(owner, 'gmail', {
      ...current,
      lastSyncAt: new Date(this.now()).toISOString(),
      status: 'connected',
    });
  }
  async sync(owner, provider) {
    const key = `${owner}:${provider}`;
    if (this.busy.has(key)) return false;
    this.busy.add(key);
    try {
      if (provider === 'calendar') await this.calendar(owner);
      else if (provider === 'gmail') await this.gmail(owner);
      else throw Error('Unknown provider');
      return true;
    } catch (error) {
      const current = this.store.connection(owner, provider);
      if (current) this.store.connect(owner, provider, { ...current, status: 'degraded' });
      throw error;
    } finally {
      this.busy.delete(key);
    }
  }
}
