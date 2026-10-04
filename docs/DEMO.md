# Stage runbook

## Before walking on stage

1. Start one server with `npm start`; use the same deployed instance for desktop and phone.
2. Open the desktop at 1440×900 or larger. Reset to calm. Hide browser UI if desired.
3. Verify `/api/health`: mail and public approval should both be true for real email.
4. Run physical phone email approval twice, each ending in `$412 CASH REFUNDED`. Browser emulation alone does not satisfy this gate.
5. Keep Vincent’s mail app open and notifications enabled. Charge the phone.
6. Keep `docs/replay.webm` ready in a player. It is a silent replay capture, not the submission video.
7. Rehearse **Replay** / Shift+R. Never debug on stage.

## Two-minute pitch

**0:00–0:15 — Calm**

“When your flight is cancelled, the airline emails you a problem. It should email your agent instead. This is Steward: the operations team for your life.”

**0:15 — Select See Steward take over**

“One cancelled flight isn’t one problem. It’s six: travel, calendar, people, money, rewards, and rights.”

**0:25 — Bloom collapses**

“Steward turns six consequences into three options, and one decision. The free flight misses my meeting. Using miles burns $560 of December value to save $92. This flight gets me home tonight for $92 net.”

**0:40 — Phone**

Approve on the actual phone. Put it down. Do not touch the laptop.

“One approval. And now Steward does the work.”

**0:50 — Execution lanes**

“It books the flight, protects the meeting, updates Sarah, and requests the refund. Then it keeps watching.”

**1:05 — Voucher counteroffer**

“But agents shouldn’t just act. They should know when something that looks better… isn’t. $450 credit is airline-locked, expiring, and unlikely to get used. For me, $412 cash wins. Steward rejects the credit without asking me to negotiate.”

**1:20 — Resolved**

“Home tonight. Meeting saved. Miles preserved. Cash returned. One human decision.”

**1:30 — Expand Live proof briefly**

“The world is sandboxed. The agent isn’t. Every approval and action is a real backend event. Here’s the durable log.”

**1:40–2:00 — Close**

“We start with travel disruption. Then refunds, renewals, bills, benefits: every economic exception that steals your time. Companies have operations teams. People have hold music. Steward is the operations team for your life.”

## If live stalls

Click **Replay** or press Shift+R immediately. It creates a fresh deterministic run and uses the same components and event schema. Approval is clearly labeled simulated. Say: “We have the same workflow recorded in a deterministic safety mode.” If the server itself is unavailable, play `docs/replay.webm`.

Reset only resets the display. Previously approved work continues safely. Reload restores the selected run; restarting the server resumes interrupted approved recoveries from action receipts.

## Honest Q&A

- **Real?** Backend workflow, decision math, persistence, signed approval and desktop continuation. AgentMail communication is real when configured.
- **Simulated?** Airline inventory, booking, payments, Sarah, calendar, voucher and refund. No real money moves.
- **LLM?** No LLM on the critical path. The narrow world uses explicit constraints and value calculations; autonomy comes from completing the responsibility after approval.
- **Sponsors?** AgentMail SDK. No claimed Neon/Mastra/Kernel/Exa integration.
- **Next?** Transactional persistence, broader policy evidence, tool-provider connectors and tighter authorization policies.
