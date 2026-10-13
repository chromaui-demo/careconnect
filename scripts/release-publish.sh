#!/usr/bin/env bash
# Manual fallback for the release workflow (.github/workflows/release.yml):
# tag every workspace at its current version and create GitHub Releases for
# the release units. Private monorepo — nothing is pushed to a registry.
#
# Run on an up-to-date main after `npm run version-packages` has been merged.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: working tree is not clean — commit or stash before tagging." >&2
  exit 1
fi

echo "==> Creating git tags for any workspace whose version is untagged..."
npx changeset publish

echo "==> Pushing tags..."
git push origin --tags

if command -v gh >/dev/null 2>&1; then
  echo "==> Creating GitHub Releases for release units..."
  node scripts/github-releases.mjs "$@"
else
  echo "gh CLI not found — tags pushed; create GitHub Releases with: node scripts/github-releases.mjs"
fi
