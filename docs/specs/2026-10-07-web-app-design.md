# Web app — runner strip, review inbox, four lists

- **Status:** Proposed — not implemented.
- **Date:** 2026-10-07
- **Parent:** [agent queue umbrella spec](./2026-10-07-agent-queue-design.md)
- **Plan:** [M3 web app](../plans/2026-10-07-m3-web-app.md)

## Summary (one minute)

A desktop-first, keyboard-first TanStack Start app (`apps/fullstack-fn-and-convex`, renamed to
`apps/web` in M0) that subscribes to Convex with `useQuery`. Layout: a collapsible sidebar with
the four views and live counts, a runner strip always visible at the top, a list in the main
area (never a board), and a detail panel on the right. The review view behaves like an inbox:
act on the selected PR and the next one is selected. The visual design comes later from a
design pass that produces `DESIGN.md`; M3 ships a functional, clean UI on `web-ui` components.

| #   | Decision                                                                                                                                                           | Why                                                      | ADR                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ------------------------- |
| 1   | Lists only; 36px rows                                                                                                                                              | Review is one thing at a time; a board spreads it        | —                         |
| 2   | The runner strip is subscribed to `runnerState`, separate from ticket queries                                                                                      | Heartbeats must not re-render lists                      | — (queue core decision 6) |
| 3   | Keyboard map: `j/k` move, `Enter` open detail, `o` open PR, `m` done, `c` request changes, `x` cancel, `C` quick create, `Cmd+K` palette, `g r/q/s/b` jump to view | The concept doc's map plus view jumps                    | —                         |
| 4   | Optimistic updates for `m`, `c`, `x` and selection moves to the next row immediately                                                                               | The inbox feel depends on zero wait                      | —                         |
| 5   | UI copy in Spanish, behind the template's i18n-ready strings                                                                                                       | The owner's working language; English can be added later | —                         |
| 6   | Ship functional UI first; visual design arrives as `DESIGN.md` from the design prompt                                                                              | The runner is where value is; polish follows real use    | —                         |

## Open questions

1. i18n: the customizer removed the `i18n` package. Default: Spanish strings in one
   `copy.ts` module per app, so a later i18n pass has one place to change.
2. Who runs the design prompt (from the concept doc) and when? Default: after M3, with the
   `frontend-design` skill, output to `DESIGN.md` at the repo root.

## Out of scope

Mobile layout, board view, charts, drag and drop, multi-select bulk actions, notifications.

## Failures this must protect against

- A keyboard shortcut fires while typing in an input or the comment box.
- After `m`/`c`/`x` the selection jumps to the top instead of the next row.
- The runner strip shows "working" for a hung runner (it must show `hung` from
  `runnerState.status`, and also compute staleness client-side from `lastHeartbeat`).
- The page renders data before the session is checked (flash of private data).

## Screens

**Runner strip (top, always visible).** States: `working` (pulsing dot, key + title, step,
elapsed, mode), `idle` ("Cola vacía"), `paused`, `rate_limited` (time until reset), `hung`
(red, "sin heartbeat hace N min"), `offline` (no `runnerState` row yet). Click opens the
claimed ticket.

**Sidebar.** Por revisar, Cola, Atascados, Backlog with counts from `counts`; Projects below.

**List row.** key (mono), title, project chip, labels, PR + CI icons, size, +/- lines (review
view), time in status. Hover reveals quick actions.

**Por revisar (hero).** Ordered by `reviewQueue`. Header: "N por revisar". `c` opens a
one-line comment input; submit calls `requestChanges` (comment + `changes` + `todo` +
priority 0). Empty state: quiet, satisfying.

**Cola.** Claim order; day-mode-eligible rows marked.

**Atascados.** `needs-info` rows show the agent's last question inline with a reply box; reply
= comment + remove `needs-info` + send to `todo`.

**Backlog.** Ideas; `s` sends to `todo`.

**Detail panel (Enter, 480px).** Title, status, project, labels, priority, size inline
editable; Spec (acceptance criteria as checkboxes, ticked by the agent); Activity timeline;
Runs (model, duration, outcome).

**Quick create (`C`).** Title, project, optional body. Web-created tickets go to `todo` in
`auto` projects and `backlog` in `needs-go` projects.

**Command palette (`Cmd+K`).** Create ticket, jump to view, search tickets by title.

## Template removals

The Todo example routes, hooks and server functions; `@tanstack/react-query` stays only if
something non-Convex needs it (default: remove `@convex-dev/react-query` usage and use
`convex/react` directly, per hub `convex/client-connection.md`).
