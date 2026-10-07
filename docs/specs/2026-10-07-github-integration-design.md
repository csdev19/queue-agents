# GitHub integration — PR and CI state from signed webhooks

- **Status:** Proposed — not implemented.
- **Date:** 2026-10-07
- **Parent:** [agent queue umbrella spec](./2026-10-07-agent-queue-design.md)
- **Plan:** [M4 GitHub integration](../plans/2026-10-07-m4-github-integration.md)

## Summary (one minute)

A Convex HTTP action at `POST /github` receives repository webhooks, verifies
`X-Hub-Signature-256` (HMAC-SHA256 of the raw body with `GITHUB_WEBHOOK_SECRET`, Web Crypto,
constant-time compare), finds the project by `repository.full_name` and the ticket by the key
at the start of the head branch, and updates PR and CI state. Opening a PR moves the ticket to
`in_review`; merging moves it to `done`. Everything that does not match is acknowledged with
200 and ignored, so GitHub does not retry noise.

| #   | Decision                                                                      | Why                                                                             | ADR |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --- |
| 1   | Repository webhooks, one per repo, created by a script with `gh api`          | No GitHub App to register for a single user; the script makes setup one command | —   |
| 2   | Match ticket by key prefix of the head branch, project by `repoSlug`          | The runner names branches `<key>-<slug>`; no lookup table needed                | —   |
| 3   | Unmatched deliveries return 200 with a reason                                 | Avoids retries for PRs that are not queue work                                  | —   |
| 4   | Transitions are idempotent; no delivery-id table                              | Re-delivery of "opened" on an `in_review` ticket is a no-op                     | —   |
| 5   | Closed without merge records `prState: closed` and an event, no status change | The human decides whether to cancel or re-queue                                 | —   |

## Open questions

1. CI aggregation across several check suites. Default: on `pull_request.synchronize` reset to
   `pending`; any `check_suite.completed` with a failing conclusion sets `failure`; `success`
   only when every completed suite for that head SHA succeeded (store the latest `headSha`
   on the ticket and ignore older SHAs).
2. Should a draft PR enter `in_review`? Default: yes; the review order puts failing CI last.

## Out of scope

Merging from the app, posting comments to GitHub, GitHub App installation, organizations'
webhooks, GitLab.

## Failures this must protect against

- Unsigned or wrongly signed request changes state (401, nothing written).
- Signature computed over re-serialized JSON instead of the raw body.
- A branch like `feature/niw-123` or `NIW-1234` matching `NIW-123` (anchor the regex and
  require the key to end at a non-digit).
- A webhook for repo A moves a ticket of repo B with the same key prefix.
- An old SHA's CI result overwrites the newer one.

## Event handling

| Event / action                                          | Effect                                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ping`                                                  | 200                                                                                                                                                           |
| `pull_request` `opened`, `reopened`, `ready_for_review` | `in_progress`/`todo` → `in_review` (via `canTransition`); store `prUrl`, `prNumber`, `prState`, `branch`, `additions`, `deletions`, `headSha`; event `github` |
| `pull_request` `synchronize`                            | update `additions`, `deletions`, `headSha`; `ciState: pending`                                                                                                |
| `pull_request` `closed` + `merged: true`                | → `done`, `prState: merged`                                                                                                                                   |
| `pull_request` `closed` + not merged                    | `prState: closed`, event                                                                                                                                      |
| `check_suite` `completed`                               | match by `head_branch` (and `head_sha`), update `ciState` per the aggregation rule                                                                            |
| anything else                                           | 200, ignored                                                                                                                                                  |

The HTTP action only verifies and parses; it calls one internal mutation
`internal/github:apply` with a normalized event, so the state logic is testable with
`convex-test` and the parsing with plain unit tests.

## Setup

`scripts/github-webhook.ts <owner/repo>`: creates the webhook with
`gh api repos/<owner>/<repo>/hooks` pointing to `<CONVEX_SITE_URL>/github`, content type JSON,
events `pull_request` and `check_suite`, using `GITHUB_WEBHOOK_SECRET`. Run `gh` as the account
that owns the repo (see `~/GITHUB_ACCOUNTS.md`).
