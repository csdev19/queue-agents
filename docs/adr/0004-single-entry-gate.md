# ADR 0004: One entry gate — only `todo` runs, agents file into `backlog`

- **Status:** Proposed
- **Date:** 2026-10-07
- **Supersedes / Superseded by / Amends:** N/A
- **Implementation:** not started

## Context

On Linear, agents filed ideas and follow-ups fast enough to fill the workspace in a day. If
filing and executing are the same step, the runner spends the subscription on work nobody
chose. On Linear the gate was "Todo + agent label" because people and agents shared one
tracker; here every ticket is agent work.

## Decision

- A ticket runs only when its status is `todo` (and it has no `needs-info`). There is no agent
  label.
- Anything created through the agent API (`create_ticket`) lands in `backlog` with label `idea`,
  whoever the caller claims to be.
- Agents can move a ticket to `todo` only through `send_to_queue`, which Hermes calls when the
  user explicitly says so. `update_ticket` cannot change status.
- In the web app, tickets created in `auto` projects go straight to `todo`; in `needs-go`
  projects they go to `backlog`.

## Alternatives rejected

- Keep an "agent" label as a second key: redundant when the whole queue is agent work.
- Let Hermes create directly in `todo`: one token cannot prove the user asked for it.
- A triage step as the gate: useful later for specs, but it should not decide what runs.

## Consequences

- One more step ("send it") for ideas filed from Telegram.
- `send_to_queue` is the one agent-reachable path into execution; it must stay narrow.

## Non-goals

Spec quality checks or auto-triage (a later feature).

## Reopen when

The backlog grows faster than the owner sends tickets and real usage shows most agent-filed
tickets get sent unchanged.
