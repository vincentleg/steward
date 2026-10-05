# Steward data-flow inventory — product experience checkpoint

This is an implementation inventory, not legal certification. No credentials or real user examples are included.

| Boundary | Data | Storage / lifetime | Purpose / control |
| --- | --- | --- | --- |
| Anonymous browser → LifeEngine | Synthetic changes, rules, approval, observations | Server RAM, 30-minute session; tab sessionStorage holds bearer capability | Functional sandbox; reset, export, delete session |
| Permanent Demo → same LifeEngine | Separate seeded world, approval, delayed receipt, logical time | Independent server RAM world; demo bookmark in tab sessionStorage | Exit deletes Demo world and restores previous synthetic session; restart deletes/recreates |
| Browser → conversation projection | Public bearer or private session only | No conversation database; bounded projection of existing state | Evidence retrieval only; no actions or credentials projected |
| Conversation UI | Question text, last referenced evidence, up to eight exchanges | Page memory; cleared on close, reload, logout | Read-only explanation groundwork; no external model configured |
| Voice input | Microphone stream, browser recognition, editable transcript | No Recorder, audio file, upload endpoint or server retention | Explicit consent + browser permission; browser may remotely process audio; review before submission; stop streams on exit/background/error |
| Speech output abstraction | Future decoded speech buffer and amplitude | Transient AudioContext only | Disabled pending premium voice gate; no vendor or API configured |
| Private authentication | Login name, salted scrypt hash, user ID | Local SQLite; account retained until future account deletion | Local private development; session cookie HttpOnly/SameSite; 8-hour expiration; expired sessions cleaned; logout removes session and OAuth transactions |
| Google OAuth | App credentials, owner-bound OAuth transaction and tokens | App secrets in ignored environment; per-owner AES-GCM token records; transaction 10 minutes | Existing private Calendar only; single-use state/PKCE; no global user fallback |
| Calendar → observer | Primary calendar selected fields; rolling -24h/+60d, bounded 1,000 events | Encrypted owner records; bounded histories, no complete account duplication | Read-only two-minute polling; no attendees/organizers requested; no writes |
| Private export | Owner-scoped structured records and connection status | User-triggered downloaded JSON | Excludes account hashes, OAuth flows, credential records and tokens; downloaded file may contain private information |
| Disconnect | Provider record and OAuth generation | Deletes credentials locally, attempts revocation | Stops future owner ingestion; derived records deliberately remain |
| Delete connected data | Owner-scoped records | Removes active records after disconnect | Does not delete login/account; no forensic erasure or backup guarantee |
| Application logs | Startup status, bounded error codes | Process/infrastructure-dependent | No routine private bodies, tokens, passwords or world dumps |
| Render / browser processors | Network metadata, technical access logs; optional recognition audio | Processor-controlled | No promised zero metadata or application control over processor retention |

## Collection removed / tightened

* Expired private login-session rows are now purged on authentication checks.
* Demo exit/restart actively deletes the old synthetic world instead of only hiding it.
* Public session deletion actually stops resolutions and removes active server state.
* Conversation has no persistent identifier or transcript table and receives no provider credentials.
* No tracker, analytics SDK, advertising pipeline, external fonts or model requests were added.

## Remaining limits

Private data lacks a comprehensive automatic time-based retention policy. Record-count bounds are not retention durations. Account deletion, backup-erasure procedures, formal legal rights handling, verified operator/privacy contact, and legal review remain incomplete. SQLite deletion is not guaranteed secure erasure. Read-only Calendar polling validation remains **pending**. Private production accounts remain disabled. Open-ended synthesis is blocked by absent configured language inference; evidence retrieval is not marketed as a finished conversational intelligence. Premium speech is disabled rather than misrepresented as a consistent human-quality voice.

Privacy text in `public/privacy.js` must be updated whenever these boundaries change. Tests exercise public/private ownership, exports, logout, deletion, Demo isolation and absence of unexpected application network destinations; tests do not prove legal compliance or independently audit hosting infrastructure.
