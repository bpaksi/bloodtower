#!/usr/bin/env bash
# PreToolUse (Edit|Write|MultiEdit): on fix/* branches the failing test is committed first.
# After that first commit, test files are locked so the fix cannot bend the test.
set -euo pipefail

input=$(cat)
file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
cwd=$(jq -r '.cwd // empty' <<<"$input")

case "$file" in
  *.test.ts | *.test.tsx | *.spec.ts) ;;
  *) exit 0 ;;
esac

branch=$(git -C "${cwd:-.}" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
[[ "$branch" == fix/* ]] || exit 0

commits=$(git -C "${cwd:-.}" rev-list --count main..HEAD 2>/dev/null || echo 0)
if ((commits >= 1)); then
  echo "Blocked: $file is a test file and this fix/* branch already has its failing-test commit. Fix the code, not the test (/bugfix). If the test itself is wrong, tell Bob." >&2
  exit 2
fi
