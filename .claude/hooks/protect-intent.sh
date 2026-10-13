#!/usr/bin/env bash
# PreToolUse (Edit|Write|MultiEdit|NotebookEdit): intent files are Bob's words. Claude never edits them.
set -euo pipefail

file=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')

case "$file" in
  */apps/*/intent/* | apps/*/intent/*)
    echo "Blocked: $file is an intent file. Intent is written by Bob only (docs/sdlc.md). Put design changes in the app's spec.md, or ask Bob to write a new intent." >&2
    exit 2
    ;;
esac
