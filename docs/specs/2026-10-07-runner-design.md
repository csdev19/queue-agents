# Runner — the always-on worker (post-MVP)

- **Status:** Proposed — not implemented; built after the MVP cutover. This spec fixes the
  runner's contract with the queue now so the MVP does not need to change for it.
- **Date:** 2026-10-07
- **Parent:** [agent queue umbrella spec](./2026-10-07-agent-queue-design.md)
- **Plan:** [M6 runner](../plans/2026-10-07-m6-runner.md)

## Summary (one minute)

`apps/runner` is a Bun process with no conversation, running as a service on the Hermes host
(launchd, systemd or pm2). It subscribes to the queue through `ConvexClient`, and whenever a
claimable ticket exists it calls `claimNext`, creates a worktree from `origin/<defaultBranch>`
on branch `<key>-<slug>`, installs dependencies, runs a fresh headless Claude Code session with
the spec, the repo's `AGENTS.md` and a turn limit, runs the project's checks, and opens a PR
with `gh` (draft if checks fail). It heartbeats every minute. There is no night runner: one
runner, two budget modes — day takes only `s` tickets, night takes everything.

| #   | Decision                                                                        | Why                                                                         | ADR  |
| --- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---- |
| 1   | Subscription, not polling or webhooks                                           | Convex pushes changes; no relay to run                                      | 0006 |
| 2   | One ticket at a time per runner                                                 | Subscription budget and review capacity are the bottleneck, not parallelism | —    |
| 3   | Worktree per ticket, kept until merge or cancel                                 | Rework (`changes`) reuses the same branch and PR                            | —    |
| 4   | Claude Code headless (`claude -p`) with `--max-turns` and an allowlist of tools | Fresh context per ticket; bounded cost                                      | —    |
| 5   | Mode by local clock windows in config (default night 22:00–07:00)               | Simple; matches the subscription's usage pattern                            | —    |
| 6   | Full logs stay on the host; Convex gets short events and the log path           | Transcripts would blow the 0.5 GiB free storage and leak code               | —    |

## Open questions

1. Rate-limit detection from Claude Code output: which signal and how to compute
   `rateLimitResetsAt`. Verify against the current CLI before M6.
2. Secrets per repo (`.env` files) for the worktree: copy from the main checkout, or a
   per-project secret path in config. Default: copy `.env*` listed in project config.
3. Codex as a second engine. Default: not in the first runner.

## Out of scope

Parallel tickets, multiple hosts, cloud execution (Claude Code Routines is the alternative if
the host becomes the problem), automatic merge.

## Failures this must protect against

- The runner crashes mid-ticket and the ticket stays `in_progress` forever (heartbeat stops →
  cron marks `hung` → user releases from the stuck view; on restart the runner resumes or
  releases its own claimed ticket).
- Two runner processes on one host (lock file + `runnerId` uniqueness).
- A ticket loops forever (attempt limit per ticket → `agent-failed`).
- The agent pushes to the default branch (branch protection + the runner only pushes its own
  branch).
- A `changes` rework creates a new branch instead of updating the PR.

## Loop

1. Subscribe to `agent/runner:nextClaimable(mode)`; when non-null, `claimNext`.
2. `startRun`; heartbeat step `worktree`; create or reuse worktree; heartbeat `install`.
3. Heartbeat `agent`; run Claude Code with: spec, acceptance criteria, `AGENTS.md`, the
   reviewer's last comment when the ticket has `changes`.
4. Heartbeat `checks`; run `testCommand`; tick acceptance criteria in the PR body.
5. Heartbeat `pr`; push and `gh pr create` (or push to the existing PR). The webhook moves the
   ticket to `in_review`.
6. `finishRun` with outcome and summary; on turn limit → `agent-failed` + comment with what
   was tried; on a blocking question → `needs-info` + the question as a comment.
7. On `done`/`canceled` events for a ticket with a worktree, remove the worktree.

## Hermes (control surface, outside this repo)

Hermes uses the same MCP: "idea: …" → `create_ticket`; "mándalo" → `send_to_queue`; "¿cómo
vamos?" → `runner_status`. A pinned Telegram message is edited from `runner_status`; new
notifications only for PR ready, failed, needs info, runner hung. Hermes' own configuration
lives in Hermes, not here.
