# Architecture Context

A **Fullstack serverFn + Convex (apps/fullstack-fn-and-convex)** project (DDD + Hexagonal Architecture), scaffolded from monorepo-template.

> The general architecture knowledge (DDD + hexagonal, bounded contexts, repository pattern, Result
> types, dependency injection, schema-driven validation) lives in the
> [general-knowledge hub](https://github.com/csdev19/general-knowledge) — start at
> [architecture/](https://github.com/csdev19/general-knowledge/blob/main/architecture/README.md).
> This file only maps what is specific to _this project_.

## Shared packages (layer-first)

- `domain/` — Pure: Zod schemas, types, constants, repository interfaces (leaf, no deps)
- `application/` — Use cases (depend only on domain interfaces)
- `infra-db/` — Drizzle schemas, repositories, mappers, Neon client
- `infra-auth/` — Better Auth base config
- `infra-env/` — Zod env schemas (one per app)
- `convex-api/` — Convex functions for the web app (Convex pattern)
- `web-ui/` — Shared React UI (shadcn/ui, Tailwind) — exports built dist/
- `config/` — Shared tsconfig

**Dependency rule (strict):** `domain <- application <- infra-*`; only apps wire them together.
`domain` is a leaf, so importing it can never transitively pull in server code. Mobile apps import
only `@queue-agents/domain`.

## Apps

- `apps/fullstack-fn-and-convex`
- `apps/documentation`

See the [monorepo structure](https://github.com/csdev19/general-knowledge/blob/main/monorepos/monorepo-structure.md)
doc in the hub for the workspace / Turbo / catalog layout.
