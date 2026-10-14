# tts-explorer

A Next.js (App Router) and TypeScript tool for auditioning Google Gemini text-to-speech voices for narrator and character lines.

## Setup
Requires Node 22.13 or newer and pnpm.

```bash
pnpm install                       # from the monorepo root
cp .env.example .env.local         # then set GEMINI_API_KEY
pnpm dev                           # http://localhost:3010
```
Other scripts: `pnpm typecheck`, `pnpm build`, `pnpm start`, `pnpm lint` (Biome).

## How it works
- `app/api/tts`: POST handler that calls Gemini and saves a WAV to `./output` (gitignored).
- `app/output/[file]`: serves the saved WAVs. `app/api/meta` and `app/api/history` return the model/voice lists and the generation history.
- `gemini-3.8-*` models use the Interactions API. There, the text is spoken verbatim, the style goes in `speech_metadata.style`, and inline `<sigh>`/`<short pause>` tags work. The 2.5 and 3.1-preview models use `generateContent`, with the style prepended to the prompt. When the API returns raw 24 kHz 16-bit mono PCM, it is wrapped in a WAV header.
- There are 30 prebuilt voices, and multi-speaker requests allow at most 2 speakers. The backstory and scene fields are folded into the style, so keep them short: Google warns that long persona text causes voice drift.

## Scenarios (story mode)
The **Scenarios** tab lists the stories in `data/stories/` (Story → Scenarios). Pick a scenario to see its scene, its characters (with backstory and voice) and the script. **Generate scene** renders each line with that character's voice and style. Each line is cached in `audio-cache/` under a hash of (model, voice, style, text), and the lines are joined into one WAV with 400 ms gaps. Each line can also be played on its own. Selecting a scenario that is already cached plays immediately and makes no API calls.

`audio-cache/` is committed so pre-generated audio ships with the repo. User generations from the free-form tab go to `output/`, which is gitignored.

**Quota note:** the Gemini free tier allows about 3 requests/min and **10 requests/day per TTS model**. A full scenario takes 14 to 21 requests, so pre-generating everything needs a paid tier or several days. Generation is resumable: rerun it and only the missing lines are generated. With the server running:

```bash
for s in lantern-and-bell open-grave children-of-the-night dawn-in-the-tomb; do
  curl -s localhost:3010/api/scenarios/render -H 'Content-Type: application/json' \
    -d "{\"storyId\":\"dracula\",\"scenarioId\":\"$s\",\"generate\":true}"; echo
done
```
