# ADR 0002: Web auth with Better Auth hosted inside Convex, one allowed email

- **Status:** Proposed
- **Date:** 2026-10-07
- **Supersedes / Superseded by / Amends:** N/A (departs from the monorepo-template's
  fullstack-Convex auth, which is not an ADR in this repo)
- **Implementation:** not started; the scaffold still has the template's auth

## Context

The template's fullstack-Convex pattern runs Better Auth on the TanStack server with Postgres
(`infra-db`, `DATABASE_URL`) and bridges to Convex with a self-signed JWT (`customJwt`). For a
single-user tool that each user deploys, that is a second database and two backends only to
log in. The concept document asked for Convex Auth. The hub (`convex/better-auth.md`) documents
Better Auth hosted in Convex via `@convex-dev/better-auth`, already shipped by the template's
`convex-auth-api` package.

## Decision

Use `@convex-dev/better-auth` inside the Convex deployment with email + password. Sign-up is
rejected for any email other than the `ALLOWED_EMAIL` deployment variable, and every web
function calls `requireUser`, which also checks the email. Remove `infra-db`, `infra-auth`, the
JWT bridge and the TanStack-side auth routes. Pin `better-auth` and the component exactly.

## Alternatives rejected

- Keep the template's Postgres + JWT bridge: an extra database and secret pair per user.
- Convex Auth: reported by the community to be heading to deprecation in favor of Better Auth;
  diverges from the hub.
- No login, Cloudflare Access in front of the web app: Convex functions stay public anyway; the
  data API needs its own identity.

## Consequences

- One deployment holds data and auth; setup docs shrink.
- Dependence on a component maintained by few people; versions must be pinned and upgraded
  deliberately.
- The repo departs from the template here; future template updates to auth do not apply.

## Non-goals

Multi-user, roles, OAuth providers, password-reset email.

## Reopen when

`@convex-dev/better-auth` stops being maintained or breaks on a Convex upgrade; or a second
user needs access.
