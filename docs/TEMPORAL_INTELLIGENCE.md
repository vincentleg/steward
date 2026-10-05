# Temporal intelligence and outcome verification

This release extends the shared Steward product. Public `/` and `/sandbox` remain anonymous synthetic worlds; tracking parameters never select an identity or product version. Private connected mode remains local and Calendar read-only. Gmail and external writes remain disabled. The real proactive Calendar validation is **pending**.

## Product behavior

Change the world → Provider confirmation (synthetic) supports a confirmed receipt, a delayed receipt, or conflicting refund claims. Use Travel, Subscription, or Failed delivery. Approve the plan once. A request acknowledgment is not a receipt: Steward keeps the resolution open, watches its 20-minute synthetic confirmation window, and prepares a reversible evidence check if confirmation is late or contradictory. Introducing a synthetic cash receipt causes independent predicate verification before restoration. Advancing synthetic time affects only that visitor's world, never authentication expiry or another session.

The active resolution emphasizes expected versus observed evidence. Earlier analysis remains available in a disclosure. No additional approval is needed to watch or prepare internally. No real provider is contacted by these controls.

## Intelligence primitives

`temporal-truth.js` retains a bounded 200-fact evidence history with source, directness, observation time and optional validity interval. It preserves disagreements; newer direct observations can resolve older claims, while equal-time incompatible direct observations remain contradicted. Claims and inferences cannot verify an outcome. It supports explicit equality and bounded numeric outcome predicates, operational preparation/travel/arrival/setup windows, recovery availability, and feasible reversible planning.

An intended outcome is established before execution. Receipts are resolution-scoped. All predicates must pass before restoration; partial, missing, contradicted or failed evidence keeps the outcome open. Monitoring checks elapsed expectations on requests and the existing 30-second synthetic cleanup tick. Replanning currently prepares internal evidence-check alternatives; it does not execute external retries.

Private Calendar ingestion preserves minimized, encrypted owner-scoped temporal observations and expected/observed changes without additional calls or scopes. Operational start is computed only when buffers are known. Unknown priorities and travel time remain unknown.

The existing Living Core gains calm watching, evidence-conflict and adapting states. Deadline pressure changes contour spacing; conflicting evidence separates trajectories; verification uses a returning signal. Existing visibility throttling, 30-fps cap, mobile sizing and reduced-motion support remain.

## Verification and limits

Run `npm test`, `npm run test:e2e`, and `STEWARD_TEST_URL=<origin> node scripts/temporal-e2e.js`, plus existing public, mobile, Core and private-isolation regressions. Screenshots are synthetic and ignored under `.data/temporal-proof`.

Public worlds remain ephemeral (30-minute sessions; service restart loses them). Synthetic monitoring is not an always-on provider service. Real Calendar uses two-minute polling while the local server runs; its pending live validation is not replaced by fixtures. No new infrastructure, credentials, authority or spend is required.
