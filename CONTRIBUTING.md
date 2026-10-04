# Contributing to Steward

Use Node 22+, `npm ci`, then `npm start`. The fixed synthetic scenario works without credentials. The real phone path uses server-only environment configuration. For anonymous sessions, start `npm run sandbox` and open its `/sandbox` path. See the README for the public gateway.

Preserve the one-decision approval gate, deterministic recommendation, outcome checks, public session isolation, stop and idempotency. Put domain behavior in capabilities, never in the generic orchestration or policy layer. Do not introduce a chat interface or duplicate disconnected intelligence for another domain.

Before contributing, run:

```sh
npm test
npm run check
npm run format:check
npm run test:e2e
```

Browser tests launch isolated synthetic servers with empty mail configuration. They do not send real email. macOS narration and video-generation scripts are optional, not prerequisites for testing.

Never commit `.env`, `.data`, tokens, private logs or real personal email addresses. Report only concise evidence, actions and conclusions; do not expose hidden model reasoning. Keep external content separate from policy and executable commands. Do not add paid infrastructure or unbounded integrations to the demo.

Changes should include a concrete problem, resulting behavior, verification, and relevant limits. Accessibility scans supplement keyboard and device testing; they are not a complete compliance audit. New providers need accurate README integration status and a graceful fallback.
