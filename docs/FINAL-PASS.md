# Final product, design and competition pass

Release tag: `competition-ready-v4`. Local design checkpoint: `design-ready-v3`. Protected checkpoints: `demo-ready-v2` and `golden-live-v1`.

## Implemented

- Porcelain, ink and restrained cobalt replace the green/black identity. A central zero, quiet context rows and one primary action replace the busier calm screen.
- Impact Graph, three futures, one decision, execution lanes, counteroffer value comparison, verification and return to calm remain backend-driven.
- Ongoing scene updates no longer restart entrance animations. Rounded decision surfaces and responsive type improve hierarchy without added effects.
- Constitution and evidence drawers have accessible dialog names, focus containment, Escape, inert background and focus restoration. Touch targets and reduced motion are supported.
- Final milestone tally derives from actual events. No invented action count is displayed.
- Private LIVE server now binds localhost by default; the existing allowlisted HTTPS gateway is unchanged. Containers explicitly configure their bind host.
- Public QR poster uses the new palette. Anonymous session creation, browser approval, isolation, expiry, stop and negotiation are preserved.
- Generic architecture, representation-context boundaries, multi-surface direction, product tiers, design rationale, contribution guidance, limitations and submission checklist are documented.
- A read-only CI template is documented. Hosted CI was cut because the existing Git credential lacks workflow permission; no hosted run is claimed.

## Tested

- 21 automated tests passed, including invalid/tampered/expired/wrong-decision approval, idempotent approvals, persisted recovery, provider failure, policy immutability, stop, failed verification, duplicate tools, malicious mail/counterparty text, malformed public inputs, expiry and cross-session isolation.
- 10 browser tests cover two phone-sized approvals with desktop continuation; replay and replay after completion; responsive layout; anonymous desktop/iPhone isolation; stop; keyboard focus; axe scans; reduced motion; and bounded local assets/DOM/layout shift, and restoration of a stopped run before its cancellation event. Browser approvals do not substitute for the separate physical-device tests.
- Two consecutive physical-iPhone LIVE flows passed after the new localhost binding. AgentMail delivery → iPhone approval → autonomous desktop execution → negotiation → verified $412 cash refund → reload restoration. Both approvals supplied iPhone metadata.
- Actual public HTTPS flow passed browser approval, counteroffer negotiation, independent verification and reload restoration with no email adapter.
- Gateway reachability checked: sandbox and QR poster 200; private run API and environment-file paths 404.
- Syntax and formatting checks passed. Protected videos are unchanged. Configured personal email/API key scans are clean in release files and Git history.

Automated axe checks cover sampled states and common WCAG A/AA issues; this is not a complete accessibility or legal compliance certification. The performance check bounds initial assets below 750 KB, DOM below 250 elements and initial CLS below 0.1, with no third-party app requests. This is not a production latency benchmark.

## Demo / preview

The airline, booking, money, Sarah and calendar are synthetic. Travel is the only deeply functional capability. Purchases, benefits and home are labeled concepts. Communication uses AgentMail-generated sandbox cancellation messages, not a real airline inbox webhook. No real purchase or payment occurs. The economic recommendation is deterministic, not an LLM prediction.

## Future architecture

Personal/professional/enterprise representation, scoped identity/resources/authority, RBAC and delegated approvals, device-bound authority, native iPhone/Watch/Mac surfaces, more connectors, richer memory and Free/Premium/Pro/Enterprise capacity are directions only. No pricing system, native application or enterprise permission system was built.

## CodeRabbit / open source / sponsors

Official CodeRabbit skills installed; no trusted CLI or authenticated review available, no configuration/PR review history found, and no CodeRabbit review ran. See `OPEN-SOURCE.md` for the exact skill requirement. Manual engineering findings fixed scene flicker, drawer focus and private LAN exposure. MIT license, README, architecture/privacy/security documentation, contribution instructions and repeatable tests are present.

AgentMail is the only implemented sponsor integration. Cloudflare Quick Tunnel supplies the free temporary gateway. No sponsor-only additions, new paid services, purchases, upgrades or auto-top-ups were introduced. Best UI readiness improved through simpler hierarchy and stronger choreography; no award result is claimed.

## Final video

Use **`docs/submission-candidate.mp4` — 150.9 seconds (2:31)**. Full video/audio decoding passed; sampled timeline frames were inspected; mean audio −16.2 dB and peak −1.4 dB. Narration uses local macOS synthetic speech. Approval footage is explicitly public/browser sandbox. Separately verified physical-iPhone LIVE behavior is stated honestly, without fabricated phone footage.

Protected fallback: `docs/submission-demo.mp4` (150.6 seconds). Original stage fallback: `docs/replay.webm`. Both remain byte-for-byte unchanged.

## Remaining limits and operations

Keep the laptop, private server, public sandbox, phone gateway and free tunnel running. The URL is temporary. Public sessions are memory-only, capped at 150 and expire after 30 minutes; rate-limiting source metadata expires after ten minutes. Private storage is single-process disk persistence. Production authentication, transactional/distributed storage and broader connectors remain unimplemented.

Use `DEMO.md` for the exact stage launch and pitch. Use `SUBMISSION-CHECKLIST.md` for the exact upload checklist. The hackathon destination and submission receipt are still unavailable; no upload is claimed.
