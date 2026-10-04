# Public cloud deployment (Phase 2.5)

Public URL: **https://steward-public.onrender.com**

Provider: Render Free web service, Hobby workspace, **no payment method on file** (confirmed by Vincent before provisioning). Do not use a workspace with a saved payment method: included bandwidth/build overages can be billed there. Without a payment method, Render suspends service/builds at free limits instead. Never upgrade, attach a disk/database or add a payment method as part of this deployment.

Official free-tier policy: https://render.com/docs/free

## Architecture

One Node 22 process runs `cloud-server.js`, which imports only the anonymous sandbox, generic core and synthetic travel capability. It never imports `server.js` or the AgentMail adapter. No private API, email approval route, private run data or credentials are exposed. Filesystem writes and external service calls are unnecessary for the public workflow.

Build: `npm ci --omit=dev`

Start: `node cloud-server.js`

Health: `/healthz` (only public status, no configuration or diagnostics).

Render supplies `PORT` and `RENDER_EXTERNAL_URL`. Configure `NODE_VERSION=22.20.0` and `NODE_ENV=production`. No secrets are required. Do not upload `.env`, AgentMail keys, the private approval destination, signing keys or `.data` files. Startup rejects private LIVE environment configuration.

Root redirects to `/sandbox`. Polling drives live desktop/mobile state. HTTPS terminates at Render. No tunnel or laptop is involved.

## Sessions and limits

Each visitor has a random UUID, a 256-bit bearer token, a synthetic context/world and independent workflow. Sessions live only in one process, expire after 30 minutes and are deleted from core memory on expiry. Cap: 150 sessions. Cloud creation requests have a global 120-per-10-minute limit; client-supplied proxy headers cannot bypass it. No analytics or PII collection.

Reload works within a browser tab using sessionStorage. Server restarts/redeploys/idle suspension discard anonymous sessions; start a new sandbox experience afterward. No persistent disk or production private-world database is provisioned.

Render Free sleeps after 15 minutes idle; first access can take about a minute. Its stable provider domain survives sleep. Warm the URL before a stage demonstration, keep local/tunnel/replay/video fallbacks, and never debug on stage. Free monthly allowance is 750 service hours per workspace; bandwidth/build limits may suspend service. This is a hackathon public sandbox, not a paid always-on production SLA.

## Redeploy and rollback

Deploy only the `phase-2-5-deployment` branch, with explicit `plan=free`, one instance, no automatic deploys and no preview services. `render.yaml` documents the configuration. Avoid creating a Blueprint that requests payment information; the CLI can create a Free web service directly.

Use the Render Dashboard or CLI to redeploy an explicitly verified commit. Roll back to a prior public-cloud deployment if needed; the private competition/core tags are not cloud entry points. Local fallback servers and the Cloudflare tunnel are independent and unchanged. `competition-ready-v4` and `phase-2-core-candidate` remain protected. Phase 2 data-format rollback instructions are in PHASE-2.md.

## Verification

Run `npm test` and `npm run test:e2e`, then:

```sh
PRODUCTION_URL=https://your-service.onrender.com node scripts/production-e2e.js
```

The production check exercises two independent desktop/mobile sessions, real backend browser approval, parallel recovery, voucher negotiation, cash refund, outcome verification, mid-run/completion reload, duplicate approval, malformed/oversized input, private-route denial and public-asset secret scanning. It creates no video.

Final external gate: open the stable URL on a physical iPhone over cellular, trigger the scenario and approve once. This public browser-approval gate is separate from the pending private AgentMail email/iPhone gate.

No Phase 3 features, final video or submission are included.

## Verified release evidence

Cloud application deployment: `c8d039c`, service `steward-public`, region Oregon. Render reported the deployment live. API service configuration verified `plan=free`, one instance, previews off, auto-deploy off. HTTP redirects to HTTPS. No payment method was added, no paid resource was provisioned, and no new monetary charge was incurred.

32 automated tests passed. All 10 browser regression tests passed. Actual production HTTPS E2E passed with simultaneous independent desktop and mobile sessions, backend approval, execution, voucher evaluation, rebuttal, $412 cash refund and verified restoration. Mid-workflow and completed reloads passed; duplicate approval produced one approval and one booking/refund. Cross-session bearer misuse, unauthorized session reads, private LIVE routes, arbitrary commands, malformed/oversized JSON and public-asset secret scanning passed. Evidence is stored privately in `.data/production-e2e.json`.

Physical iPhone on cellular: **manual gate pending**, not claimed tested. Open the URL, tap See Steward take over, approve once and wait for Outcome Restored.

Private AgentMail email/iPhone Phase 2 gate: still pending after the provider spam allowance restriction. Cloud deployment does not use AgentMail and does not change that gate.

All protected video hashes remain unchanged. Existing local servers/tunnel are retained. Fly state was untouched after the provider was ruled out. Phase 3 has not begun; no final video or hackathon submission was made.

The release checkpoint may include documentation commits after `c8d039c`; these do not alter the running application. To redeploy, explicitly select the checkpoint commit using the existing Free service. Do not create another service, switch plans, enable previews or add payment information.
