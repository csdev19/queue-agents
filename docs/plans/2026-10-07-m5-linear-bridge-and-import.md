# M5 Linear bridge (now) and import + cutover (end of MVP)

- **Spec:** [Linear bridge and import](../specs/2026-10-07-linear-bridge-and-import-design.md)
- **ADRs:** 0006 (for retiring the relay)
- **Branches:** `feat/m5a-queue-protocol`, `feat/m5b-linear-import`

## Part A — bridge (can start today)

- [ ] Connect the Linear MCP in Claude Code
      (`claude mcp add --transport http linear https://mcp.linear.app/mcp`), Codex (verify the
      current config format) and Hermes.
- [ ] Read `../linear-webhook/src/config.ts` for team key, states and labels.
- [ ] Write `skills/queue-protocol/SKILL.md` with the spec's content and operations table,
      checking each Linear tool name against the live server.
- [ ] Install the skill in the three agents (symlink or copy; document how in the skill's
      header).
- [ ] In Linear, archive Done and Canceled issues.
- [ ] Freeze `linear-webhook`: a README note that it is bridge-only, retired at cutover.

**Done when** each agent, asked "file an idea: …", creates a Backlog issue with `idea` through
the protocol, and the issue count is back under the cap.

## Part B — import and cutover (after M1–M4)

- [ ] `agent/import.ts` (`upsertProject`, `upsertTicket` by `linearId`) with convex-test for
      idempotency and the counter advance.
- [ ] `scripts/import-linear.ts` with `--dry-run`, GraphQL pagination, the spec's status and
      priority maps, and a summary.
- [ ] Dry run against the real workspace; review the plan with the owner.
- [ ] Real run; run it again and confirm zero creates.
- [ ] Switch the operations table in `queue-protocol` to the queue MCP tools; reinstall in the
      three agents.
- [ ] Turn off the Linear webhook and the relay Worker; archive the `linear-webhook` repo.

**Done when** a second import run reports zero creates, all three agents file and read tickets
through the queue MCP, and the relay is off.
