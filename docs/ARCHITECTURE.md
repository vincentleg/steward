# One Steward Core, many capabilities and surfaces

## Implemented

`src/core` owns Personal World State, goals, commitments, resources, preferences, constraints, historical observations, the immutable Constitution, deterministic authority checks, orchestration and outcome verification. `src/capabilities/travel.js` instantiates the core with one bounded world. A non-travel resource recovery test uses the same orchestrator, demonstrating that travel is not its fundamental abstraction.

Brain selects from deterministic futures and personal value evidence. Policy validates explicit authority. Hands execute allowlisted, typed-by-convention sandbox commands with stable receipts. Unknown tools are denied. Counterparty text is data; there is no text-to-command interpreter. Completed actions do not establish restored outcomes: independent checks inspect actual synthetic resource state.

The web UI, email approval page, real iPhone approval and replay consume one event schema. Private LIVE runs persist on disk. Public sessions run in a separate memory-only service without mail capabilities; bearer authorization, synthetic identity and 30-minute expiry isolate visitors. The public gateway only forwards approved paths. The private server binds loopback by default; exposing its unrestricted API directly is not the public deployment model. Public sandbox and Vincent LIVE intentionally have separate stores and approval mechanisms.

There is no LLM dependency on the critical path. Future models, search, browser workers and provider adapters can be replaced without transferring policy authority to them.

## Future architecture — not implemented

Every delegated operation should bind an immutable representation context:

| Boundary | Required scope |
| --- | --- |
| Identity | represented principal and acting role |
| Resources | named payment methods, balances and credentials |
| Data | context-owned world state and memory |
| Authority | policy version, action allowlist and approved budget |
| Counterparties | authorized recipients and institutions |
| Audit | principal, role, decision, action and verification receipts |

Personal, professional and enterprise are different representation contexts. A personal approval must never authorize company spending, and an employer mandate must never expose personal data. Context switching changes authority explicitly, not through an inferred role. Enterprise would add RBAC, delegation, approval chains and organizational auditability; none are claimed today.

One intelligence can eventually appear on web, Mac, iPhone, watch, email and voice. The iPhone should be a decision and authority device, with device-bound approval, temporary limits and stop controls. Today’s signed email link proves cross-surface continuation; it does not implement Face ID, device cryptographic keys or a native application. “The device holds authority” is a direction, not a current security claim.

Memory should distinguish explicit stable preferences, temporary preferences, rules, current constraints and historical observations. One approved option must not silently become a permanent rule. Current memory only records verified historical outcomes.

## Product and economics — future positioning

Free gets the intelligence; premium gets more leverage. A future free product should retain the core world model, Constitution and useful outcome recovery. Premium expands frequency, connectors, monitoring depth, memory, simultaneous resolutions, compute and execution capacity. Pro can support professional contexts; enterprise adds delegated organization authority. No pricing, paid tier or multi-domain service is implemented.

Provider neutrality is essential: commissions must not change the optimization target away from the represented person. Potential business models monetize execution and resolution, rather than advice. Subscription, recovery fees and transaction economics remain hypotheses.

## Phase 2 core foundation

The development architecture now has a persistent, context-scoped `StewardCore`, generic future/value/impact/memory/time contracts, and explicit principal/authority boundaries. See [PHASE-2.md](PHASE-2.md) for implemented behavior, migration and rollback instructions, validation status and future-only capabilities. The protected competition release remains independently recoverable.
