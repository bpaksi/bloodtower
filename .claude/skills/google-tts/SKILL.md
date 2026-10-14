---
name: google-tts
description: Generate spoken audio (.wav or .mp3) from text using Google AI Studio / Gemini's text-to-speech API, directly from the terminal. Use when the user wants to turn text into an audio file, hear a script read aloud, produce voiceover, or narrate a document.
allowed-tools: Bash
---

# Google TTS skill

Generate an audio file from text using Google's Gemini TTS (Google AI Studio) API.

## Prerequisites

1. `GEMINI_API_KEY` must be exported in the environment. If unset, tell the user to get one at https://aistudio.google.com/apikey and `export GEMINI_API_KEY=<key>`.
2. For MP3 output, `ffmpeg` must be installed (`brew install ffmpeg` on macOS). WAV output has no dependencies. The script checks for ffmpeg before calling the API.
3. Requires Node.js 18+ (for global `fetch` and `AbortController`). Check with `node --version` if unsure.

## Usage

Run the bundled script. `${CLAUDE_SKILL_DIR}` is the skill's directory. The output file's extension (`.wav` or `.mp3`) sets the format automatically, or pass `--format` explicitly.

```bash
# Inline text → WAV (default voice Kore, model gemini-3.8-flash-tts)
node "${CLAUDE_SKILL_DIR}/scripts/generate.mjs" --text "Hello world" --out hello.wav

# A document → MP3 (ffmpeg required)
node "${CLAUDE_SKILL_DIR}/scripts/generate.mjs" --input notes.txt --out notes.mp3

# Piped from stdin
cat article.md | node "${CLAUDE_SKILL_DIR}/scripts/generate.mjs" --stdin --out article.wav

# Choose voice and style
node "${CLAUDE_SKILL_DIR}/scripts/generate.mjs" --text "Big news today." --voice Puck --style "excitable" --out news.wav
```

## Options

- `--text`, `--input <file>`, or `--stdin` — exactly one of these.
- `--out <path>` — output path. A `.wav` or `.mp3` extension picks the format when `--format` is not passed; an explicit `--format` flag wins, and a mismatch with an explicitly passed `--out` extension is rejected as a conflict (the default `speech.wav` out is rewritten to `speech.mp3` for `--format mp3`).
- `--format wav|mp3` — overrides the extension-based default; explicit flag wins, mismatch with an explicit `--out` extension is a conflict.
- `--model <id>` — default `gemini-3.8-flash-tts`. Other options: `gemini-3.8-flash-lite-tts`, `gemini-3.1-flash-tts-preview`.
- `--voice <name>` — default `Kore`. 30 prebuilt studio voices listed in the README.
- `--style <desc>` — optional, e.g. `--style "cheerful and friendly"`.
- `--timeout-ms`, `--max-retries` — tune backoff behavior.

## Behavior notes

- Single-speaker only. For multi-character dialogue, synthesize each speaker's turn separately and concatenate with ffmpeg.
- Text longer than 20,000 characters or a JSON body over 1 MB is rejected locally (this CLI's chosen safety ceilings, not verified API token limits). Split into chunks rather than truncating.
- Retries transient HTTP 429/5xx/408 errors with exponential backoff + jitter (fallback capped near 30s per attempt), honoring a numeric or date-format `Retry-After` header if Google supplies one. Up to 4 retries after the initial attempt. Non-retryable errors (400/401/402/403/404/413) fail immediately with a clear message.
- Output files are written atomically (temp file + rename), so a failed write or conversion never leaves a partial or damaged file and never touches an existing output.
- `--timeout-ms` covers connect, send, and reading the response body — a stalled body stream trips the timeout rather than hanging.
- The API key is redacted from every printed diagnostic.
- On 429, point the user to https://aistudio.google.com/rate-limits to see which per-project quota was hit (RPD daily limits reset at midnight Pacific time; RPM/TPM are rolling windows).

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Argument/flag error |
| 2 | Input error (missing file, empty text, conflicting sources) |
| 3 | API error (auth, rate limit, timeout, malformed response) |
| 4 | Write/ffmpeg conversion error |
