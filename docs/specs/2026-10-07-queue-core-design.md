# Queue core — data model, rules and functions

- **Status:** Proposed — not implemented.
- **Date:** 2026-10-07
- **Parent:** [agent queue umbrella spec](./2026-10-07-agent-queue-design.md)
- **Plan:** [M1 queue core](../plans/2026-10-07-m1-queue-core.md)

## Summary (one minute)

Five Convex tables hold everything: `projects`, `tickets`, `events`, `runs`, `runnerState`.
The rules that decide what may happen — status transitions, which ticket a runner may claim in
which mode, how the review inbox is ordered, how a ticket key is formed — are pure functions in
`packages/domain`, unit-tested without Convex. Convex functions are thin adapters: authenticate,
load, call the rule, write, append an event. Every write that changes a ticket's status appends
an `events` row. Agent-facing functions require `AGENT_TOKEN`; web functions require the
allowed user.

| #   | Decision                                                                            | Why                                                                                                                      | ADR                                  |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| 1   | Status is one of six values; exceptions are labels                                  | Keeps views as simple index queries; matches the Linear habit                                                            | —                                    |
| 2   | Priority 0 (urgent) to 4 (none), lower runs first                                   | Matches the concept doc ("changes" → priority 0)                                                                         | —                                    |
| 3   | Ticket keys are `<PROJECT_KEY>-<n>`, a per-project counter on `projects.nextNumber` | Sequential per project, readable in branch names; the counter increments inside the create mutation so it cannot collide | —                                    |
| 4   | `todo` itself is the execution gate; no "agent" label                               | In an agent-only queue every `todo` is for the runner; the label existed only because Linear mixed people and agents     | 0004                                 |
| 5   | Anything created through the agent API lands in `backlog` with label `idea`         | Agents cannot put work in front of the runner                                                                            | 0004                                 |
| 6   | `runnerState` is a separate table                                                   | Heartbeats rewrite it every minute without invalidating ticket subscriptions                                             | —                                    |
| 7   | Agent auth is a token argument checked in constant time                             | Smallest boundary that works over `ConvexHttpClient`                                                                     | 0003                                 |
| 8   | Missing `size` counts as `m`                                                        | Without triage, an unsized ticket must not slip into day mode                                                            | —                                    |
| 9   | Pure rules in `packages/domain`; `packages/application` and `infra-db` are removed  | Testable rules without a Convex test harness; Convex replaces repositories                                               | reuses hub `stacks/fullstack-convex` |

## Open questions

1. Are function arguments logged in the Convex dashboard? If yes, the agent token moves to an
   HTTP-action `Authorization` header ([Agent auth](#agent-auth)). Verify in M1, step 1.
2. Should `stuck` also show tickets `in_progress` whose runner is `hung`? Default: yes, as a
   second section of the view.

## Out of scope

Full-text search UI beyond the search index, attachments, sub-tickets, relations between
tickets, history of field edits other than status, multi-runner scheduling fairness.

## Failures this must protect against

- Double claim: two concurrent `claimNext` calls return the same ticket.
- `claimNext` in day mode returns an `m`, `l` or unsized ticket.
- An agent-token call creates a ticket in `todo`, or moves one to `todo` other than through
  `sendToQueue`.
- A ticket moves through an illegal transition (e.g. `backlog` → `done`, `done` → `todo`).
- A wrong or missing token, or a signed-in user whose email is not `ALLOWED_EMAIL`, gets data.
- Two tickets created at once in the same project get the same key.
- `hung` detection flags a runner that is `idle` or `paused`.

## Data model (`packages/convex-api/convex/schema.ts`)

| Table         | Fields                                                                                                                                                                                                                                                                                                                                                                                   | Indexes                                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects`    | `key` (e.g. `NIW`), `name`, `repoPath` (path on the runner host), `repoSlug` (`owner/name`, matches webhooks), `defaultBranch`, `testCommand`, `autonomy` (`auto` \| `needs-go`), `nextNumber`, `linearId?`                                                                                                                                                                              | `by_key`, `by_repo_slug`, `by_linear_id`                                                                                                                      |
| `tickets`     | `key`, `number`, `projectId`, `title`, `body`, `spec?`, `status`, `priority` (0–4), `labels[]`, `size?` (`s`\|`m`\|`l`), `branch?`, `prUrl?`, `prNumber?`, `prState?` (`open`\|`draft`\|`merged`\|`closed`), `ciState?` (`pending`\|`success`\|`failure`), `additions?`, `deletions?`, `createdBy` (`me`\|`hermes`\|`agent`), `claimedBy?`, `claimedAt?`, `statusChangedAt`, `linearId?` | `by_status_priority` (`status`, `priority`), `by_project`, `by_key`, `by_branch`, `by_linear_id`; search index `search_title` on `title` with filter `status` |
| `events`      | `ticketId`, `type` (`comment`\|`status`\|`agent`\|`github`), `actor` (`me`\|`hermes`\|`agent`\|`runner:<id>`\|`github`), `body`, `createdAt`                                                                                                                                                                                                                                             | `by_ticket` (`ticketId`, `createdAt`)                                                                                                                         |
| `runs`        | `ticketId`, `attempt`, `model`, `startedAt`, `endedAt?`, `outcome?` (`pr_opened`\|`failed`\|`needs_info`\|`aborted`), `summary?`, `logPath?`                                                                                                                                                                                                                                             | `by_ticket`                                                                                                                                                   |
| `runnerState` | `runnerId`, `status` (`idle`\|`working`\|`paused`\|`rate_limited`\|`hung`), `ticketId?`, `step?`, `mode` (`day`\|`night`), `lastHeartbeat`, `rateLimitResetsAt?`                                                                                                                                                                                                                         | `by_runner_id`, `by_status`                                                                                                                                   |

Labels in use: `idea`, `needs-info`, `agent-failed`, `changes`. Labels are free strings; the
domain package exports these four as constants (hub `enums-as-const`).

Note on search: Convex search indexes cover one text field. Searching `body` too needs a second
index or a concatenated `searchText` field; default is title only, revisit with real use.

## Domain rules (`packages/domain`)

### Status transitions

| From → To                   | Who may                                                               | Side effects                               |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| `backlog` → `todo`          | web user; agent only via `sendToQueue`                                | removes `idea`                             |
| `todo` → `in_progress`      | runner via `claimNext` only                                           | sets `claimedBy`, `claimedAt`              |
| `in_progress` → `in_review` | GitHub webhook (PR opened); runner as fallback                        | —                                          |
| `in_progress` → `todo`      | runner (release on abort), cron (hung runner released by user action) | clears claim                               |
| `in_progress` → `backlog`   | runner on `agent-failed` or `needs-info`                              | adds the label, clears claim               |
| `in_review` → `done`        | GitHub webhook (merged); web user (`m`)                               | —                                          |
| `in_review` → `todo`        | web user (`c`, request changes)                                       | adds `changes`, priority 0, keeps `branch` |
| any non-final → `canceled`  | web user (`x`); agent via `update_ticket` is **not** allowed          | —                                          |
| `backlog`/`todo` ↔ edits    | anyone authenticated                                                  | —                                          |

`done` and `canceled` are final. Every transition is checked by
`canTransition(from, to, actor)` in the domain package and appends an `events` row of type
`status`.

`needs-info` answered: the web user removes the label and sends the ticket back to `todo`.

### Claim eligibility

`isClaimable(ticket, mode)`: `status === "todo"` and no `needs-info` label, and
`mode === "night"` or `(size ?? "m") === "s"`.

Ordering of the claim: `changes` first (rework beats new work), then `priority` ascending, then
`statusChangedAt` ascending.

### Review ordering

`compareForReview(a, b)`: `ciState === "success"` first, then `pending`, then `failure` or
missing; then `additions + deletions` ascending (missing counts as large); then
`statusChangedAt` ascending (oldest waits first).

### Keys

`formatKey(projectKey, n)` → `NIW-123`. `parseKeyFromBranch(ref)` matches
`^([A-Za-z][A-Za-z0-9]*-\d+)` at the start of the branch name and upper-cases it.
`branchName(key, title)` → `niw-123-short-slug` (lower-case, ≤ 50 chars).

## Functions (`packages/convex-api/convex/`)

Files group by audience so the auth boundary is visible in the file name.

| File                              | Functions                                                                                                                                                    | Auth          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| `web/tickets.ts`                  | `reviewQueue`, `queue`, `stuck`, `backlog`, `counts`, `get`, `create`, `update`, `setStatus`, `requestChanges`, `markDone`, `cancel`, `addComment`, `search` | allowed user  |
| `web/projects.ts`                 | `list`, `create`, `update`                                                                                                                                   | allowed user  |
| `web/runner.ts`                   | `status`, `pause`, `resume`                                                                                                                                  | allowed user  |
| `agent/projects.ts`               | `list`                                                                                                                                                       | `AGENT_TOKEN` |
| `agent/tickets.ts`                | `create`, `list`, `get`, `update`, `addComment`, `sendToQueue`                                                                                               | `AGENT_TOKEN` |
| `agent/runner.ts`                 | `nextClaimable` (query the runner subscribes to), `claimNext`, `heartbeat`, `startRun`, `finishRun`, `release`, `status`                                     | `AGENT_TOKEN` |
| `agent/import.ts`                 | `upsertProject`, `upsertTicket` (M5; may set any status, keyed by `linearId`)                                                                                | `AGENT_TOKEN` |
| `crons.ts` + `internal/runner.ts` | `markHungRunners` every 5 min                                                                                                                                | internal      |
| `lib/auth.ts`                     | `requireUser(ctx)`, `requireAgent(token)`                                                                                                                    | —             |

Views as queries:

- `reviewQueue`: `in_review` via `by_status_priority`, sorted in memory with
  `compareForReview` (the list is small by construction).
- `queue`: `todo`, ordered as the claim order.
- `stuck`: `backlog` tickets labeled `needs-info` or `agent-failed`, plus tickets
  `in_progress` claimed by a `hung` runner.
- `backlog`: `backlog` without `needs-info`/`agent-failed`.
- `counts`: the four numbers for the sidebar.

`claimNext(token, runnerId, mode)`: one mutation; reads `todo` tickets in claim order, takes the
first `isClaimable`, patches `in_progress` + claim fields, appends an event, sets
`runnerState.ticketId`. Convex mutations are serializable transactions with optimistic
concurrency, so two concurrent calls cannot both commit the same patch; the loser retries and
sees the ticket gone.

`heartbeat(token, runnerId, status, ticketId?, step?, mode)`: upserts `runnerState` only.

`markHungRunners` (internal, cron every 5 min): `status === "working"` and `lastHeartbeat`
older than 10 min → `hung`, plus a `status` event on the claimed ticket. It does not release
the ticket; the user decides from the stuck view.

### Agent auth

`requireAgent(token)` compares against `process.env.AGENT_TOKEN` with a constant-time
comparison (equal-length buffers, XOR loop) and throws a generic error. No agent function is
reachable without it, including reads.

Fallback if arguments turn out to be logged: expose the agent API as HTTP actions under
`/agent/*` with `Authorization: Bearer`, calling internal functions. The MCP and runner then
use `fetch` instead of `ConvexHttpClient` for writes and keep `ConvexClient` subscriptions
behind a short-lived query token. Decide in M1 step 1; ADR 0003 records the outcome.

## Seed and tests

- `scripts/seed.ts` (or a Convex internal mutation `internal/seed:run`) creates two projects and
  a dozen tickets covering every view.
- `packages/domain`: unit tests for every rule above (Vitest).
- `packages/convex-api`: `convex-test` + Vitest for `claimNext` (no double claim, mode filter),
  auth on both audiences, the agent `todo` gate, key uniqueness, `markHungRunners`.
