# ADR 0005: The MCP server runs over stdio and calls Convex with ConvexHttpClient

- **Status:** Proposed
- **Date:** 2026-10-07
- **Supersedes / Superseded by / Amends:** N/A
- **Implementation:** not started

## Context

Claude Code, Codex and Hermes all speak MCP. The queue must be reachable from all three with the
same vocabulary, and the Linear bridge already teaches them operation names.

## Decision

`packages/mcp` is a stdio MCP server built on `@modelcontextprotocol/sdk` (`McpServer`,
`registerTool`, `StdioServerTransport`), configured with `CONVEX_URL` and `AGENT_TOKEN`, calling
the `agent/*` functions through `ConvexHttpClient`. Tools: `list_projects`, `create_ticket`,
`list_tickets`, `get_ticket`, `update_ticket`, `add_comment`, `send_to_queue`,
`runner_status`. Logs go to stderr only.

## Alternatives rejected

- Remote HTTP MCP served from a Convex HTTP action: one URL for every client, but SDK
  compatibility with the Convex runtime is unverified and auth for remote MCP is more work.
- A CLI instead of MCP: agents would need shell access and a custom prompt per client.

## Consequences

- Each machine that runs an agent needs a checkout (or, later, an npm install) and the token.
- Tool names are a public contract shared with the `queue-protocol` skill.

## Non-goals

MCP resources/prompts, OAuth, exposing runner functions.

## Reopen when

Hermes or a cloud agent (e.g. Claude Code Routines) needs the queue from a machine where a
checkout is impractical.
