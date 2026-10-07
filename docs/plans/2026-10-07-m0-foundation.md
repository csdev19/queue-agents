# M0 Foundation — from template scaffold to this product's base

- **Spec:** [web auth](../specs/2026-10-07-web-auth-design.md), [umbrella](../specs/2026-10-07-agent-queue-design.md)
- **ADRs:** 0002
- **Branch:** `feat/m0-foundation`

**Goal:** the repo is this product, not the template: the Todo example and Postgres are
gone, auth is Better Auth inside Convex with one allowed email, the docs are about the queue,
and the code is on GitHub.

## Steps

### 1. GitHub repository

- [ ] Confirm with the owner: public repo `csdev19/queue-agents`, MIT.
- [ ] `gh auth switch --user csdev19`; `gh repo create csdev19/queue-agents --public --source . --remote origin`
      with the SSH alias `github-personal` as the remote URL.
- [ ] Push `main` and `design/agent-queue`; open the design PR; create the backlog issue from
      the umbrella spec (label `backlog`).

### 2. Remove the template example

- [ ] Delete the Todo/category example: `convex/todos.ts`, `convex/categories.ts`, their
      schema tables, the web routes/hooks/server functions under
      `apps/fullstack-fn-and-convex/src/{hooks,server-functions,routes/_authenticated/todos}`.
- [ ] Delete `packages/application` and `packages/infra-db`; delete the `db:*` scripts.
- [ ] Trim `packages/domain` to an empty, buildable shell (`src/index.ts`), keeping its
      test setup; remove the Todo schemas and repository ports.
- [ ] Rename `apps/fullstack-fn-and-convex` → `apps/web` (package name `web`), update root
      scripts (`dev:web`), turbo filters and workflows.
- [ ] `bun run verify` green.

### 3. Swap auth to Better Auth inside Convex

- [ ] Before coding: read the current `@convex-dev/better-auth` docs (TanStack Start guide)
      and the hub page `convex/better-auth.md`; note version differences in the PR.
- [ ] Copy `convex.config.ts`, `auth.config.ts`, `auth.ts`, `http.ts` from
      `../monorepo-template/packages/convex-auth-api/convex/` into
      `packages/convex-api/convex/`; drop the Expo plugin and native origins.
- [ ] Add the `ALLOWED_EMAIL` sign-up gate (`databaseHooks.user.create.before`) and
      `lib/auth.ts#requireUser` (session **and** email check).
- [ ] Test (convex-test): sign-up with another email is rejected; `requireUser` throws for a
      session whose email differs.
- [ ] Web: replace the TanStack-side Better Auth server and `routes/api/auth/$.ts` with the
      Convex Better Auth client and provider; keep the `_authenticated` guard and the
      login form (remove sign-up from the UI except for first run).
- [ ] Delete `packages/infra-auth`, `scripts/generate-convex-jwt-keys.ts`, `JWT_*` and
      `DATABASE_URL` from env schemas (`packages/infra-env`) and `.env.example`.
- [ ] Pin `better-auth` and `@convex-dev/better-auth` exactly in the root catalog.
- [ ] Manual check: `bun run dev:convex` + `bun run dev:web`, sign up with the allowed email,
      sign out, sign in; sign-up with another email fails.

### 4. Docs and agent instructions

- [ ] Rewrite `README.md`: what the product is, the five-command deploy (Convex project,
      env vars, `convex deploy`, web deploy, MCP setup) — fill the MCP part in M2.
- [ ] Rewrite `CLAUDE.md` for this repo: purpose, package map, import rules, where specs/ADRs/
      plans live, `bun run verify`, the auth and token boundaries; keep hub links that apply.
      Add `AGENTS.md` pointing to it.
- [ ] Docs site (`apps/documentation`): delete template pages (Elysia, Hono, mobile,
      repository pattern, todos changelog); keep the skeleton with pages: Overview, Deploy,
      MCP setup (stub), Architecture (links to specs/ADRs on GitHub, no duplication).
- [ ] Remove `.claude/` template commands/skills that do not apply; keep `feature-docs` if
      used.
- [ ] Add `docs/roadmap.md` with the milestones, one line each, linking the backlog issue.
- [ ] Review `.github/workflows`: drop `customizer-test.yml`; keep deploy as
      `workflow_dispatch` until a deploy target exists.

## Done when

`bun run verify` is green, login works locally against a dev Convex deployment with the
allowed email only, no file mentions Todo, Postgres or the template customizer, and the repo
is on GitHub with the design PR open.
