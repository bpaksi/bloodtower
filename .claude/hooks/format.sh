#!/usr/bin/env bash
# PostToolUse (Edit|Write|MultiEdit): format the edited file with Biome. Never blocks.
file=$(jq -r '.tool_input.file_path // empty')
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
biome="$root/node_modules/.bin/biome"

if [[ -n "$file" && -f "$file" && -x "$biome" ]]; then
  "$biome" format --write --no-errors-on-unmatched --files-ignore-unknown=true "$file" >/dev/null 2>&1
fi
exit 0
