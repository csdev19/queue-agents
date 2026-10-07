# M1 Queue core — schema, rules, functions

- **Spec:** [queue core](../specs/2026-10-07-queue-core-design.md)
- **ADRs:** 0003, 0004
- **Branch:** `feat/m1-queue-core`

**Goal:** every ticket operation the web app, the MCP and the runner need exists in Convex,
is protected, and is covered by tests.

## Steps

### 1. Verify before building

- [ ] Check whether function arguments appear in the Convex dashboard logs (call a test
      function with a dummy secret). Record the result in ADR 0003; if they appear, follow the
      HTTP-action fallback in the spec for every `agent/*` function.
- [ ] Read current Convex docs for crons, search indexes and `convex-test`.

### 2. Domain rules (`packages/domain`, test first)

- [ ] Constants: statuses, labels, sizes, priorities, actors (`as const`, hub `enums-as-const`).
- [ ] Zod schemas for ticket inputs (shared with the MCP).
- [ ] `canTransition(from, to, actor)` with the spec's table; tests for every allowed and a
      sample of forbidden transitions.
- [ ] `isClaimable(ticket, mode)` and `compareForClaim`; tests: day mode rejects `m`/`l`/unsized,
      `needs-info` never claimable, `changes` first.
- [ ] `compareForReview`; tests with CI states, sizes and ages.
- [ ] `formatKey`, `parseKeyFromBranch`, `branchName`; tests for `NIW-123` vs `NIW-1234`,
      `feature/niw-123`, lower-case branches.

### 3. Schema and auth helpers

- [ ] `schema.ts` with the five tables and indexes from the spec.
- [ ] `lib/auth.ts`: `requireUser` (from M0) and `requireAgent` with constant-time compare.
- [ ] Set `AGENT_TOKEN` on the dev deployment; document generation (`openssl rand -hex 32`).

### 4. Functions (test first with convex-test)

- [ ] `web/projects.ts`, `agent/projects.ts`.
- [ ] `web/tickets.ts`: create (key from `nextNumber`, initial status by autonomy), update,
      `setStatus`, `requestChanges`, `markDone`, `cancel`, `addComment`, the four views,
      `counts`, `get`, `search`. Every status change appends an event.
- [ ] `agent/tickets.ts`: create (always `backlog` + `idea`), list, get, update (no status),
      `addComment`, `sendToQueue`.
- [ ] `agent/runner.ts`: `nextClaimable`, `claimNext`, `heartbeat`, `startRun`, `finishRun`,
      `release`, `status`.
- [ ] `web/runner.ts`: `status`, `pause`, `resume`.
- [ ] `crons.ts` + `internal/runner.ts#markHungRunners`.
- [ ] Tests for every item in the spec's "Failures this must protect against", including two
      concurrent `claimNext` calls.

### 5. Seed and usage note

- [ ] `internal/seed:run` with two projects and tickets in every view; `bun run seed` script.
- [ ] Add to the backlog: "check Convex usage after one week of real traffic" (free-plan
      estimate is unmeasured).

## Done when

All tests pass, `bun run verify` is green, the seed populates every view on a dev deployment,
and no public function is callable without `requireUser` or `requireAgent` (grep check in the
PR description).
