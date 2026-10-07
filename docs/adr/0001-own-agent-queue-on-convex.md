# ADR 0001: Own agent queue on Convex instead of Linear or Vibe Kanban

- **Status:** Proposed
- **Date:** 2026-10-07
- **Supersedes / Superseded by / Amends:** N/A
- **Implementation:** not started (scaffold only)

## Context

The owner runs coding agents at a pace no human tracker is built for: one day of agent work
filled Linear's free issue cap (~250 issues). Linear charges per seat for people who do not
exist here, and reacting to its changes needs a webhook relay (`linear-webhook`: Worker +
Queue + HTTP pull). What the owner needs that no tracker has: the runner's live state, specs as
the entry gate, review as an ordered inbox, and a subscription budget (day/night modes).

Prior art checked on 2026-10-07: Vibe Kanban (open source, worktrees per attempt, MCP server,
board UI, local SQLite or a team cloud since Feb 2026) and Claude Code Routines (cloud agents
on schedule/HTTP/GitHub triggers, research preview).

## Decision

Build a single-user, open-source queue whose backend is Convex, deployed by each user into
their own Convex account. Convex query subscriptions replace the webhook relay; Convex
mutations (serializable transactions) provide the claim lock. The product's value lives in the
opinionated flow (gate, runner state, review inbox), not in the infrastructure.

## Alternatives rejected

- Stay on Linear (+ relay): keeps the issue cap, seat cost and a relay to operate.
- Adopt Vibe Kanban and write only a runner: board-first and manually dispatched per attempt;
  no remote control surface for an always-on runner.
- GitHub Issues + Projects: no live runner state, and issue noise lands in public repos.
- Claude Code Routines as the whole system: no queue, no review inbox, cloud-only execution.

## Consequences

- Owning a small app (schema, auth, UI, webhooks); estimated 1–2 days for the MVP.
- Data lives in a hosted Convex deployment; the hub's `convex/convex-exit-strategy.md` applies.
- Free-plan limits (1M calls/month, 0.5 GiB) bound the design: no transcripts in Convex.

## Non-goals

A general-purpose tracker, multi-user collaboration, or a SaaS.

## Reopen when

A one-hour trial shows Vibe Kanban (or an Anthropic product) covering the gate, review inbox and
live runner state; or after 30 days the runner does not close tickets unattended and the owner
is back in Linear.
