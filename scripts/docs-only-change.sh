#!/usr/bin/env bash
#
# scripts/docs-only-change.sh: does this pull request change documentation only?
# ci.yml and chromatic.yml call it right after checkout. When the answer is yes
# they skip their install, build and test steps, but every job still runs and
# reports, so the required checks never stay pending (AGENTS.md § Release flow).
#
# Documentation means Markdown anywhere and everything under docs/. No build,
# test or Storybook reads those files.
#
# Reads EVENT, BASE_SHA and HEAD_SHA from the environment and writes
# docs_only=true|false to $GITHUB_OUTPUT. Only pull requests can answer true:
# pushes to main and merge-queue refs always run everything. Any doubt (no base,
# a git error, no files) answers false. Needs the base commit fetched
# (`fetch-depth: 0`).
#
set -uo pipefail

answer() {
  echo "docs_only=$1" >> "${GITHUB_OUTPUT:-/dev/stdout}"
  echo "Docs-only change: $1 ($2)"
  exit 0
}

[[ "${EVENT:-}" == pull_request ]] || answer false "not a pull request"
[[ -n "${BASE_SHA:-}" && -n "${HEAD_SHA:-}" ]] || answer false "no base or head commit"
files="$(git diff --name-only "${BASE_SHA}...${HEAD_SHA}")" || answer false "git diff failed"
[[ -n "${files}" ]] || answer false "no changed files"

while IFS= read -r file; do
  case "${file}" in
    docs/* | *.md) ;;
    *) answer false "${file} is not documentation" ;;
  esac
done <<< "${files}"

answer true "$(wc -l <<< "${files}" | tr -d ' ') documentation file(s)"
