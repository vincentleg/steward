# Demo-ready checkpoint

Feature freeze: October 4, 2026.

Steward is a personal outcome recovery system. Travel is its one fully implemented capability. The general core owns world state, authority, approval, orchestration and verification.

## Evidence

- 19 automated tests passed: deterministic economics, approval validation, persistence/resumption, idempotency, mail failure, generic non-travel orchestration, immutable policy, stop, failed verification, anonymous isolation, malformed input, expiry and rate limiting.
- 6 browser tests passed: two independent mobile approvals with desktop continuation, replay, responsive layout, two isolated public sessions and stop.
- Two consecutive physical-iPhone LIVE flows passed again after the core refactor. Each delivered a real approval email, received iPhone approval metadata, continued without laptop intervention, negotiated the voucher, verified one booking/payment/refund, and restored the desktop after reload.
- Actual public HTTPS sandbox completed browser approval, negotiation, independent outcome verification and reload restoration. Its service has no email adapter.
- Source/documentation/artifact scan found no configured private email or API key.
- Original golden replay remains byte-for-byte identical. `golden-live-v1` retains the previous verified source.
- Submission MP4: 150.6 seconds, H.264/AAC, full decoding passed; audio mean −16.2 dB, peak −1.3 dB. Local synthetic narration. Approval footage is explicitly PUBLIC/SANDBOX; separately verified LIVE physical-phone evidence is stated, not reenacted.

## Deliverables

- `docs/submission-demo.mp4`: complete narrated submission cut.
- `docs/public-demo.webm`: complete public HTTPS capture.
- `docs/replay.webm`: untouched original emergency fallback.
- `docs/DEMO.md`: stage script and fallback procedure.
- `docs/VIDEO.md`: editing and recording notes.
- `/sandbox/share`: QR poster on the running temporary public HTTPS origin.

## Intentionally cut

Additional domain workflows, foundation-model theater, browser/search integrations, sponsor-only integrations, authentication/onboarding and paid deployment. Purchases, benefits and home are clearly labeled concept signals. No real booking or money movement. No new monetary charge.

## Operational limits

Keep the laptop, three local services and free tunnel running. The public URL is temporary. Public synthetic sessions are memory-only, expire after 30 minutes, and are capped at 150 concurrent sessions. Rate limiting is bounded in-process, not production distributed abuse protection. Private LIVE persistence targets a single process.

Submission upload remains pending the actual external submission destination. Before stage, test HTTPS reachability, keep the phone charged, and switch to replay within 3–5 seconds of a visible stall. Never debug on stage.
