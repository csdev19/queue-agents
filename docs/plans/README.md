# Plans

Working documents, one per milestone. Each plan's shipping PR deletes it (git keeps it). The
design they implement is in [`docs/specs/`](../specs/) and [`docs/adr/`](../adr/); start from
the [umbrella spec](../specs/2026-10-07-agent-queue-design.md).

| Order | Plan                                                                       | Depends on                     | Size             |
| ----- | -------------------------------------------------------------------------- | ------------------------------ | ---------------- |
| 0     | [M0 Foundation](./2026-10-07-m0-foundation.md)                             | —                              | ½ day            |
| 1     | [M1 Queue core](./2026-10-07-m1-queue-core.md)                             | M0                             | 1 day            |
| 2     | [M2 MCP server](./2026-10-07-m2-mcp-server.md)                             | M1                             | ½ day            |
| 3     | [M3 Web app](./2026-10-07-m3-web-app.md)                                   | M1 (M2 not required)           | 1 day            |
| 4     | [M4 GitHub integration](./2026-10-07-m4-github-integration.md)             | M1                             | ½ day            |
| 5     | [M5 Linear bridge and import](./2026-10-07-m5-linear-bridge-and-import.md) | Part A: nothing. Part B: M1–M4 | A: 2 h, B: ½ day |
| 6     | [M6 Runner](./2026-10-07-m6-runner.md) (post-MVP)                          | M5 cutover                     | 1–2 days         |

M5 part A (the Linear bridge skill) can start today, in parallel with M0.

Conventions for every plan:

- One branch and one PR per milestone (`feat/m1-queue-core`, …); small commits inside it.
- `bun run verify` green before every push (Lefthook runs it).
- Test first for every domain rule and Convex function listed under "Failures this must
  protect against" in the milestone's spec.
- Before using an external API, check its current docs and note in the PR what differed from
  the spec.
- Steps are task-sized. Before executing a plan with subagents, expand each step into
  file-level tasks (superpowers `writing-plans` format) in the same file.
