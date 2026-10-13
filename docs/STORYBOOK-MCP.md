# Storybook and Chromatic MCP for coding agents

Coding agents (Claude Code, Codex) read the design system through Storybook's
MCP server instead of guessing from source: which components exist, their props,
their stories as usage examples, and a test runner for the stories they touch.
The setup is committed to the repository, so every team member gets the same
servers with one sign-in.

A second server, the [Chromatic MCP](#chromatic-mcp-build-and-test-results),
gives agents the results of Chromatic builds: visual changes, capture errors,
accessibility violations and review comments.

## The two servers

| Server | URL | Tools | Available |
|--------|-----|-------|-----------|
| `careconnect-storybook` | `https://main--6acbb93e85153a14d4e5b1cc.chromatic.com/mcp` | Docs: `docs-list`, `docs-show`, `docs-show-story` | Always. Published by Chromatic on every build; this is the `main` permalink, so it tracks the latest merged design system. Requires a Chromatic sign-in. |
| `careconnect-storybook-local` | `http://localhost:6006/mcp` | Docs, plus development (`get-storybook-story-instructions`, `stories-preview`, `stories-changed`, `stories-find-by-component`) and testing (`test-run`) | While `npm run storybook` runs. Reflects your working tree. |

Use the published server for "what does the design system offer". Start the local
one when building or changing components, so the agent can preview stories and
run their tests before handing work back.

Both servers are defined in two files that must stay in step:

- [`.mcp.json`](../.mcp.json) — Claude Code
- [`.codex/config.toml`](../.codex/config.toml) — Codex

## One-time setup per person

### Claude Code

1. Pull `main` and start a new Claude Code session in the repository root.
2. Approve the two project MCP servers when prompted (Claude Code asks once for
   servers defined in `.mcp.json`). To revisit the choice, run `/mcp`.
3. Run `/mcp`, select `careconnect-storybook` and authenticate. A browser opens
   on Chromatic; sign in and grant access.

### Codex

1. Pull `main`. Trust the repository when Codex asks — Codex loads
   `.codex/config.toml` only for trusted projects.
2. From the repository root, sign in:
   ```bash
   codex mcp login careconnect-storybook
   ```
   The request is limited to `storybook:read project:read`.
3. Check: `codex mcp list` shows `careconnect-storybook` as logged in.

Access follows the Chromatic project's collaborators, which Chromatic mirrors
from the GitHub organization. Every person signs in with their own account;
sessions and tokens are never shared or committed.

### Verify

- Ask the agent: *"List all documented components."* It should call `docs-list`
  on `careconnect-storybook` and return the design-system components.
- Run `npm run storybook`, then ask: *"Run the Storybook tests for the Button
  stories."* It should call `test-run` on `careconnect-storybook-local`.

## Team rules

- **Configuration changes go through a pull request**, in both files at once. Do
  not point the shared server names at another URL locally. For a branch's
  Storybook, add a separately named entry to your user-level config
  (`~/.claude.json` or `~/.codex/config.toml`), not to the repository files.
- **Docs are agent context.** Component JSDoc, prop descriptions and story names
  are what `docs-show` returns. Review them as you review code.
- **Keep the manifest lean.** Stories that would mislead an agent — docs pages,
  helpers it cannot import — carry `tags: ['!manifest']`. Today that is
  `Foundations/Tokens` and `CareConnect/Introduction`. Composition stories
  (Encounter Workspace, Tracking Board) stay in: they show how components
  combine.
- **Agents do not approve UI changes.** Chromatic baselines are accepted by a
  person, as described in [AGENTS.md](../AGENTS.md).

## Chromatic MCP: build and test results

The Storybook servers tell an agent what to build with. The Chromatic MCP
(`https://mcp.chromatic.com/mcp`) tells it what Chromatic found: the latest
build on a branch, the visual changes waiting for review, stories that failed
to capture, accessibility violations and reviewer comments. It comes with
Chromatic's plugin ([chromaui/chromatic-plugins](https://github.com/chromaui/chromatic-plugins)),
which adds skills for the common loops:

| Skill | Use it to |
|-------|-----------|
| `get-latest-build` | Report the latest build on a branch and what to do next |
| `review-visual-changes` | Sort pending diffs into intended and suspect, against the branch's code change |
| `fix-broken-stories` / `fix-accessibility-violations` | Fix what the build reported, then check the next build |
| `check-merge-readiness` | List what is left from Chromatic's side before review |
| `address-review-feedback` | Turn reviewer comments on snapshots into changes and draft replies |
| `triage-flaky-stories` / `reduce-snapshot-usage` | Maintenance: unstable stories and snapshot spend |

The server reads with each person's own Chromatic login and sees only the
projects that login can see.

### Setup

- **Claude Code:** the plugin is enabled in [`.claude/settings.json`](../.claude/settings.json).
  Trust the repository and accept the marketplace and plugin install when
  prompted (or run `/plugin install chromatic@chromatic`), then `/mcp` →
  `plugin:chromatic:chromatic` → authenticate.
- **Codex:** install by hand —
  `codex plugin marketplace add chromaui/chromatic-plugins`,
  `codex plugin add chromatic@chromatic`, then `codex mcp login chromatic`.
- **Verify:** ask *"What Chromatic tools do you have?"*, then *"What's the
  latest Chromatic build on this branch?"*.

### Which project

CareConnect has four Chromatic projects: Storybook (design system), Vitest
visual tests, React Native Storybook and Playwright. The root
[`chromatic.config.json`](../chromatic.config.json) names the Storybook project,
the same id as `packages/design-system/chromatic.config.json`, so the skills use
it without asking. For another project, give the agent its Chromatic link (the
`appId` in the URL). The root file is read only by agents: every Chromatic CLI
run in CI starts from its package directory.

### Rules

The [AGENTS.md](../AGENTS.md) rules apply: read the diff instead of rerunning,
at most one rerun for an infrastructure failure, and no accepting, denying or
quarantining tests unless the person you work for asks for that specific
change. Every such change goes through an approval prompt.

## Limits

- The web design system only. React Native Storybook has no components manifest,
  so `@careconnect/design-system-native` and `portal-mobile` are not covered.
- The published server has docs tools only; previews and tests need the local one.
- The published server shows `main` after the post-merge Chromatic build, not
  your branch.
- If Storybook is not running, the local server shows as failed or disconnected.
  That is expected.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| A config change has no effect | Agents read MCP config at startup — start a new session. Check you edited the repository file, not a user-level one with the same server name. |
| `401` or "Authorization needed" | Sign in again (Claude Code: `/mcp`; Codex: `codex mcp login careconnect-storybook`). Confirm you can open the project in Chromatic. |
| `invalid_redirect_uri` / redirect not registered | Remove any hand-edited user-level entry for the server and use the repository config. |
| `docs-list` misses a new component | The published server updates after the merge build on `main`. Use the local server for unmerged work. |
| Codex lists no CareConnect servers | The repository is not trusted in Codex yet. |

## Maintaining

- Manifest generation is set explicitly in
  [`packages/design-system/.storybook/main.ts`](../packages/design-system/.storybook/main.ts)
  (`features.componentsManifest`). Turning it off removes the published server's
  docs tools.
- Check what agents see: run `npm run storybook` and call `docs-list` on the local
  server.

References: [Chromatic — Publish your Storybook MCP server](https://www.chromatic.com/docs/mcp/) ·
[Storybook — MCP overview](https://storybook.js.org/docs/ai/mcp/overview)
