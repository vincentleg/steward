# Phase 6 — private development candidate

Public production is `8a2d5e5 / public-sandbox-canonical-v2`; `b98d0e4 / public-v2-1` remains protected. Connected mode is **not deployed or enabled**. No real Google integration has been verified. No new spending.

## One product, access-scoped routes

`/` enters `/sandbox`. `/sandbox`, `/sandbox?fbclid=...` and the `/life` compatibility alias serve the same public UI and shared engine, not different product generations. `/sandbox/travel` preserves the original travel fixture. Tracking parameters never select identity, state, version or authority.

`/account` is the private authenticated surface of the same product router, composed only by trusted server configuration. Production currently has no private surface attached: `/account` and its APIs return 404. The local connected harness attaches the owner-scoped private handler alongside the SAME public routes. Future approved releases update this one codebase and existing Render service. Private activation still requires durable storage and live security gates; this change enables no Google configuration.

## Implemented and locally tested

- Owner-scoped private surface, username/password accounts, scrypt password hashing, random opaque eight-hour sessions, hashed session storage, logout, Origin-checked mutations, rate limits, bounded bodies, generic errors and no-store responses.
- SQLite development persistence; database file mode 0600. Private records and OAuth credentials encrypted using AES-256-GCM with owner/type/object bound authenticated encryption. Session tokens remain server-owned HttpOnly cookies; Secure and `__Host-` prefix on HTTPS. No personal access/refresh tokens in environment variables or browser storage.
- Explicit owner-scoped worlds, events, memories, decisions, actions, notifications and activity. No connection fallback. Distinct real local accounts and shared-device logout tested.
- Google authorization-code adapter with PKCE, session-bound ten-minute single-use state, server-side exchange and refresh, granted-scope checks, fixed read endpoint allowlist and disconnect/revocation.
- Calendar primary-calendar rolling bounded snapshots (previous 24 hours through next 60 days), recurring instance expansion and bounded paging. Rolling snapshots deliberately do not combine time windows with Google sync tokens. Authorized commitments have source metadata, timestamps, confidence and unknown importance. Detected overlaps use the existing generic impact graph, deviation, future simulation, evaluation and decision compression. Unknown priorities require judgment; no provider edits occur.
- Gmail bounded last-seven-day query (at most 20 results per polling pass), subject metadata classification, message-ID deduplication and conservative confidence. No bodies retained, no external model calls, no email-based authority. Gmail events are watching items pending reliable resource matching, not verified resolutions.
- Private mobile account/connection/permissions/world/decision/activity surface, real local logout, disconnect and derived-data deletion. Google buttons remain disabled without application configuration.
- Owner-scoped internal reminder API with stable action IDs, conflicting-retry rejection, actual private World State mutation and storage re-query verification. This is an internal Steward action, **not** an external Google write or completion of the real external-action gate.
- Calendar-only two-minute polling while the private development process runs. The private view reads stored state every three seconds; this never triggers a provider sync. Gmail connection/polling is disabled during the observation-only Calendar test. This is not real-time push or reliable always-on production monitoring.

## Run private development

`node --env-file=.env scripts/connected-server.js`

Open `http://localhost:3406/account`. Create an account name (not an email) and password of at least 14 characters. Localhost HTTP is a development-only OAuth exception. Google requires the exact redirect URI below. The server binds loopback only.

`CONNECTION_ENCRYPTION_KEY` is a base64-encoded 32-byte application key. Keep it stable and private: losing it makes encrypted records unreadable. The generated local key is only in ignored `.env`. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are application credentials. Personal provider tokens belong exclusively in encrypted owner-scoped connection records. Do not put them in `.env`.

## Human Google configuration boundary

1. Enable **Google Calendar API** and **Gmail API** in a Google Cloud project. No paid API or billing account is needed for the intended private API tests; do not enable paid services.
2. Configure Google Auth Platform consent as **External / Testing**. Add two designated Google test users for the required A/B live tests.
3. Create an OAuth client of type **Web application**.
4. Authorized redirect URIs for initial local tests:
   - `http://localhost:3406/account/oauth/calendar/callback`
   - `http://localhost:3406/account/oauth/gmail/callback`
5. No authorized JavaScript origins are required: this is server-side authorization-code flow, not a browser token client.
6. Calendar request: `https://www.googleapis.com/auth/calendar.events.readonly`.
7. Gmail request: `https://www.googleapis.com/auth/gmail.readonly`. No sending or write scopes. Permissions are requested separately, on selecting the provider after account sign-in.
8. Obtain the application's client ID and client secret for `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Never obtain or paste personal access/refresh tokens manually.
9. Sensitive Calendar access and restricted Gmail access require legitimate Google verification before broad public availability. Gmail server-side restricted data access may require a security assessment. Testing authorization may expire after seven days. Do not bypass these requirements or purchase an assessment without authorization.
10. Future production callback URIs would be `https://steward-public.onrender.com/account/oauth/calendar/callback` and `/account/oauth/gmail/callback`, **but those routes are intentionally not enabled there**. Do not configure production connectivity until durable storage and all live acceptance gates pass.

Official references: [server OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Calendar synchronization](https://developers.google.com/workspace/calendar/api/guides/sync), [Gmail scope classifications](https://developers.google.com/workspace/gmail/api/auth/scopes).

## Blocked / not implemented

- Real Google application credentials and consent/test-user setup are unavailable. Calendar/Gmail adapter tests use fixtures, not live integrations.
- Production durable private storage has not been provisioned or verified. Render Free ephemeral SQLite would lose accounts and tokens. `connected-server.js` refuses Render execution; `cloud-server.js` is unchanged and imports no connected modules.
- No external writes, real-action execution/verification, web push, reliable cross-provider resource matching, or full connected resolution planner. Prepared alternative plans are not executed outcomes.
- No production signup, recovery, email identity verification, MFA, account deletion, key rotation or production retention automation. These are prerequisites for opening private accounts broadly.
- Connected data persists locally until explicit deletion. Disconnect removes credentials, cancels pending OAuth for that provider and stops future ingestion. Delete data requires disconnecting all providers first. Google token revocation can affect other grants for the same application; the UI exposes degraded sync if a remaining grant stops working.
- No real A/B Google-account tests, real Calendar change test, real Gmail arrival test or external action test has passed. Phase 6 is incomplete.

## Tests and rollback

`npm test`; `node scripts/connected-e2e.js`; `npm run test:e2e`; `STEWARD_TEST_URL=https://steward-public.onrender.com node scripts/v2-e2e.js`.

The first set verifies the private foundation locally; fixture adapters are explicitly named. The last verifies the unchanged public V2 product. Deploy only the latest release that has passed its public/private gates to the existing Render service. No production deployment changes are part of this candidate.
