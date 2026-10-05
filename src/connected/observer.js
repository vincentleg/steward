import { createHash } from 'node:crypto';
import { recordObservation } from '../core/temporal-truth.js';
import { impactGraph, detectDeviation } from '../core/impact.js';
import { simulateFutures, rankFutures, compressDecision } from '../core/intelligence.js';
import { temporalConsequences, meaningfulChange } from '../core/outcome-intelligence.js';
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
    const timeMin = new Date(this.now() - 24 * 3600000).toISOString();
    const timeMax = new Date(this.now() + 60 * 24 * 3600000).toISOString();
    const baseline = connection.calendarWindowVersion === 1;
    for (let page = 0; page < 10; page++) {
      let result;
      try {
        result = await this.google.read(owner, 'calendar', 'calendars/primary/events', {
          maxResults: '100',
          timeMin,
          timeMax,
          singleEvents: 'true',
          showDeleted: 'true',
          orderBy: 'startTime',
          fields: 'items(id,status,summary,start,end,location,updated),nextPageToken,timeZone',
          ...(pageToken ? { pageToken } : {}),
        });
      } catch (error) {
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
        const previous = world.commitments;
        const relevant = (item) =>
          Date.parse(item.end?.dateTime || item.end?.date) > Date.parse(timeMin) &&
          Date.parse(item.start?.dateTime || item.start?.date) < Date.parse(timeMax);
        // Rolling bounded snapshots intentionally avoid syncToken: Google disallows combining it
        // with timeMin/timeMax. Missing entries are not asserted to be cancelled without evidence.
        world.commitments = [];
        world.calendarWindow = { timeMin, timeMax, mode: 'read-only', pollIntervalSeconds: 120 };
        world.calendarAnalysis = {
          changedEvents: 0,
          consequences: 0,
          humanDecisions: 0,
          externalActions: 0,
          evaluatedAt: new Date(this.now()).toISOString(),
        };
        const changes = [];
        const initializeTemporal = !world.observations;
        for (const item of items) {
          const old = previous.find((x) => x.id === item.id);
          const projected = {
            id: item.id,
            title: clean(item.summary),
            start:
              item.start?.dateTime ||
              item.start?.date ||
              (item.status === 'cancelled' ? old?.start : undefined),
            end:
              item.end?.dateTime ||
              item.end?.date ||
              (item.status === 'cancelled' ? old?.end : undefined),
            timeZone: item.start?.timeZone || null,
            status: item.status,
            location: clean(item.location),
            updated: item.updated,
            source: 'google-calendar',
            confidence: 1,
            importance: 'unknown',
          };
          if (
            !relevant(item) &&
            !(item.status === 'cancelled' && old && Date.parse(old.end) > Date.parse(timeMin))
          )
            continue;
          // Only owner-scoped, minimized Calendar facts enter the private temporal model.
          // This projection does not add provider calls, scopes, or any external action.
          for (const field of ['start', 'end', 'status', 'location']) {
            if (
              projected[field] === undefined ||
              (!initializeTemporal &&
                old &&
                old[field] === projected[field] &&
                old.updated === projected.updated)
            )
              continue;
            const id = `calendar-fact:${digest({ id: item.id, field, value: projected[field], updated: item.updated })}`;
            if (!world.observations?.some((f) => f.id === id))
              recordObservation(world, {
                id,
                entity: `commitment:${digest(item.id)}`,
                field,
                value: projected[field],
                source: 'google-calendar-primary',
                directness: 'direct',
                observedAt: world.calendarAnalysis.evaluatedAt,
                ...(item.updated ? { providerChangedAt: item.updated } : {}),
              });
          }
          if (baseline && old && digest(old) !== digest(projected)) {
            world.temporalChanges ||= [];
            world.temporalChanges.push({
              entity: item.id,
              source: 'google-calendar-primary',
              expected: {
                start: old.start,
                end: old.end,
                status: old.status,
                location: old.location,
              },
              observed: {
                start: projected.start,
                end: projected.end,
                status: projected.status,
                location: projected.location,
              },
              observedAt: world.calendarAnalysis.evaluatedAt,
              changedAt: item.updated || null,
              conclusion:
                'Direct Calendar observation changed; importance and external authority remain unchanged.',
            });
            world.temporalChanges = world.temporalChanges.slice(-30);
            this.event(
              owner,
              'calendar',
              item.id,
              item.status === 'cancelled' ? 'commitment.cancelled' : 'commitment.changed',
              projected,
            );
            changes.push(projected);
          }
          if (baseline && !old && item.status !== 'cancelled') {
            this.event(owner, 'calendar', item.id, 'commitment.created', projected);
            changes.push(projected);
          }
          if (item.status !== 'cancelled' && relevant(item)) world.commitments.push(projected);
        }
        if (baseline)
          for (const old of previous)
            if (
              Date.parse(old.end) > this.now() &&
              Date.parse(old.start) < Date.parse(timeMax) &&
              !items.some((item) => item.id === old.id)
            ) {
              this.event(owner, 'calendar', old.id, 'commitment.no_longer_in_window', {
                id: old.id,
                source: 'google-calendar',
                confidence: 0.7,
                evidence:
                  'Previously upcoming commitment no longer appears in the bounded primary-calendar snapshot',
              });
              changes.push({ id: old.id });
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
        world.temporalConsequences = temporalConsequences(
          world.commitments,
          world.commitmentAnnotations || {},
          this.now(),
        );
        world.changeAssessments = changes.map((change) => {
          const before = previous.find((c) => c.id === change.id);
          const after =
            world.commitments.find((c) => c.id === change.id) ||
            (change.status === 'cancelled' ? change : { status: 'not-observed' });
          return {
            providerEventId: change.id,
            ...meaningfulChange(
              before,
              after,
              world.temporalConsequences.filter((c) => c.from === change.id || c.to === change.id),
            ),
          };
        });
        world.calendarAnalysis.changedEvents = changes.length;
        world.calendarAnalysis.consequences = conflicts.length;
        world.calendarAnalysis.humanDecisions = conflicts.length ? 1 : 0;
        world.calendarAnalysis.conclusion = conflicts.length
          ? 'Overlapping commitments require your priority judgment. No external action taken.'
          : 'No overlapping commitments detected. No decision or external action needed.';
        world.calendarAssessments = world.calendarAssessments || [];
        for (const change of changes) {
          const contextId = world.context.id,
            sourceId = `observed:${digest(change.id)}`;
          const affected = [
            ...new Set([change.id, ...conflicts.filter((ids) => ids.includes(change.id)).flat()]),
          ];
          const nodes = [
            { id: sourceId, contextId },
            ...affected.map((id) => ({
              id: `commitment:${digest(id)}`,
              contextId,
              domain: 'time',
              providerEventId: id,
            })),
          ];
          const impacts = impactGraph({
            contextId,
            sourceId,
            nodes,
            edges: nodes.slice(1).map((node) => ({ from: sourceId, to: node.id })),
          });
          world.calendarAssessments.push({
            providerEventId: change.id,
            observedAt: world.calendarAnalysis.evaluatedAt,
            impacts,
            consequenceCount: impacts.nodes.length,
            humanDecisions: affected.length > 1 ? 1 : 0,
            mode: 'observe-only',
            externalActions: 0,
          });
          const id = `assessment:${change.id}:${digest(world.calendarAnalysis)}`;
          this.store.put(owner, 'activity', id, {
            type: 'calendar.consequences_evaluated',
            at: world.calendarAnalysis.evaluatedAt,
            decisionRequired: Boolean(conflicts.length),
            externalActions: 0,
          });
        }
        world.calendarAssessments = world.calendarAssessments.slice(-30);
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
          syncToken: null,
          calendarWindowVersion: 1,
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
