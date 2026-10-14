# google-tts

A Claude Code skill that turns text into spoken audio using Google's Gemini text-to-speech API (Google AI Studio), entirely from the terminal. Produces `.wav` directly, or `.mp3` via `ffmpeg`.

## Install

**Personal (all your projects):**

```bash
mkdir -p ~/.claude/skills
cp -r google-tts ~/.claude/skills/
```

**Project (this repo only):**

```bash
mkdir -p .claude/skills
cp -r google-tts .claude/skills/
git add .claude/skills/google-tts
```

Then in Claude Code, run `/google-tts "your text"` or just ask Claude to turn something into speech — the skill auto-triggers from its description.

## Configure the API key

1. Visit [Google AI Studio → API keys](https://aistudio.google.com/apikey) and create a key. You need a free or billed Google project.
2. Export it in your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export GEMINI_API_KEY="AIza..."
```

3. Restart Claude Code (or re-source the shell) so the env var is visible.

The key is read from the environment only; it is never accepted as a CLI flag and is redacted from any error text before printing.

## Use it

The output file's extension (`.wav` or `.mp3`) selects the format when `--format` is not passed. An explicit `--format` flag wins: a conflict with an explicitly passed `--out` extension is rejected rather than silently rewritten, and the default out path (`speech.wav`) is rewritten to `speech.mp3` when `--format mp3` is used. The underlying CLI is `scripts/generate.mjs`; Claude Code invokes it for you when the skill triggers, or you can run it yourself:

```bash
cd ~/.claude/skills/google-tts   # or your project path

# Inline text → WAV
node scripts/generate.mjs --text "Hello, world" --out hello.wav

# A document → MP3 (needs ffmpeg)
node scripts/generate.mjs --input article.md --out article.mp3

# Piped from another tool
git log -5 | node scripts/generate.mjs --stdin --out changelog.wav

# Pick a voice and style
node scripts/generate.mjs --text "Big news today." --voice Puck --style "excitable" --out news.mp3
```

## Options

| Flag | Default | Notes |
|---|---|---|
| `--text`, `--input <file>`, `--stdin` | — | exactly one |
| `--out, -o` | `speech.wav` | `.wav`/`.mp3` extension sets format when `--format` is not passed |
| `--format` | `wav` | `mp3` requires `ffmpeg`; explicit flag wins, and a mismatch with an explicit `--out` extension is rejected as a conflict |
| `--model, -m` | `gemini-3.8-flash-tts` | also `gemini-3.8-flash-lite-tts`, `gemini-3.1-flash-tts-preview` ([Google TTS docs](https://ai.google.dev/gemini-api/docs/speech-generation)) |
| `--voice, -v` | `Kore` | 30 prebuilt studio voices (see below) |
| `--style` | (none) | e.g. `"cheerful and friendly"` |
| `--timeout-ms` | `60000` | covers the whole request, including reading the body |
| `--max-retries` | `4` | transient errors only (so 5 total attempts max) |

### Prebuilt voices

Zephyr (bright), Puck (upbeat), Charon (informative), Kore (firm), Fenrir (excitable), Leda (youthful), Orus (firm), Aoede (breezy), Callirrhoe (easy-going), Autonoe (bright), Enceladus (breathy), Iapetus (clear), Umbriel (easy-going), Algieba (smooth), Despina (smooth), Erinome (clear), Algenib (gravelly), Rasalgethi (informative), Laomedeia (upbeat), Achernar (soft), Alnilam (firm), Schedar (even), Gacrux (mature), Pulcherrima (forward), Achird (friendly), Zubenelgenubi (casual), Vindemiatrix (gentle), Sadachbia (lively), Sadaltager (knowledgeable), Sulafat (warm). An extended library with hundreds more is available via `GET /v1beta/voices` ([docs](https://ai.google.dev/gemini-api/docs/speech-generation)).

## Error handling

**Rate limits (HTTP 429).** Retried with exponential backoff and jitter — roughly 1s, 2s, 4s, 8s for a 429, capped near 30s per attempt, so a single worst-case fallback wait is at most about 37.5s with jitter. A `Retry-After` header (numeric seconds or an HTTP date) is honored when Google supplies one and can be longer than that fallback cap. After the initial attempt plus 4 retries (5 total attempts) a 429 still fails, the error points to [AI Studio rate limits](https://aistudio.google.com/rate-limits) — per-project daily (RPD) limits reset at midnight Pacific time, while RPM/TPM are rolling windows, so check the dashboard to see which quota you actually hit. Google does not publish fixed free-tier RPM/RPD numbers in the docs.

**Payload size.** The script rejects text over 20,000 characters or a JSON body over 1 MB before sending. These are this CLI's chosen safety ceilings, not verified API token limits — the API's real limits vary by model and account tier. If the API itself rejects the payload with HTTP 413, the error tells you to shorten or split the text. The script never silently truncates or auto-splits — you decide the segmentation, since chunks become separate recordings that you'd have to concatenate with `ffmpeg`.

**Client errors are not retried.** 400/401/402/403/404 fail immediately with the API's own message (bad key, bad model, billing issue). Only 429, 408, and 5xx are retried ([Google troubleshooting guidance](https://ai.google.dev/gemini-api/docs/troubleshooting)).

**Atomic writes.** Output is written to a uniquely-named temp file in the target directory and renamed on success, so a failed write or ffmpeg conversion never leaves a partial or damaged output; an existing output file is never touched until the new one is complete. The API key is redacted from every printed diagnostic.

**Timeout coverage.** `--timeout-ms` is a whole-attempt deadline: connect, send, and reading the response body all share one budget. The body read is raced against the remaining budget, so a stalled body stream trips the deadline rather than hanging.

**Other failures** produce distinct exit codes: 1 argument errors, 2 input errors, 3 API errors (auth, rate limit, timeout, malformed response), 4 write/ffmpeg errors.

## Limitations

- Single-speaker only. For dialogue, synthesize per speaker and concatenate with ffmpeg ([Google multi-speaker guidance](https://ai.google.dev/gemini-api/docs/speech-generation)).
- Free-tier RPM/RPD limits vary by model and account; check [AI Studio](https://aistudio.google.com/rate-limits) for your current quota.
- WAV output has no dependencies; MP3 needs `ffmpeg` (`brew install ffmpeg`). ffmpeg is checked before the API call, so a missing binary fails fast without billing you.
- The API returns complete WAV (RIFF header, 24 kHz, mono, 16-bit PCM) on unary requests, so no re-muxing is needed for `.wav` output ([Google TTS docs](https://ai.google.dev/gemini-api/docs/speech-generation)).
- Tests use mocked HTTP responses; a live Gemini request was not part of this build session.

## Layout

```
google-tts/
  SKILL.md             Claude Code skill definition (frontmatter + instructions)
  README.md            This file
  scripts/
    generate.mjs       The CLI (Node 18+, no dependencies)
  tests/
    generate.test.mjs  Unit + subprocess tests with mocked HTTP (no API key needed)
    mock-fetch.cjs      Test-only CommonJS preload that mocks globalThis.fetch
```

Run the tests: `node tests/generate.test.mjs`
