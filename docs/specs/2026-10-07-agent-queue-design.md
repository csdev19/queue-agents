# Agent queue — product design (umbrella spec)

- **Status:** Proposed — nothing below is implemented yet. The repository contains only the
  `monorepo-template` scaffold (fullstack Convex pattern + docs site).
- **Date:** 2026-10-07
- **Backlog issue:** none yet (the GitHub repository does not exist yet)

## Summary (one minute)

A single-user, open-source ticket queue built for AI coding agents, deployed by each user to
their own Convex account. An always-on runner (built after the MVP) takes each ready ticket,
implements it in a git worktree and opens a pull request. The human's job shrinks to two
questions the UI answers instantly: "is the runner working right now?" and "what do I review
next?". The MVP is the queue itself (Convex), four list views, a stdio MCP server that agents
use to file and move tickets, the GitHub webhook, and a one-shot import from Linear. Linear
stays the queue until the MVP ships, through a shared protocol that makes the switch a
one-line MCP change.

| #   | Decision                                                                                             | Why                                                                                                                                                                                                                 | ADR                                          |
| --- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | Build an own queue on Convex instead of staying on Linear or adopting Vibe Kanban                    | Linear is priced and shaped for people (seat cost, issue cap, webhook relay); Vibe Kanban is board-first and manually dispatched. Realtime subscriptions and transactional mutations replace the relay and the lock | 0001 (new)                                   |
| 2   | Web login with Better Auth hosted inside Convex, one allowed email                                   | One deployment, no Postgres, matches the hub's Convex guidance; Convex Auth is heading to deprecation                                                                                                               | 0002 (new)                                   |
| 3   | Agents authenticate with a shared `AGENT_TOKEN` passed to agent-facing functions                     | Convex functions are public by default; a constant-time token check is the smallest boundary that works for MCP and runner                                                                                          | 0003 (new)                                   |
| 4   | One entry gate: only `todo` runs; anything an agent files lands in `backlog`                         | Agent noise filled Linear in a day; the gate keeps execution a human decision                                                                                                                                       | 0004 (new)                                   |
| 5   | MCP server over stdio, talking to Convex through `ConvexHttpClient`                                  | Works in Claude Code, Codex and Hermes today with no hosting; remote HTTP MCP stays an option                                                                                                                       | 0005 (new)                                   |
| 6   | The runner is a long-lived process subscribed to Convex; no webhook relay                            | A subscription replaces Worker + Queue + pull; retires `linear-webhook`                                                                                                                                             | 0006 (new, Proposed until the runner exists) |
| 7   | Lists, never a board; review is an ordered inbox                                                     | The one moment that matters is "next PR to review"; a board spreads it across columns                                                                                                                               | — (spec line)                                |
| 8   | Keep the template's DDD split, thinly: pure rules in `packages/domain`, Convex functions as adapters | Status transitions, claim eligibility and review ordering get unit tests without Convex; `application` and `infra-db` go away                                                                                       | reuses hub `stacks/fullstack-convex`         |
| 9   | Keep the Starlight docs site for user-facing docs (deploy, MCP setup); design lives in `docs/`       | The site is what an open-source user reads; specs and ADRs are for maintainers                                                                                                                                      | —                                            |

## Open questions

1. **Does `m` (mark done) merge the PR?** Default: no. `m` marks the ticket `done` locally;
   merging stays in GitHub (`o` opens it). The merge webhook would set `done` anyway.
2. **Web login method.** Default: email + password, sign-up allowed only for `ALLOWED_EMAIL`.
   GitHub OAuth is nicer but needs an OAuth app per deployment.
3. **Are function arguments (the agent token) visible in Convex dashboard logs?** Unverified.
   If they are, move the token to an `Authorization` header on HTTP actions (see the
   [queue core spec](./2026-10-07-queue-core-design.md#agent-auth)).
4. **Is the Linear import worth building?** Default: yes, but it is the last MVP milestone and
   can be dropped if fewer than ~30 open tickets remain after archiving.
5. **Vibe Kanban check.** Before M1, spend one hour running Vibe Kanban against one repo. If its
   MCP plus review flow covers most of the need, reopen ADR 0001 before building the queue.

## Out of scope (MVP)

Multiple users, roles, email notifications, sprints and cycles, estimates, charts, mobile app,
board view, triage agent (spec generation), the runner itself, Hermes/Telegram behavior,
subscription-budget accounting. The runner and Hermes have their own specs so the queue's
contract with them is fixed now; they are built after the MVP.

## Failures this must protect against

- Two runners (or two calls of one runner) claim the same ticket.
- A ticket an agent filed starts running without a human sending it to `todo`.
- An unauthenticated caller reads or writes tickets (public Convex functions without checks).
- A forged GitHub webhook moves a ticket to `done`.
- A webhook for a branch with no matching key, or a repo with no matching project, crashes or
  corrupts another ticket instead of being ignored.
- The heartbeat invalidates every ticket list subscription once a minute.
- A runner dies silently and the UI keeps saying "working".
- The import runs twice and duplicates tickets.
- Requesting changes loses the reviewer's comment or creates a new branch instead of reusing
  the existing one.

## Milestones

| Milestone                    | Delivers                                                                                                           | Spec                                                             | Plan                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------- |
| M0 Foundation                | Template example removed, auth swapped to Better Auth in Convex, README/CLAUDE.md/docs site rewritten, GitHub repo | [web auth](./2026-10-07-web-auth-design.md)                      | [m0](../plans/2026-10-07-m0-foundation.md)               |
| M1 Queue core                | Schema, domain rules, functions, agent token, cron, seed, tests                                                    | [queue core](./2026-10-07-queue-core-design.md)                  | [m1](../plans/2026-10-07-m1-queue-core.md)               |
| M2 MCP server                | `packages/mcp` with the seven tools, setup docs                                                                    | [MCP](./2026-10-07-mcp-server-design.md)                         | [m2](../plans/2026-10-07-m2-mcp-server.md)               |
| M3 Web app                   | Runner strip, four views, detail panel, keyboard, palette                                                          | [web app](./2026-10-07-web-app-design.md)                        | [m3](../plans/2026-10-07-m3-web-app.md)                  |
| M4 GitHub                    | Signed webhook HTTP action, PR and CI state                                                                        | [GitHub](./2026-10-07-github-integration-design.md)              | [m4](../plans/2026-10-07-m4-github-integration.md)       |
| M5 Linear bridge and cutover | `queue-protocol` skill now, import script and switch at the end                                                    | [Linear bridge](./2026-10-07-linear-bridge-and-import-design.md) | [m5](../plans/2026-10-07-m5-linear-bridge-and-import.md) |
| M6 Runner (post-MVP)         | Long-lived runner, worktrees, Claude Code headless, heartbeat                                                      | [runner](./2026-10-07-runner-design.md)                          | [m6](../plans/2026-10-07-m6-runner.md)                   |

Order: M0 → M1 → M2 → M3 → M4 → M5 (cutover). The bridge half of M5 (the shared protocol
skill on Linear) can start in parallel with M0, because it does not depend on this repo's code.
M6 starts after the cutover. MCP comes before UI so agents can file and move tickets from day
one.

## Architecture

```
            ┌──────────── Convex deployment (user's own account) ─────────────┐
 Web app ──▶│ Better Auth (/api/auth/*)   queries/mutations   crons           │
 (TanStack  │ tickets · projects · events · runs · runnerState                │
  Start)    │ HTTP action POST /github ◀───────────── GitHub webhooks         │
            └───────▲───────────────────────────▲─────────────────────────────┘
                    │ ConvexHttpClient           │ ConvexClient (subscription)
               MCP server (stdio)            Runner (post-MVP, on Hermes host)
            Claude Code · Codex · Hermes      worktree → claude -p → gh pr create
```

- **Queue (Convex):** source of truth for tickets, states, events and runner status.
- **Runner:** a process with no conversation. Claims, works, heartbeats.
- **Hermes:** remote control over Telegram, using the same MCP as every other agent.
- **Web app:** see progress and review from the laptop.

Context never lives in a chat: the queue holds _what_, `runnerState` holds _right now_, each
repository's `AGENTS.md` holds _how_.

## Sources and unverified claims

- The concept document "Cola de agentes — concepto, MVP y prompts" (2026-10-07) is the input;
  its intent is processed into this spec and the sub-specs, not copied.
- State of the art checked on 2026-10-07:
  [Vibe Kanban](https://virtuslab.com/blog/ai/vibe-kanban/) (open source, worktrees, MCP
  server, board UI; [cloud since Feb 2026](https://vibekanban.com/blog/introducing-vibe-kanban-cloud)),
  [Claude Code Routines](https://www.implicator.ai/anthropic-ships-claude-code-routines-cloud-automations-that-run-without-your-mac/)
  (cloud agents on schedule/HTTP/GitHub triggers, research preview since 2026-04-14),
  [Better Auth Convex component](https://www.convex.dev/components/better-auth).
- Convex free plan: 1M function calls/month, 0.5 GiB storage
  ([convex.dev/plans](https://www.convex.dev/plans)). The concept doc's estimate of ~130k
  calls/month is plausible (heartbeat at 1/min ≈ 43k/month plus the cron at 1/5 min ≈ 8.6k)
  but **unmeasured**; M1 adds a note to re-check usage after a week of real traffic.
- "Convex Auth may be deprecated in favor of Better Auth" is a community report, not an
  official announcement — ADR 0002 does not depend on it.
- Hub guidance reused: `stacks/fullstack-convex.md`, `convex/better-auth.md`,
  `convex/client-connection.md`, `conventions/adr-pattern.md`,
  `conventions/backlog-and-roadmap.md`.
