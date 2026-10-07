# Linear bridge and import — keep working now, switch in one place later

- **Status:** Proposed — not implemented.
- **Date:** 2026-10-07
- **Parent:** [agent queue umbrella spec](./2026-10-07-agent-queue-design.md)
- **Plan:** [M5 Linear bridge and import](../plans/2026-10-07-m5-linear-bridge-and-import.md)

## Summary (one minute)

Until the MVP ships, Linear stays the queue. Hermes, Claude Code and Codex all connect to the
official Linear MCP (`https://mcp.linear.app/mcp`) and load one shared skill,
`queue-protocol`, that defines the queue's rules and names its operations exactly like the
future MCP tools. At cutover, `scripts/import-linear.ts` copies projects and open tickets into
Convex (idempotent via `linearId`), the skill's operation table is switched to the
`queue` MCP, and the Linear relay Worker is turned off.

| #   | Decision                                                         | Why                                                                        | ADR  |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------------- | ---- |
| 1   | One protocol skill, operations named after the future MCP tools  | The switch becomes a table edit in one file, not re-teaching three agents  | —    |
| 2   | The skill lives in this repo at `skills/queue-protocol/SKILL.md` | It versions with the MCP it targets; installable into each agent from here | —    |
| 3   | `linear-webhook` is frozen: no new work on it                    | It disappears when the runner subscribes to Convex                         | 0006 |
| 4   | Import maps Linear "In Progress" to `backlog` + `needs-info`     | Re-queueing could double work; a human decides                             | —    |
| 5   | Archive Done/Canceled in Linear now to stay under the issue cap  | Archived issues stay searchable and restorable                             | —    |

## Open questions

1. The Linear team key(s) and label names in use today (`NIW2`, labels `hermes`/`claude`,
   `needs-info`, `changes`, per `linear-webhook/src/config.ts`). Default: read them from that
   file when writing the skill.
2. Do Linear projects map one-to-one to repositories? Default: yes; projects without a repo get
   an empty `repoPath`/`repoSlug` the user fills in the web app.

## Out of scope

Two-way sync, importing comments history beyond the description, importing archived issues,
attachments.

## Failures this must protect against

- Running the import twice duplicates projects or tickets.
- An imported ticket lands in `todo` and the (future) runner starts it unexpectedly — import
  `todo` only for Linear issues that were Todo **and** carried an agent label.
- Key collisions: imported tickets keep Linear's identifier number only if the project counter
  is advanced past the highest imported number.

## The protocol skill (bridge, now)

Content, in order: the team and its states; the gate (only Todo + agent label runs); ideas go
to Backlog with `idea`; the spec format (context, goal, acceptance criteria, out of scope, how
to verify); branch name `<key>-<slug>`; what to comment at each step (claimed, tests failed and
retrying, PR opened, needs info with the exact question); and an operations table:

| Operation     | Today (Linear MCP)                    | After cutover (queue MCP) |
| ------------- | ------------------------------------- | ------------------------- |
| create ticket | `save_issue` (Backlog, label `idea`)  | `create_ticket`           |
| list          | `list_issues` with the view's filter  | `list_tickets`            |
| view          | `get_issue` + `list_comments`         | `get_ticket`              |
| update        | `save_issue`                          | `update_ticket`           |
| comment       | `save_comment`                        | `add_comment`             |
| send to queue | `save_issue` state Todo + agent label | `send_to_queue`           |
| runner status | read the pinned status (Hermes)       | `runner_status`           |

Verify the Linear MCP tool names against the live server when writing the skill; the names
above come from the tools visible on 2026-10-07.

## The import (cutover)

`scripts/import-linear.ts`, run with `LINEAR_API_KEY`, `CONVEX_URL`, `AGENT_TOKEN`:

1. Read Linear projects and non-archived open issues (states Backlog, Todo, In Progress,
   In Review) through the GraphQL API, paginated.
2. Upsert projects by `linearId`; `key` from the team key unless the user passes a mapping.
3. Upsert tickets by `linearId` through an import-only agent mutation that may set any status
   (still token-protected, refuses when the ticket exists with a different `linearId`).
4. Status map: Backlog → `backlog`; Todo with agent label → `todo`, without → `backlog`;
   In Progress → `backlog` + `needs-info`; In Review → `in_review` with the PR URL if a GitHub
   attachment exists.
5. Priority map (Linear → queue): 1 Urgent → 0, 2 High → 1, 3 Medium → 2, 4 Low → 3,
   0 None → 4.
6. Advance each project's `nextNumber` past the highest imported number.
7. Print a summary: created, updated, skipped, per project.

`--dry-run` prints the plan without writing.
