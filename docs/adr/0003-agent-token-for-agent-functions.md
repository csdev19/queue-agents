# ADR 0003: Agents authenticate with a shared AGENT_TOKEN

- **Status:** Proposed
- **Date:** 2026-10-07
- **Supersedes / Superseded by / Amends:** N/A
- **Implementation:** not started

## Context

Convex public functions are reachable by anyone who knows the deployment URL. The MCP server and
the runner are processes, not browser users; giving them a Better Auth session would mean
storing and refreshing a cookie or JWT in each.

## Decision

Agent-facing functions live under `convex/agent/` and take a `token` argument compared in
constant time with the `AGENT_TOKEN` deployment variable. Every agent function, including
reads, calls `requireAgent` first. Web functions never accept the token.

Verification step (M1, before any agent function): check whether Convex logs function
arguments in the dashboard. If it does, switch to HTTP actions under `/agent/*` with an
`Authorization: Bearer` header calling internal functions, and amend this ADR.

## Alternatives rejected

- A Better Auth session per agent: refresh logic in every client for no added safety in a
  single-user deployment.
- Convex deploy keys: grant admin over the deployment, far more than queue access.
- Unauthenticated agent functions with an obscure URL: the URL is not a secret.

## Consequences

- One secret to rotate; all agents share it, so the event `actor` is self-declared
  (`hermes`/`agent`/`runner:<id>`), not proven.
- Rotation means updating the Convex variable and each agent's env.

## Non-goals

Per-agent permissions, audit-grade attribution.

## Reopen when

Arguments are found in logs (switch to headers), a second human user appears, or attribution
between agents needs to be trusted.
