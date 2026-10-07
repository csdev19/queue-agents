# M4 GitHub integration

- **Spec:** [GitHub integration](../specs/2026-10-07-github-integration-design.md)
- **Branch:** `feat/m4-github`

**Goal:** opening a PR moves its ticket to review, merging closes it, and CI state shows in
the review inbox.

## Steps

- [ ] Read the current GitHub webhook docs for `pull_request` and `check_suite` payloads and
      signature validation; note differences in the PR.
- [ ] `lib/githubSignature.ts`: HMAC-SHA256 over the raw body with Web Crypto, constant-time
      compare. Tests with GitHub's documented test vector and a tampered body.
- [ ] `lib/githubEvents.ts`: parse payloads into a normalized event (pure, unit-tested with
      trimmed fixture payloads in `__fixtures__/`).
- [ ] `internal/github.ts#apply`: project by `repoSlug`, ticket by key + project, transitions
      via `canTransition`, CI aggregation by `headSha`. convex-test for every row of the
      spec's event table and every listed failure.
- [ ] `http.ts`: `POST /github` → verify → parse → `apply`; 401 on bad signature, 200 with a
      reason when ignored.
- [ ] `GITHUB_WEBHOOK_SECRET` on the deployment; `scripts/github-webhook.ts <owner/repo>` to
      create the hook with `gh api`.
- [ ] Manual check on a scratch repo: open a PR from branch `<key>-test`, see `in_review`;
      push a commit, see CI `pending` then the result; merge, see `done`.
- [ ] Docs-site page "GitHub webhook".

## Done when

The manual check passes end to end and GitHub's "Recent deliveries" shows 2xx for every
delivery, including ignored ones.
