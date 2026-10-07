# M2 MCP server

- **Spec:** [MCP server](../specs/2026-10-07-mcp-server-design.md)
- **ADRs:** 0005 (reuses 0003, 0004)
- **Branch:** `feat/m2-mcp`

**Goal:** Claude Code, Codex and Hermes can file, read and move tickets in the queue.

## Steps

- [ ] Read the current `@modelcontextprotocol/sdk` README (server, `registerTool`,
      `StdioServerTransport`) and pin the version.
- [ ] Create `packages/mcp` (`@queue-agents/mcp`): `src/index.ts` (startup, env check that exits
      with a clear stderr message), `src/client.ts` (thin interface over `ConvexHttpClient` and
      the generated `api`), `src/tools/*.ts` (one handler per tool as a plain function).
- [ ] Implement the eight tools from the spec, validating inputs with the domain zod schemas.
- [ ] Unit tests per handler with a fake client; one smoke test that spawns the server and
      lists tools over stdio.
- [ ] Ensure nothing writes to stdout except the transport (lint rule or a test that captures
      stdout during a tool call).
- [ ] Manual check in Claude Code: `claude mcp add queue …`, create a ticket, see it in
      `backlog` in the Convex dashboard, `send_to_queue`, see it in `todo`.
- [ ] Docs: README section and docs-site page "MCP setup" with Claude Code, Codex (verify the
      current config format) and generic JSON snippets.

## Done when

All three snippets are documented, the manual check passes in Claude Code, tests are green.
