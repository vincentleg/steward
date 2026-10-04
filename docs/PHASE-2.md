# Phase 2: Steward Core foundation

## Implemented

The protected rollback release is `competition-ready-v4` (`9c52854`). Phase 2 lives on `phase-2-core`; no Phase 3 UI redesign, capability expansion, billing, native app, or video work is included.

Before: generic orchestration and policy surrounded a per-run travel-shaped world, with implicit identity and a single history array.

After: `StewardCore` owns context-scoped worlds independently of the web surface. The existing travel capability supplies domain facts, inventory, simulator commands and verification predicates. Live runs share one seeded personal world. Replay and anonymous sessions have isolated worlds. Visitor expiry deletes their world. Run snapshots are compatibility views, not authority grants.

Core contracts exist for principal, representation context, authority grant, operational memory, explicit intended/observed deviation, dependency impact graph, future projection, deterministic multidimensional valuation, decision compression, temporal windows, and fail-closed outcome verification. Travel now uses generic future ranking, value estimates, impact graph and decision compression. Its existing event choreography is preserved.

World State includes identity, context, goals, commitments, resources, preferences, constraints, people, time, money, travel, purchases, benefits, rights, risks, counterparties, intended and observed state, active deviations/resolutions, bounded outcome history, memory and mandate reference. Unpopulated domain collections are extension points, not connected services.

Persistence uses one atomic version-2 JSON envelope containing runs and core worlds. Legacy run arrays are imported automatically; no event history or approval-signing key is replaced. Files are private local demo storage, not encrypted production storage. The private pre-migration snapshot is `.data/phase-2-baseline/runs.json`. A rollback to v4 must restore that array-format snapshot as well as checking out the protected tag; version 2 data cannot be read directly by v4.

Contexts support personal, professional and enterprise representation, explicit actor/principal/role/mandate/resource/timezone. Trusted code can attach separate contexts to one principal. There is no public context-creation or authority-grant endpoint. WeakMap bindings reject a run snapshot swapped into another representation.

Policy remains separate from capability intelligence and simulator hands. Execution checks the capability's allowlisted steps, context resources and gross authorized spending ceiling ($504, rather than $92 net). Human approval remains mandatory before booking. This ceiling is per action; simulator receipts enforce the current single-booking lifecycle. It is not a general cumulative-budget accounting system.

The immutable Constitution is server-owned. Message text cannot change policy. Authority grants are frozen and reject context mismatch, unauthorized resources/actions, prohibited operations, expired authority, overspending and unapproved consequential actions. Existing approval signatures, scanner-safe GET, idempotent POST, stop control, session isolation and gateway allowlist remain.

Memory distinguishes stable/temporary preferences, explicit rules, inferred tendencies, current constraints, observations, resolution and counterparty history. Entries carry context, provenance, confidence, evidence and optional expiry. Stable preferences and explicit rules require an explicit human/seed source. Verified outcomes record one bounded resolution-history entry, never an inferred permanent preference.

Verification requires nonempty unique evidence and catches unavailable/throwing predicates as failures. Completing actions is insufficient. Verified outcomes clear the run's active deviation/resolution and record history once; no claim of actual physical arrival is made by the sandbox.

## Architecturally supported, not a shipped product feature

Additional capabilities may share the same context-scoped core and reusable impact/simulation/time/value contracts. Professional/enterprise contexts are tested primitives, not authentication, RBAC, corporate credentials, approval chains or enterprise onboarding. Additional surfaces can consume the existing event/state contract; there is no native iPhone app, Face ID or device-held cryptographic authority.

Counterparty history has a memory category and world collection, not a CRM or learned negotiation model. The current world is synthetic. Intended/observed matching is explicit equality, not an unrestricted probabilistic world model. Cost-of-waiting and travel-window contracts are present; no events integration exists.

## Future phases only

Phase 3: design system and minimal multi-surface product experience. Phase 4: events/opportunity intelligence, including pending outcomes, optionality and dynamic replanning. Later: more life capabilities, explicit retention/deletion controls, encrypted storage, production authentication, cumulative budgets, richer verification and context administration.

One intelligence serves all future tiers; leverage and execution capacity may differ. No billing/paywalls implemented. Provider commission must not override user outcome valuation. No new sponsor integrations were added.

## Validation gate

Automated and browser regression evidence is recorded at the checkpoint. The public HTTPS sandbox was exercised without recording or modifying videos. Physical regression attempted real AgentMail delivery but the provider rejected the approval email as spam after its daily spam-flagged-message allowance was exhausted. Provider reset: October 4, 2026, 5:00 PM Pacific. No physical approval occurred in that attempt. Phase 2 must not be declared accepted until that real gate passes.

All protected videos remain fallback artifacts. No final submission video was created, replaced, optimized or finalized. No submission was made. Zero additional spend.

### Checkpoint evidence

- 30 automated tests passed, including the original 21 regressions and nine new foundation tests.
- Syntax and formatting checks passed.
- Configured AgentMail key and approval destination were absent from repository source/assets in the local secret scan.
- SHA-256 hashes of all five protected fallback videos matched the pre-phase snapshot.
- The real HTTPS public sandbox passed approval, execution, negotiation, verification and reload restoration with recording disabled.
- The first physical-iPhone regression stopped before approval because AgentMail rejected email delivery. Previous protected-release physical passes remain evidence for v4, not evidence for this development checkpoint.
- Final browser regression: all 10 tests passed (3.3 minutes), covering LIVE browser approval, replay, mobile, accessibility, performance, reload and anonymous isolation.

Phase status: development implementation checkpoint; **acceptance blocked on real physical-iPhone delivery/approval regression**. Do not advance to Phase 3 on the strength of browser approval alone.
