#!/usr/bin/env bash
# Waits until a Chromatic build's changes have been reviewed, by polling the
# "UI Tests: …" commit status Chromatic posts for that build. Used by
# deploy.yml between staging and production: production deploys only once
# every visual change the staging run captured has been accepted.
#
#   pending  changes still need a decision (or the build is running) → wait
#   success  nothing changed, or every change was accepted           → exit 0
#   failure  a change was denied, or the build broke                 → exit 1
#   error
#
# Usage: wait-for-chromatic-review.sh <commit-sha> <build-url> [wait-minutes]
# Needs GH_TOKEN (statuses: read) and GH_REPO (owner/name).
set -euo pipefail

SHA=${1:-}
BUILD_URL=${2:-}
WAIT_MINUTES=${3:-60}
POLL_SECONDS=${POLL_SECONDS:-30}

if [ -z "$BUILD_URL" ] || [ -z "$SHA" ]; then
  echo "::error::The staging run produced no Chromatic build, so its snapshots cannot be reviewed. Check its 'Publish end-to-end snapshots to Chromatic' step (a Chromatic outage or a missing CHROMATIC_PLAYWRIGHT_PROJECT_TOKEN), then re-run this deploy."
  exit 1
fi

# The newest status Chromatic posted for this build. A commit can carry several
# builds (one per unit deployed from it), so match the build's own link.
latest_status() {
  gh api --paginate "repos/$GH_REPO/commits/$SHA/statuses?per_page=100" \
    --jq ".[] | select((.context | startswith(\"UI Tests:\")) and .target_url == \"$BUILD_URL\")
              | [.created_at, .state, .description] | @tsv" \
    | sort -r | awk 'NR == 1'
}

deadline=$(( $(date +%s) + WAIT_MINUTES * 60 ))
announced=false
last=""
while :; do
  status=$(latest_status)
  state=$(cut -f2 <<<"$status")
  description=$(cut -f3- <<<"$status")
  state=${state:-none}
  if [ "$state $description" != "$last" ]; then
    echo "$(date -u +%H:%M:%S) $state — ${description:-waiting for Chromatic to report}"
    last="$state $description"
  fi
  case "$state" in
    success)
      echo "Visual review passed: $description"
      exit 0 ;;
    failure|error)
      echo "::error::Chromatic reports \"$description\" for $BUILD_URL. A denied change or a broken build stops the release: fix it and release again."
      exit 1 ;;
  esac
  if ! $announced && [ "$state" = pending ]; then
    echo "::notice::Visual changes are waiting for review: $BUILD_URL — production deploys once they are accepted."
    announced=true
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "::error::No decision within $WAIT_MINUTES minutes on $BUILD_URL (${description:-no status}). Review it in Chromatic, then re-run this job (Re-run failed jobs) to deploy production."
    exit 1
  fi
  sleep "$POLL_SECONDS"
done
