#!/usr/bin/env bash
# PreToolUse (Bash): Claude never creates commits on main. Bob merges.
set -euo pipefail

input=$(cat)
command=$(jq -r '.tool_input.command // empty' <<<"$input")
cwd=$(jq -r '.cwd // empty' <<<"$input")

creates_commit='(^|[^[:alnum:]_-])git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-][^[:space:]]*)?)*[[:space:]]+(commit|merge|cherry-pick|revert|am)([[:space:]]|$)'
[[ "$command" =~ $creates_commit ]] || exit 0

branch=$(git -C "${cwd:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
moves_to_main='git[[:space:]]+(checkout|switch)[[:space:]]+(-[^[:space:]]+[[:space:]]+)*main([[:space:]]|;|&|$)'

if [[ "$branch" == "main" ]] || [[ "$command" =~ $moves_to_main ]]; then
  echo "Blocked: this would create a commit on main. Work on a <type>/<app>-<slug> branch; Bob merges to main (docs/sdlc.md)." >&2
  exit 2
fi
