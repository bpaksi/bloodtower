#!/usr/bin/env bash
# PreToolUse (Edit|Write|MultiEdit|Bash): ultimatedarktower stays on its exact pin.
# To upgrade, Bob writes a new intent and this PINNED value changes in the same branch.
set -euo pipefail

PINNED="7.1.2"

input=$(cat)
tool=$(jq -r '.tool_name // empty' <<<"$input")

block() {
  echo "Blocked: $1 ultimatedarktower is pinned to exactly $PINNED (spec.md, library baseline). An upgrade needs a new intent from Bob." >&2
  exit 2
}

if [[ "$tool" == "Bash" ]]; then
  command=$(jq -r '.tool_input.command // empty' <<<"$input")
  # ultimatedarktowerdata is a different package and is not guarded here.
  if grep -Eq '(^|[^[:alnum:]])ultimatedarktower@' <<<"$command" &&
    ! grep -Eq "(^|[^[:alnum:]])ultimatedarktower@${PINNED//./\\.}([^0-9.A-Za-z-]|$)" <<<"$command"; then
    block "The command installs another version."
  fi
  word='[[:space:]]+[^[:space:];&|]+'
  if grep -Eq "(pnpm|npm|yarn)($word)*[[:space:]]+(add|install|i|up|update|upgrade)($word)*[[:space:]]+ultimatedarktower([[:space:];&|]|\$)" <<<"$command"; then
    block "The command names no version, so it would take the latest."
  fi
  exit 0
fi

file=$(jq -r '.tool_input.file_path // empty' <<<"$input")
[[ "$(basename "$file")" == "package.json" ]] || exit 0

pin_line='"ultimatedarktower"[[:space:]]*:[[:space:]]*"[^"]*"'
old=$(jq -r '[.tool_input.old_string?, (.tool_input.edits[]?.old_string)] | map(select(. != null)) | join("\n")' <<<"$input")
new=$(jq -r '[.tool_input.new_string?, .tool_input.content?, (.tool_input.edits[]?.new_string)] | map(select(. != null)) | join("\n")' <<<"$input")

versions=$(grep -Eo "$pin_line" <<<"$new" | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/' || true)
for version in $versions; do
  [[ "$version" == "$PINNED" ]] || block "The edit sets version \"$version\"."
done

if grep -Eq "$pin_line" <<<"$old" && [[ -z "$versions" ]]; then
  block "The edit removes the pinned version line."
fi

# A full rewrite must keep a pin that is already in the file.
if [[ "$tool" == "Write" && -f "$file" ]] && grep -Eq "$pin_line" "$file" && [[ -z "$versions" ]]; then
  block "The rewrite drops the pinned version line."
fi
