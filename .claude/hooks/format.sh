#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): format the edited file and apply Biome's safe fixes, so it
# matches what the pre-commit `biome check` expects. Never blocks.
file=$(jq -r '.tool_input.file_path // empty')
root=$(git rev-parse --show-toplevel 2>/dev/null) || root="$CLAUDE_PROJECT_DIR"
biome="$root/node_modules/.bin/biome"

if [[ -n "$file" && -f "$file" && -x "$biome" ]]; then
  "$biome" check --write --no-errors-on-unmatched --files-ignore-unknown=true "$file" >/dev/null 2>&1
fi
exit 0
