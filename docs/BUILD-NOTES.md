# Build decisions

- Repository started empty; Node 22.20 is available. No sponsor credentials were configured at audit time.
- Custom consumer UI, small Node HTTP server, local atomic JSON persistence. One server process owns each deployment's disk.
- Deterministic constraints and economic comparisons; no LLM needed for arithmetic or authority decisions.
- Backend pacing makes the work legible; frontend timers only poll state. Booking and refund transitions are allowlisted sandbox commands.
- Official AgentMail skills installed and SDK signatures verified. Existing inbox reused. Delivery requires credentials, recipient and public HTTPS URL.
- Neon/Mastra/Kernel/Exa omitted to protect reliability and time. No unused sponsor claims.
- UI and phone approval are browser tested. Browser emulation is not a physical phone or email deliverability test.
- Deployment needs a persistent disk and a public HTTPS origin. Real-phone verification remains a required gate before calling the live demo stage-ready.
