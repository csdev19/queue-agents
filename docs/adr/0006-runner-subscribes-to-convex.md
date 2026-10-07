# ADR 0006: The runner is a long-lived process subscribed to Convex; no webhook relay

- **Status:** Proposed (the runner is post-MVP)
- **Date:** 2026-10-07
- **Supersedes / Superseded by / Amends:** N/A
- **Implementation:** not started; `linear-webhook` remains in use for the Linear bridge only

## Context

With Linear as the queue, change notifications needed a chain: Linear webhook → Cloudflare
Worker (signature, classification) → Cloudflare Queue → Hermes pulling over HTTP. With the
queue in Convex, a client can subscribe to a query and be pushed every change.

## Decision

The runner is a Bun service on the Hermes host that subscribes with `ConvexClient` to
`agent/runner:nextClaimable(mode)` and calls the `claimNext` mutation when a ticket appears. It
heartbeats every minute; a Convex cron marks it `hung` after 10 minutes of silence. No Worker,
Queue or polling. The `linear-webhook` repository is frozen and retired at cutover.

## Alternatives rejected

- Keep a webhook relay pointed at Convex: three moving parts to do what a subscription does.
- Polling every N seconds: wasted calls against the free-plan budget and added latency.
- Run the runner as Claude Code Routines: no local repos/secrets, research preview, and the
  queue would still need a trigger.

## Consequences

- The runner needs a persistent websocket; network drops must reconnect (the Convex client
  handles this) and the runner must re-check after reconnecting.
- Heartbeats are the main load on the free plan (≈43k calls/month at 1/min).

## Non-goals

Multiple runners coordinating schedules, cloud execution.

## Reopen when

The host cannot hold a persistent connection, or the runner moves to a cloud product that only
accepts triggers.
