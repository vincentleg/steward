# Public Steward V2

**Implemented:** one context-scoped synthetic world, ten capability adapters, dependency traversal, constrained future ranking, browser approval, bounded action execution, simulated counterparties, refund negotiation, independent goal verification, and provenance-aware memory. The Constitution and action allowlist are server-owned.

The public entry point redirects to `/life`; `/sandbox` preserves the original travel experience. Private presentation routes and mail configuration remain outside the cloud server. `cloud-server.js` refuses private email credentials at startup.

## Runtime and boundaries

- `src/core/life-engine.js`: shared world and lifecycle; actions update cash, resources, commitments, purchases, or service state.
- `src/capabilities/life-library.js`: domain facts, alternatives, evidence, and operations. No browser-timer execution.
- `src/life-http.js`: random bearer-scoped anonymous worlds, bounded request bodies, origin checks, rate limits, expiry, safe errors.
- `public/life.*`: responsive home, capabilities, decisions, activity, controls, and Connection Center.
- `public/connections.js`: planned service catalog only. Connection buttons have no authorization URL and collect no credentials or personal data.

Worlds live in the existing Free Node service’s memory, expire after 30 minutes, and are cleared by server restart. Reload within a session restores state; there is no cross-device identity. A maximum of 150 worlds, 30 resolutions per world, and bounded event/action histories limit memory. Only one resolution executes at a time per world.

## Intelligence and limitations

Deterministic value weights, feasibility, reversibility, authority, arithmetic, and verification control behavior. Input interpretation is a small allowlisted grammar, not unrestricted natural language. Unknown statements do not change the world. Structured controls are the dependable alternative. No paid model/provider is needed.

Changing meeting importance, timing, budget, miles value, subscription usage, delivery urgency, calendar priority, or credit-use preference can change a recommendation. Unavailable hotel recovery is recorded as uncertainty and blocks a false trip all-clear. Changes during execution require stopping first; completed irreversible steps are not automatically rolled back.

Counterparty responses, routes, delivery times, eligibility, people, and money movement are simulated. No actual bank, merchant, calendar, airline, health, or home service is connected. Connection permissions are a product preview, not implemented OAuth or a partnership claim.

## Verification / release

`npm test` covers the core, old golden path, isolation, approval, malformed requests, authority, Constitution, changed decisions, memory, verification, and connection safety.

`npm run test:e2e` preserves the original browser suite.

`node scripts/v2-e2e.js` tests the V2 public journey locally on port 3503. Set `STEWARD_TEST_URL=https://steward-public.onrender.com` to test production. It exercises all ten capabilities, changed recommendations, world mutation, reload, autonomous recovery, connection sheets, two isolated worlds, private-route denial, and 390/393/430 px viewports.

Redeploy a reviewed Git commit to the existing Render Free service; never change its plan or create another resource. Roll back by redeploying `03e184e` (`presentation-email-ready`) or the protected `competition-final-product` tag. Existing presentation servers, tunnel support, and videos are unchanged.
