# Web auth — Better Auth inside Convex, one allowed email

- **Status:** Proposed — not implemented. The scaffold still has the template's auth
  (Better Auth on the TanStack server, Postgres via `infra-db`, JWT bridge to Convex).
- **Date:** 2026-10-07
- **Parent:** [agent queue umbrella spec](./2026-10-07-agent-queue-design.md)
- **Plan:** [M0 foundation](../plans/2026-10-07-m0-foundation.md)

## Summary (one minute)

The web app signs in against Better Auth running inside the Convex deployment
(`@convex-dev/better-auth`), the setup the hub documents in `convex/better-auth.md` and the
template already ships in `packages/convex-auth-api` (used by its `mobile-convex` app; the
customizer deleted it here, so the code is copied from `monorepo-template`). Only
`ALLOWED_EMAIL` can sign up or read data. The template's Postgres, `infra-db`, `infra-auth`,
JWT keys and TanStack-side auth routes are removed.

| #   | Decision                                                                                   | Why                                                                                          | ADR        |
| --- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ---------- |
| 1   | Better Auth hosted in Convex                                                               | One deployment for an open-source user to set up; no Postgres                                | 0002 (new) |
| 2   | Email + password, sign-up gated to `ALLOWED_EMAIL`                                         | No OAuth app to register per deployment; the gate makes the public sign-up endpoint harmless | 0002       |
| 3   | Every web query/mutation calls `requireUser`, which checks the email, not only the session | A session for another email (e.g. created before the gate) must not read data                | 0002       |

## Open questions

1. Pinned versions. The template pins `@convex-dev/better-auth` 0.12.5 with `better-auth`
   1.6.23 in `convex-auth-api`, while the root catalog has `better-auth` 1.4.18. Default: use
   the pair the hub page documents as tested, check the component's current compatibility
   table first, and pin both exactly.
2. GitHub OAuth later? Default: not in the MVP.

## Out of scope

Multiple users, password reset email (single user can reset through the Convex dashboard),
2FA, OAuth providers.

## Failures this must protect against

- Anyone who finds the deployment URL signs up and reads tickets.
- A user signed in with a different email reads data.
- `SITE_URL` / trusted origins mismatch silently breaks login in production but not in dev.

## Design

- `packages/convex-api/convex/convex.config.ts`: `app.use(betterAuth)`.
- `auth.config.ts`: `getAuthConfigProvider()` replaces the template's `customJwt` provider.
- `auth.ts`: `createAuth` with `emailAndPassword`, a `databaseHooks.user.create.before` that
  rejects any email other than `ALLOWED_EMAIL`, `trustedOrigins` = the web origin(s).
- `http.ts`: `authComponent.registerRoutes(http, createAuth)`; M4 adds `/github` to the same
  router.
- `lib/auth.ts`: `requireUser(ctx)` → `authComponent.safeGetAuthUser(ctx)`, then compares the
  email with `ALLOWED_EMAIL` (case-insensitive).
- Web app: Better Auth client with the Convex plugin, `ConvexBetterAuthProvider`; the
  `_authenticated` route guard stays, reading the session from Convex.
- Env: Convex deployment gets `SITE_URL`, `ALLOWED_EMAIL`, `BETTER_AUTH_SECRET`; the web app
  keeps `VITE_CONVEX_URL` and adds `VITE_CONVEX_SITE_URL`.

Removed: `packages/infra-db`, `packages/infra-auth`, `apps/fullstack-fn-and-convex/src/lib/auth/*`
server pieces, `src/routes/api/auth/$.ts`, `scripts/generate-convex-jwt-keys.ts`, the
`db:*` and `generate:convex-jwt-keys` scripts, `DATABASE_URL` / `JWT_*` env entries.
