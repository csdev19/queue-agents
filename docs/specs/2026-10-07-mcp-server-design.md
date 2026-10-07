# MCP server — the agents' door into the queue

- **Status:** Proposed — not implemented.
- **Date:** 2026-10-07
- **Parent:** [agent queue umbrella spec](./2026-10-07-agent-queue-design.md)
- **Plan:** [M2 MCP server](../plans/2026-10-07-m2-mcp-server.md)

## Summary (one minute)

`packages/mcp` is a TypeScript MCP server on stdio, built on the official
`@modelcontextprotocol/sdk` (`McpServer.registerTool` + `StdioServerTransport`). It calls the
`agent/*` Convex functions through `ConvexHttpClient`, passing `AGENT_TOKEN`. Claude Code,
Codex and Hermes all load the same server, so they share one vocabulary. The tool names match
the operations the Linear-bridge protocol already uses, so switching from Linear is a config
change.

| #   | Decision                                                                                 | Why                                                                          | ADR         |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------- |
| 1   | stdio transport, run with `bun` from a checkout (npm publish later)                      | No hosting; works in all three clients today                                 | 0005 (new)  |
| 2   | Eight tools (the concept doc's seven plus `list_projects`)                               | `create_ticket` needs a project key the agent can discover                   | 0005        |
| 3   | `create_ticket` always lands in `backlog` + `idea`; only `send_to_queue` moves to `todo` | The entry gate                                                               | reuses 0004 |
| 4   | `update_ticket` cannot change status                                                     | Status changes go through named operations with their own rules              | reuses 0004 |
| 5   | Tool results are compact text plus structured content                                    | Agents read text well; structured content lets clients that support it parse | —           |

## Open questions

1. Remote HTTP MCP served from Convex, so Hermes connects with a URL. Default: not now; the
   SDK's compatibility with the Convex runtime is unverified.
2. Publish to npm as `@queue-agents/mcp` for `bunx` installs? Default: after the MVP.

## Out of scope

Runner functions (`claimNext`, `heartbeat`): the runner calls Convex directly. MCP resources and
prompts. OAuth for MCP.

## Failures this must protect against

- The server starts without `CONVEX_URL` or `AGENT_TOKEN` and fails later with an opaque error
  (it must exit at startup with a clear message on stderr).
- Anything written to stdout other than protocol frames (corrupts stdio; logs go to stderr).
- An agent creates a ticket straight into `todo`.

## Tools

| Tool            | Input                                                                                                               | Calls                       | Notes                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------- |
| `list_projects` | —                                                                                                                   | `agent/projects:list`       | key, name, repoSlug, autonomy                                    |
| `create_ticket` | `project` (key), `title`, `body?`, `spec?`, `priority?`, `size?`, `createdBy?` (`hermes`\|`agent`, default `agent`) | `agent/tickets:create`      | Always `backlog` + `idea`; returns the key                       |
| `list_tickets`  | `view` (`review`\|`queue`\|`stuck`\|`backlog`), `project?`, `limit?` (default 25)                                   | `agent/tickets:list`        | One line per ticket                                              |
| `get_ticket`    | `key`                                                                                                               | `agent/tickets:get`         | Ticket, spec, last 20 events, runs                               |
| `update_ticket` | `key`, any of `title`, `body`, `spec`, `labels`, `priority`, `size`                                                 | `agent/tickets:update`      | No status                                                        |
| `add_comment`   | `key`, `body`                                                                                                       | `agent/tickets:addComment`  | Event type `comment`                                             |
| `send_to_queue` | `key`                                                                                                               | `agent/tickets:sendToQueue` | `backlog` → `todo`; Hermes calls it when the user says "send it" |
| `runner_status` | —                                                                                                                   | `agent/runner:status`       | Status, ticket, step, elapsed, mode                              |

Inputs are validated with zod schemas imported from `packages/domain`, the same schemas the
Convex validators mirror (hub `schemas-first`).

## Configuration

Env: `CONVEX_URL`, `AGENT_TOKEN`. README snippets for:

- Claude Code: `claude mcp add queue -e CONVEX_URL=… -e AGENT_TOKEN=… -- bun /path/to/queue-agents/packages/mcp/src/index.ts`
- Codex: the `[mcp_servers.queue]` block in `~/.codex/config.toml` (verify the current format
  in the Codex docs when writing it).
- A generic MCP client JSON (`command`, `args`, `env`).

## Tests

Each tool's handler is a plain function taking a client interface; tests use a fake client.
One smoke test spawns the server and lists tools over stdio.
