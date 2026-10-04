# Open-source audit

MIT license, pinned dependency lockfile, local fonts and licenses, reproducible Node setup, isolated test servers, synthetic public data, deterministic economics, architecture and privacy documentation are included. AgentMail is the only implemented sponsor integration. No Neon, Mastra, Kernel, Exa, Executor or assistant-ui integration is claimed.

## CodeRabbit status

Official `code-review` and `autofix` skills were installed and inspected. The trusted CodeRabbit CLI and GitHub CLI were not found. Public GitHub API checks found no CodeRabbit configuration and no pull requests or associated reviews. Therefore no CodeRabbit review ran and no findings are attributed to it. Setup was cut to preserve the main submission. This is not a CodeRabbit-integrated project.

The official [code-review skill](../.agents/skills/code-review/SKILL.md) says “Resolve the trusted CLI to a quoted canonical absolute path” and “proceed only on `authenticated: true`.” The CLI was unavailable, so no authenticated review could run. Skill installation alone is not integration. Manual engineering inspection and automated adversarial checks found and addressed interaction issues, including repeated entrance animation and missing drawer focus containment. Those are Steward’s own review results.

## Contributions

Keep changes small and capability-scoped. Preserve LIVE, public session isolation, replay, video fallback, deterministic recommendation and one-approval semantics. Run `npm test`, `npm run check`, `npm run format:check`, and `npm run test:e2e`. Never commit `.env`, `.data`, email recipients, tokens or service credentials. Synthetic test addresses are permitted.

Security reports should avoid publishing secrets or exploit instructions against real users. The demo intentionally provides no arbitrary command or URL execution. Production deployment needs authentication, transactional persistence and distributed abuse controls.

## CI template — not enabled

`docs/ci-example.yml` contains repeatable syntax, format, automated and browser checks without app credentials on standard Ubuntu hosted runners. [GitHub documents standard hosted runners as free for public repositories](https://docs.github.com/en/actions/reference/runners/github-hosted-runners). No paid runner or deployment is configured.

Publication of an active workflow was rejected because the existing Git credential lacks `workflow` scope. Rather than request broader credentials during competition, hosted CI was cut. The template is documentation only; no hosted CI run is claimed. The original local design checkpoint remains intact. The public release is a separate safe checkpoint with the same tested runtime and an optional template instead of a workflow.
