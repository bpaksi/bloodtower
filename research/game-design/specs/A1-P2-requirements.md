# A1 + P2 S2–S9: design and acceptance requirements

Design-only handoff by Gamewright, 2026-11-08 (ET). No implementation, media creation, release, payment or approval of art is authorized by this document. Existing decided cards win over historical prose. Additional choices below are explicitly **Default (Gamewright)**, not new Bob rulings. Items marked **DECISION FOR WARDEN** are recommendations up the chain, not questions for Bob or permission to start paid work.

## Sources and boundary

- **P2**: [bpaksi/talking-avatar, plans/P2-asset-studio.md](https://github.com/bpaksi/talking-avatar/blob/main/plans/P2-asset-studio.md), read in full, revision approved 2026-11-07; S2–S9 only. Its predecessor [plans/P1-plan.md](https://github.com/bpaksi/talking-avatar/blob/main/plans/P1-plan.md), S3 and Pauses/Formats, supplies P2 S4's inherited voice acceptance. No changes to that repo.
- **A1**: [apps/bloodtower/plans/A1-asset-adapter.md](../../../apps/bloodtower/plans/A1-asset-adapter.md), steps 2–8 and G-A1. Baseline `275ddf6` includes merged #392: step 1 already changed `apps/bloodtower/src/web/next.config.ts` as well as packages/imports/lockfile. Do not redo it. #389/#390 recorded revision approval and cards-as-intent.
- **C5-05**: [plan](../../../apps/bloodtower/plans/briefs/C5/05-art-through-a1/plan.md), [eval](../../../apps/bloodtower/plans/briefs/C5/05-art-through-a1/eval.md), [approval](../../../apps/bloodtower/plans/briefs/C5/05-art-through-a1/approval.md). Cover `painting.cover`, one 16:9 cover, no Loremaster portrait: approval change note, Nov 2. Final all-art C5 run is larger than this adapter gate.
- **Copy**: [research/stories/ruined-keep/script.md](../../stories/ruined-keep/script.md), accepted 1.0 text; DEC-832/833/834/836 govern story ownership and copy. Do not synthesize `[COPY: ...]` placeholders or invent story words.
- **Cards** below link to `../cards/<ID>.md`. Key contracts: [DEC-199](../cards/DEC-199.md), [DEC-201](../cards/DEC-201.md), [DEC-202](../cards/DEC-202.md), [DEC-206](../cards/DEC-206.md), [DEC-207](../cards/DEC-207.md), [DEC-349](../cards/DEC-349.md), [DEC-575](../cards/DEC-575.md), [DEC-576](../cards/DEC-576.md), [DEC-622](../cards/DEC-622.md), [DEC-719](../cards/DEC-719.md), [DEC-839](../cards/DEC-839.md), [DEC-843](../cards/DEC-843.md), [DEC-844](../cards/DEC-844.md); [MEC-067](../cards/MEC-067.md), [MEC-073](../cards/MEC-073.md), [UI-002](../cards/UI-002.md), [UI-003](../cards/UI-003.md).

This is **asset-studio P2**, not Stage2 P9 or Bloodtower P-009. No dependency from stock-tracker `bpaksi/stage2` is established. P2 S1 formats/player 0.2.0 → A1 step 1 (merged); P2 S2 → S3 → parallel S4/S5/S7/S8 → S6 (after S5) → S9 published 0.2.x → A1 step 2 → parallel 3/4/6 → 5 → parallel 7/8 → G-A1. A1 8 also waits for 4/6. Real-world gates, not a mock/local `file:` dependency, release each downstream batch. P2 S10–S15 and A1 9–10/G-A1b are 1.1, excluded.

## Common acceptance and defaults

- **C-01** Every listed AC is pass/fail; PR evidence names the AC ID, command/test, result and fixture. Unit failures name asset ID plus field/rule/code; browser evidence records viewport. A deliberate wrong fixture must fail, not just a happy path pass.
- **C-02** CI uses deterministic fake image/TTS providers, temp work folders and stub audio conversion. Zero paid calls, credentials, Bluetooth hardware, Rhubarb, whisper or real `afconvert` are needed. Local manual evidence remains separate (P2/P1 CI policy; A1 step 4).
- **C-03** Bloodtower art/voice only on Story board; acting iPads may repeat silent NPC text and controls, never story pictures/audio (DEC-201/349, MEC-073). **Default (Gamewright) D1:** reject a Bloodtower story-art target of `ipad` with file/path/rule, rather than silently generating or discarding it. Generic P2 still supports arbitrary consumer profiles, including its example `ipad`.
- **C-04** **Default (Gamewright) D2:** eligibility is explicit once-only, fixed text, known voiced speaker; repeated/generic lines and any `{...}` substitutions are omitted from `lines[]` and listed as silent captions. Unknown repeatability fails closed to silent, with a diagnostic. Two identical texts in distinct explicitly once-only moments are not automatically treated as repeated. DEC-349 is not a ban on intentional replay of a completed moment (DEC-204); restore must not auto-fire a consumed moment again.
- **C-05** Only studio/explicit human CLI approval sets final; render/needs/pack/skills cannot. Rejected/missing files never ship. Source hash/status survive the whole chain (DEC-384/386/839). **Default (Gamewright) D3:** failed writes/conversions leave the prior good index/export/pack intact, use temp-then-commit; errors cannot silently replace final media with failed output.
- **C-06** No new engine fallback wiring is hidden in A1. **Default (Gamewright) D4:** run a no-story-art regression using existing legacy/default fallback and a no-tower regression through the same demo. Each reaches its next normal state with captions, no uncaught error and no hardware wait. Missing *declared/referenced* media still fails release lint; the no-art fixture removes story overrides/references and exercises engine defaults, not a corrupt release index. DEC-199/202; A1 Out of scope.
- **C-07** No Q-451 named-camera playback promise. Use a still for G-A1; retain moment camera data without pretending P2 0.3's Painting editor/player ships in 0.2 (DEC-843, UI-003). No new game buttons or changed locked copy.

## P2 steps S2–S9 (requirements only; paths in talking-avatar)

### S2 — Job, work index, notes, camera schemas

**Depends:** S1. **Touches:** `packages/formats/**`, `docs/job-contract.md` (P2 S2).
**Locks:** DEC-385/622/623/719/839/840/842/844; MEC-067. No consumer UI change.

- [ ] **P2-02a** `jobSchema` accepts documented JSON example and generated neutral fixture; `derivedIds` has exactly all explicit assets plus portrait per requested mood and `glow.<entry>` per `glow:true`, with no duplicates. Cast with no voice still has all mood stills. 0.2 never requires mouths/chin.
- [ ] **P2-02b** One negative per: duplicate explicit/derived ID; uppercase/invalid ID; absent/voiceless line speaker; line/portrait mood outside speaker list; picture lacking source and prompt; unknown profile; unknown moment picture; invalid camera move/speed; out-of-bounds focus; any job `status`, including nested. Report field and ID. Seven moves and three speeds only (DEC-844).
- [ ] **P2-02c** Camera track uses locked `docs/camera-track-contract.md` v1 schema (P2 cites merged #13), not an unchecked object. Index permits missing/draft/final/rejected; notes keyed by ID; camera edits keyed by moment; round-trip fixtures preserve values.
- [ ] **P2-02d** Arbitrary consumer kinds/moods survive unchanged; reject bad structure/references, not an unfamiliar label. BT whitelist belongs in A1 3.

**Edges — Default (Gamewright) D5:** empty arrays valid; duplicate derived-vs-explicit IDs fail; optional variant omitted is valid; zero/negative dimensions fail; focus requires positive w/h and x+w/y+h ≤1. Source paths outside a permitted job/source root and story IDs containing traversal fail before any write. Check all at CLI boundary if formats cannot enforce filesystem rules. Audio-only narrator output is locked, but its job derivation semantics need the narrow D8 correction below; do not change legacy consumer cast schemas.

### S3 — CLI, settings, immutable store, needs

**Depends:** S2. **Touches:** `packages/cli/src/{bin,config,store,needs}/**`, `packages/cli/package.json` (P2 S3).
**Locks:** DEC-382/384/386/394/622/839/844. No game UI change.

- [ ] **P2-03a** Every non-config headless command without a work folder exits nonzero `AS-CONFIG-1` with exact line `Set the work folder: asset-studio config set workFolder <path>`; no provider call or media/index mutation occurs. The S7 studio path-setup form is the explicit interactive exception. macOS settings path is `~/Library/Application Support/asset-studio/settings.json`; flag overrides only this invocation.
- [ ] **P2-03b** `needs`/`--json` contain each derived ID once with kind/status; absent index → missing; all four existing statuses shown faithfully. Deterministic sort by ID (**Default (Gamewright) D5**).
- [ ] **P2-03c** approve/reject change only named ID; reject also saves exact note. Two identical renders reuse one hash file; changed inputs create another, old bytes retained. Temp-folder tests prove both.

**Edges — Default (Gamewright) D5:** unknown ID approval/rejection and missing/corrupt file approval fail, not create a fake final; invalid settings/unwritable folder reports code without repair-by-deletion; separate stories cannot collide; concurrent mutation must serialize or fail with a coded error. Existing rejected/final statuses do not vanish on `needs`.

### S4 — Voice, inherited P1 S3

**Depends:** S3. **Touches:** `packages/cli/src/{tts,voice}/**` (P2 S4; inherited cache behavior stays within these paths unless implementer widens Touches before work).
**Locks:** DEC-337/349/383/386/839/843; UI-002 caption guarantee; P1 S3/Pauses/Formats.

- [ ] **P2-04a** `render --only voice` produces PCM WAV master plus playable m4a draft per successful line; index is draft and keeps speaker/text/source. Missing `GEMINI_API_KEY` returns `AS-VOICE-1`; test logs/index/notes never contain the fake secret.
- [ ] **P2-04b** `Welcome. [pause 0.5] Follow me.` calls fake TTS twice with exactly `Welcome.` and `Follow me.`; style separate, never spoken; silence has round(0.5 × sampleRate) zero frames/channel. Pause-only uses 22050 Hz mono; pause zero inserts none.
- [ ] **P2-04c** Cache hits skip API; individually changing text/provider/voiceId/style misses. Gemini adapter covers Interactions for 3.8 and generateContent for older models, including PCM-to-WAV wrap (P2 S4 source path).
- [ ] **P2-04d** A failed segment, mismatched segment formats/rates/channels or decode failure produces caption-only line metadata, no partial shipped audio, no provider failover; log ID/code and final nonzero failed count, while later lines run. Preserve text, fallback words, audio null and empty cues per P1.

**Edges — Default (Gamewright) D6:** P1's missing-mouth preflight does not apply to 0.2 audio-only narration. Preserve non-art preflight: invalid pause, unknown provider/voice, >20 s estimated duration rejected before paid call (20 exactly passes); empty spoken segments make no TTS call. Caption-only failure metadata stays in work folder, status missing, not an exportable final. Do not require Rhubarb/whisper or invent mouth cues in S4.

### S5 — Source pictures, stills, masks

**Depends:** S3. **Touches:** `packages/cli/src/{picture,glow}/**`, `packages/cli/package.json`, `pnpm-lock.yaml` (P2 S5).
**Locks:** DEC-386/401/719/843/844; BT consumer limits DEC-206/207/575/576, not global P2 policy.

- [ ] **P2-05a** `render --only picture` decodes generated source, preserves master, emits WebP at each requested exact profile dimension using cover crop. All requested cast moods emit stills, no mouths; `sharp` exact-pinned.
- [ ] **P2-05b** `masters/glow.<entry>.png` grayscale mask becomes grayscale WebP at paired painting's pixel size; wrong size yields `AS-GLOW-1`, ID and both sizes. Lit-region alignment verified by overlay, not dimension check alone.
- [ ] **P2-05c** Two source/profile combinations yield separate stable indexed outputs without overwrite or lost profile; rerun identical inputs is a cache hit.

**Edges — Default (Gamewright) D5:** colored masks fail (R=G=B required); unreadable source or missing required hand master reports coded missing asset, never black placeholder-as-final; profile derivation must transform mask and painting identically. Master original never resaved in place.

### S6 — AI pictures/stills/masks

**Depends:** S5. **Touches:** `packages/cli/src/ai/**` (P2 S6).
**Locks:** DEC-384/392/719/839/843/844.

- [ ] **P2-06a** fake `ImageProvider` receives style/references/prompt; produces every missing picture/still/mask as draft. Never talking mouths in 0.2. A successful retry turns a missing asset into draft, never final.
- [ ] **P2-06b** One ID's redo note reaches only that request; clear it only after stored new draft and index commit; failed request leaves note for retry. Original bytes/hash survive.
- [ ] **P2-06c** Fake failure on middle ID logs ID/code, leaves it missing, then renders next ID and exits nonzero with summary. Already final/rejected files are not silently regenerated.

**Edges — Default (Gamewright) D7:** reject is rerendered only by an explicit redo request (note identifies ID); ordinary missing-only runs leave rejected entries alone. Fake malformed dimensions/non-grayscale output fails media validation before draft commit. Requests cannot mutate job input or other story folders.

### S7 — Local review studio

**Depends:** S3; S4/S5 outputs used as integration evidence. **Touches:** `packages/studio/**` (P2 S7).
**Locks:** DEC-382/384/403/839/843. No new Bloodtower UI.

- [ ] **P2-07a** listener binds 127.0.0.1 only. At 1440×900, no configured folder shows only path form; saving/changing it uses CLI config library. No job rendered before successful setup.
- [ ] **P2-07b** needs list filters by kind/status; plays m4a with exact caption text, displays each picture profile/mood still at declared size (scrolling allowed), mask overlay matches painting, supplied sound plays. No portrait for Loremaster.
- [ ] **P2-07c** approve/reject use CLI library; refresh proves persisted status/note. Induced invalid path, unknown ID, decode failure and save failure show visible code; failure never shows successful approval.

**Edges — Default (Gamewright) D5:** empty list has explicit empty state; double clicks cannot create conflicting status writes; a stale open review cannot approve different newly-rendered bytes without refresh/review. Review browser test uses fake assets; no host/port exposure or cloud upload.

### S8 — Export contract

**Depends:** S3. **Touches:** `packages/cli/src/export/**`, `docs/export-contract.md` (P2 S8).
**Locks:** DEC-386/622/839/843/844.

- [ ] **P2-08a** final-only export and `--drafts` export compare against exact ID sets; exported file hash/extension matches bytes. `export-index.json` keeps kind, file, pixel size/duration, status, line speaker/text and job source.
- [ ] **P2-08b** Explicit tests exclude missing/rejected/master/WAV, settings/secrets/notes and caption-only failed audio. Empty final set exports empty valid index, no fake success media.
- [ ] **P2-08c** Consumer can resolve every index file without work-folder paths; document multi-profile mapping and decoder-readable formats. Default D3 protects prior completed export on copy failure.

**Edges — Default (Gamewright) D5:** a final index entry with missing file/hash mismatch fails export; out folder cannot be inside work store or overwrite job/master; same ID/multiple profiles retain distinct mapping. 0.2 preserves input moment data in job but makes no studio camera edits/export promise (P2 S13 is later).

### S9 — Published 0.2 integration gate

**Depends:** S4/S5/S6/S7/S8. **Touches:** `CHANGELOG.md`, `packages/*/package.json` (P2 S9).
**Locks:** DEC-383/390/843. No game UI change.

- [ ] **P2-09a** tagged release publishes all four public packages (`formats`, `player`, `cli`, `studio`) at coherent exact versions with npm provenance; existing v2/avatar/player behavior/tests unchanged.
- [ ] **P2-09b** fresh temp folder installs exact npm versions (not workspace/link/file); neutral example `needs → render` using fake providers `→ export` succeeds, index resolves every shipped file, studio can review it. Record versions/tag and evidence.
- [ ] **P2-09c** fresh run with missing work folder fails correctly, failed provider run stays nonzero; no external credentials/API charges. No BT story art or RtDT material in public examples.

**Edges — Default (Gamewright) D5:** an unreleased workspace build is not gate evidence; publish failure/missing package/provenance keeps gate closed. Publication is a separate authorized release action, not part of this docs PR.

## A1 steps 2–8 (paths in Bloodtower)

### Step 2 — Pack → generic job/needs

**Depends:** step 1 merged and P2 S9 npm release. **Touches:** `apps/bloodtower/src/assets/**`, `apps/bloodtower/package.json`, root `package.json`, `pnpm-lock.yaml`, `scripts/check-imports.mjs` if required, `apps/bloodtower/spec.md` (A1 2). Step 1's corrected Touches includes `apps/bloodtower/src/web/next.config.ts`; no reason to edit it here without a new dependency finding.
**Locks:** DEC-344/349/383/396/622/623/719/839/840/844, MEC-067/073, UI-002/003.

- [ ] **A1-02a** `pnpm assets:needs test|dracula [--json]` writes work-folder job passing published `jobSchema`, uses existing pack readers without changing runtime formats, prints exact ID/kind/status list, hashes actual source files deterministically; no status anywhere in job. For playable `test`, read existing inline chapter/game effects and assets; do not require `script.yaml`/`cast.yaml`. Read Dracula's authoring files as tooling input only, never make it playable as a side effect. Step 2 generates job/needs, not `assets[]` or runtime chapters; step 5 generates the shipped index.
- [ ] **A1-02b** Tests pin Dracula cast/line/picture counts after eligibility filtering, and exact test-fixture sets. Cast without voiced lines has no voice and no mouths; five moods neutral/friendly/scared/angry/sly. Loremaster is audio-only (D8), not a forced portrait.
- [ ] **A1-02c** Picture/sound IDs preserved, `glow.cover` derived once, moment retains camera data; no tower cue in job. D1/D2 tests prove iPad art rejected and fixed repeated/substituted lines excluded; one eligible fixed one-off line included unchanged.
- [ ] **A1-02d** Invalid input returns file/path/rule; absent optional split script is not an error for a valid inline pack. Do not fabricate a runtime script or infer approval of inline legacy narrator text. Keep those legacy captions unchanged and silent; use only approved copy for new demo voice input. Source-only fixtures may be generated in tests, never rewritten by `needs`.

**D8 — approved result versus new technical decision:**

- **LOCKED:** Loremaster is audio + captions, no talking portrait in 1.0 (C5-05 `approval.md`, Nov 2 change note recording Bob's Nov 1 ruling; DEC-843; Q-450 corroborates the audio/captions ruling). DEC-349 fixes which lines may be voiced; UI-003/DEC-056 permit narration over a Painting. These do **not** approve a particular job encoding or remove legacy cast requirements.
- **Observed, not approved/new main contract:** open [asset-studio #16](https://github.com/bpaksi/asset-studio/pull/16), head `ebbbb599e1bc63526466d7f19fa5dd9b9dd8dbc3`, `packages/formats/src/job.ts`: `moods: []` and omitted portraits/line mood already validate. But duplicate-ID claiming and `derivedIds()` unconditionally create `portrait.<speaker>`, even for that empty list. Therefore #16 **does not yet implement zero-portrait audio-only narration**. Its new job schema is distinct from Dracula's existing `cast.yaml`, which requires portrait/mouth assets; do not alter Dracula to get around this.
- **DECISION FOR WARDEN — Default (Gamewright):** retain #16's existing job fields; a voiced job cast member with zero requested moods derives zero portraits. In both collision checking and `derivedIds`, derive neutral only when `neutral` is actually requested; derive other portraits only for listed moods. Omitted line mood stays permitted; an explicit mood still must belong to the list. Add an empty-moods voiced-speaker test proving one voice line, zero portrait/mouth IDs and no false portrait-ID collision. All nonempty five-mood examples remain unchanged. This is a **new derivation decision**, not an already-locked P2 rule and not a new schema. Wright/Anvil resolve it in the existing S2 lane before S9 publishes the contract A1 consumes; no separate BT migration prerequisite.
- **A1 ownership:** adapter may build that generic job representation from approved narration input; it must not write `cast.yaml`, invent speaker flags, relax the legacy Dracula schema, or add a runtime script loader. If an accepted line has no executable inline trigger yet, preserve it as demo tooling input; enabling a new seal-break event is not part of a title/asset-registration slice.

### Step 3 — Bloodtower lint

**Depends:** 2. **Touches:** `apps/bloodtower/src/assets/lint/**`, `apps/bloodtower/src/server/scripts/packLint.ts` (A1 3).
**Locks:** DEC-062/199/202/207/344/348/576/622/719/844, MEC-067, UI-002/003.

- [ ] **A1-03a** `pack:lint` checks present asset index; fixture per failure: nonmatching mouth frame size/outside-anchor pixel change/anchor bounds, >120 displayed characters, absent dark-edge treatment, unsupported picture/sound kind/mood, glow size mismatch, referenced ID missing, draft in release. Failures identify rule and ID; ≤120 and exactly matching dimensions pass.
- [ ] **A1-03b** Picture kinds painting/portrait/foe/place/item/cover; sound effect/ambience; glow is a paired mask, not an invalid picture kind. No bespoke `tomb`/`map` kind sneaks through by using an old checklist ID.
- [ ] **A1-03c** DEC-348 has one named skipped test with reason until shared cast exists; no new 110-face production task. Chin field not mandatory until A1 9/0.3; existing Keeper tests unchanged.

**Edges — Default (Gamewright) D9:** count visible caption Unicode code points after pause markup removal; 120 passes/121 fails; render screenshot still must fit ≤3 lines. For generated portrait fixtures use known black-vignette recipe and an inverse deliberately unvignetted fixture, plus visual review at 1080p; do not claim a scalar corner-brightness test proves every artistic edge. New stills target chin ≤0.74 for future compatibility, no 0.2 schema invention.

### Step 4 — Render wrapper

**Depends:** 2/P2 0.2. **Touches:** `apps/bloodtower/src/assets/render/**` (A1 4).
**Locks:** DEC-349/383/384/392/394/843; UI-003.

- [ ] **A1-04a** `assets:render <story> [--ai] [--only voice|picture]` calls needs then CLI library with generated job; reports made/failed/code/still-missing counts, nonzero for any failure. Test selected mode leaves other media untouched; avatar mode not offered in 0.2.
- [ ] **A1-04b** missing config exits with exact AS-CONFIG-1 text, no render/write/API side effect. Fake-provider CI covers success, partial failure, retry note persistence and missing key without a real key.
- [ ] **A1-04c** A1's three real Dracula lines remain separately recorded manual evidence only with approved spend/access; they are not replaced by CI fakes or implied by this doc. Demo Keep line remains Loremaster only.

**Edges:** D2/D3/D6/D7; render never changes copy, pack files, human final approval or source IDs.

### Step 5 — Export/lint/copy/index/loader

**Depends:** 3/4. **Touches:** `apps/bloodtower/src/assets/pack/**`, `apps/bloodtower/src/server/pack/{assets.ts,load.ts}` and tests, `packs/test/assets/**` (A1 5).
**Locks:** DEC-199/202/386/622/839/843/844; UI-003.

- [ ] **A1-05a** export → lint before any pack mutation; finals only, optional drafts with flag. Hash WebP/m4a, ID/kind/size/captions/status from export, never generated final. Exact expected files/index asserted; missing/rejected/WAV/masters absent.
- [ ] **A1-05b** stale export source warns with story and proceeds as specified; do not write camera edits/YAML in 0.2. New index removes only previously indexed files it no longer names; unrelated sentinel and source `cover.png` survive.
- [ ] **A1-05c** indexed ID resolves; no index uses existing legacy path. Full existing pack tests plus `pack:lint:all` pass. D4 no-art/no-tower regressions reach next state; declared missing asset remains lint failure, never silently blessed as final.

**Edges — Default (Gamewright) D10:** reject export path traversal, symlink escape, corrupt/hash-mismatched file before copy; D3 atomicity protects old pack if lint/copy fails. Header/pack/source hash remains stable across identical generated output; exclude derived output from hash input to avoid self-invalidating loop.

### Step 6 — One-time imports and retirement

**Depends:** 2. **Touches:** `apps/bloodtower/src/assets/import/**`, `apps/Visuals/**` (only tts-explorer removal intended), `.claude/skills/google-tts/**`, root README/CLAUDE references. **Default (Gamewright) D11:** dependency removal also owns root `pnpm-lock.yaml` and workspace manifests if they actually reference removed package; record widened Touches before coding. Source A1 6.
**Locks:** DEC-342/386/388/398/622/839.

- [ ] **A1-06a** `assets:import funeral` imports only source voice/still IDs matching actual `packs/dracula/script.yaml`, as drafts/masters; matched/skipped/failed totals asserted, source POC hashes unchanged. Clips not imported.
- [ ] **A1-06b** `assets:import test` reuses exactly place.village/bazaar/citadel/sanctuary; all drafts, not relabeled finals; existing JPEG sources unchanged. Rerun does not duplicate store bytes or reset human approval (D11).
- [ ] **A1-06c** removal happens only after recorded successful OneDrive backup `Backups/BloodTower/tts-explorer-cache/`; no backup evidence → retirement portion stops, not deletion-by-assumption. Existing package/import checks pass after legitimate removal.

**Edges — Default (Gamewright) D11:** missing script/source/backup produces a coded stop, no partial removal; preserve unmatched originals and list them; corrupt audio/image counted failed, not silently imported. Actual source IDs are enumerated from script at implementation time, not fabricated from the prose approval checklist.

### Step 7 — Debug asset IDs

**Depends:** 5. **Touches:** `apps/bloodtower/src/web/components/board/**`, `apps/bloodtower/src/server/config.ts` (A1 7).
**Locks:** DEC-392; UI-002/003/035/036.

- [ ] **A1-07a** flag exactly `SHOW_ASSET_IDS=1`: current Portrait/Painting/Scroll/Reveal ID small, bottom-left inside safe area; omitted flag shows nothing; unit tests plus 1920×1080 screenshot. No new in-game reporting button.
- [ ] **A1-07b** changing current asset updates label, no stale ID on transition. Existing Keeper/board behavior unchanged, no debug ID leaks to iPads.

**Edges — Default (Gamewright) D12:** no current media ID → no label, never literal `undefined`; assert bounds inside existing safe-area container and non-overlap with caption/control text rather than inventing new padding. Flag off is release default.

### Step 8 — bt-assets skill

**Depends:** 4/5/6. **Touches:** `.claude/skills/bt-assets/**`, root `CLAUDE.md` Commands table (A1 8).
**Locks:** DEC-384/388/392/398/839/843.

- [ ] **A1-08a** transcript/stub CLI test runs needs → render → pack for one chosen story, studio/AI selected once; redo passes exact ID/note to that story, successful redo draft clears note; import uses step 6 entry point.
- [ ] **A1-08b** injected failure at each command stops subsequent commands and displays original code; no automatic approve or status promotion, no hidden paid fallback/provider, no silent story switch.
- [ ] **A1-08c** D4 full demo no-tower/no-art regression evidence attached; human-only studio approval and separate local render permission remain gates.

**Edges — Default (Gamewright) D12:** supplied mode reused without repeatedly asking; absent mode selected once through normal approved workflow. Unknown story/ID fails, not nearest-name guess. “redo” never invokes approval. No `asset-studio` generic skill dependency (P2 S14 is later).

## Art inventory and fixture contract

Sources: DEC-206/207/575/576/622/719/844; P2 S2/S4/S5/S6/S7/S8; A1 2–8. **Default (Gamewright) D13:** fixture naming/sizes below are test assignments, not already-existing game IDs. Illusionist supplies the real cover/mask look only; developers generate neutral fixtures and destructive variants in tests. No manual art dependency for CI. None of these adds an iPad crop or Loremaster portrait. All masters/WAVs/drafts stay in work folder; only permitted shipped files enter pack after separate implementation.

| Asset IDs | Kind / size / format | Mood/frames; mask; lint and role |
|---|---|---|
| `painting.cover` | painting; existing source `packs/test/assets/cover.png` 1280×720 PNG retained. Production master 3840×2160; WebP output at matching high-resolution board profile (demo decision below) | One Ruined Keep cover, no variants/letters baked in. No face/mouth/anchor. Keep/sky detail above caption band. Pair `glow.cover`; headroom DEC-206/575. Existing cover is reused as composition/reference, not recreated as a second cover concept. |
| `glow.cover` | mask; grayscale lossless WebP 1280×720 for existing cover review; production paired derivative 3840×2160 | Exact paired dimensions/alignment; lit cottage windows only (demo decision). No colored pixels, mouths or independent camera; black elsewhere. One ID, dimension-matched outputs, not two competing index entries. |
| `seal-break.01~vo-01` | voice line; WAV PCM master → m4a; duration measured | Demo Loremaster text/caption below; no art/mood/mouths. Source ID mapping from legacy `vo.loremaster.seal-break-1` is explicit, never implicit rename of existing shipped IDs. |
| `place.village`, `place.bazaar`, `place.citadel`, `place.sanctuary` | place; existing `packs/test/assets/place-*.jpg` masters, generated 1920×1080 WebP fixture profile | A1 6 import reuses all four; no Illusionist repaint. No new masks. Source decoded dimensions recorded; import is not evidence of new panning headroom. |
| `painting.fixture-hall`, `glow.fixture-hall` | painting + paired grayscale mask, 1920×1080 WebP; PNG masters generated | Neutral geometric scene, white-window mask black elsewhere; no story art. P2 success/export/redo plus A1 debug-ID fixture. Static, not release panning art. |
| `portrait.guide`, `portrait.guide~friendly`, `portrait.guide~scared`, `portrait.guide~angry`, `portrait.guide~sly` | portrait stills, 720×900 WebP; lossless PNG masters | neutral/friendly/scared/angry/sly, generated neutral guide with voice. 0.2 stills only, **zero mouth frames**. Known 60%-black edge vignette and proposed chin at 0.70; no mask. |
| `portrait.witness`, `portrait.witness~friendly`, `portrait.witness~scared`, `portrait.witness~angry`, `portrait.witness~sly` | portrait stills, 720×900 WebP; lossless PNG masters | Same five moods; voiceless witness derives all stills, no voice/mouths/anchor. A1 filters generic/repeated text. No mask. |
| `foe.fixture-guard`, `place.fixture-road`, `item.fixture-key`, `cover.fixture-story` | respective kind labels, generated 1920×1080 WebP | One neutral shape composition each; six accepted BT picture kinds covered with painting/portrait rows. No masks or talking art. Generic P2 also has a small arbitrary-kind/profile example that BT rejects. |
| `fixture.01~vo-01`, `fixture.02~vo-01` | guide voice lines, generated PCM WAV → m4a, fixed texts “Welcome.” / “Welcome. [pause 0.5] Follow me.” | One-shot only; pause parsing and caption-length boundaries; no mouth timing in 0.2. Repeated and substitution candidates exist only as pack input tests, not generated voice assets. |
| `sound.fixture-door`, `sound.fixture-room` | effect / ambience; generated PCM WAV input → shipped m4a | short deterministic tone/room-like noise (not music), duration asserted; no art. Supplied-file pass-through/index/export, **no sound-generation provider scope**. |
| existing funeral IDs matching actual Dracula script | voice/still; preserve source masters; m4a/WebP output | Import inventory printed by ID; reuse existing POC source, no new Illusionist assets/clips. Missing script stops rather than inventing names. |

**Negative fixtures (generated, never new art commissions):** 719×900 mouth frame, a same-size frame with one altered pixel outside anchor, anchor overflow, 1920×1079 mask, RGB colored mask, no-vignette portrait, 121-character caption, invalid BT kind/mood, missing index ID/file, draft-in-release, rejected entry, stale source, corrupt image/audio and traversal path. Legacy Keeper portrait + all eight existing mouths are reused for DEC-207 frame/anchor regressions; no demand for new talking kits in S2–S9/A1 2–8. The required kit when later built is REST/MBP/CONS-EE/EH-AE/AH/OH-ER/OO-W/FV at full portrait size, identical outside anchor (DEC-207), not a G-A1 deliverable.

**Fixture outputs — Default (Gamewright) D14:** fake TTS emits deterministic valid RIFF/WAVE PCM16 mono 22050 Hz, e.g. 1 s for “Welcome.”; stub conversion produces a checked-in/generated valid tiny AAC-in-MP4 `.m4a` golden, not renamed WAV/JSON. Fake image provider returns decodable PNG pixels; real picture pipeline emits WebP, masks lossless gray with R=G=B. If provider interface returns encoded image bytes rather than pixels, use PNG bytes. Content hash is of actual output bytes; manifests are real schema-1 JSON with source hashes, kinds, dimensions/duration/status and captions. CI tests decode the results and never require macOS `afconvert`. Real local smoke separately verifies actual conversion. Neutral fixtures only in public asset-studio; real Keep art stays in Bloodtower/work folder.

## G-A1 art and demo decisions

Illusionist-ready specs for the three G-A1 assets (`painting.cover`, `glow.cover`, `seal-break.01~vo-01`): [A1-art-specs.md](A1-art-specs.md) (2026-11-10).

1. **LOCKED (DEC-349; C5-05 plan/approval; research/stories/ruined-keep/script.md, “seal break ch1, Loremaster”):** the exact fixed line is “The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep.” It has no substitution and is under 120 characters. Loremaster is audio plus captions, no talking portrait. **DECISION FOR WARDEN — Default (Gamewright):** use once-only moment `seal-break-1`, line `seal-break.01~vo-01`, paired with `painting.cover`; treat that name as a demo label, not a new runtime field; use an existing once-only inline narration entry point in a controlled demo fixture. Do not add a seal-break event/state machine to current gameplay. A later real seal-break integration must prove once-only consumption across restore. Never reuse it as the generic line for every seal. The line ID choice is a new demo assignment, not a locked rename: retain a provenance mapping from checklist `vo.loremaster.seal-break-1` to this new job line only, and do not rewrite existing shipped IDs. The existing documented narrator voice is Gemini TTS **Charon**, “slow, low, ominous storyteller” (`assets/stories/dracula/scripts/cast.md`; `apps/Visuals/src/tts-explorer/data/stories/dracula/characters.ts`). Those sources do **not** establish approval as Ruined Keep's Loremaster voice. Default: reuse Charon provisionally; do not claim a separately approved Loremaster voice was found or invent one.
2. **LOCKED (DEC-401 as refined by DEC-844; C5-05 approval; #359 / packs/test/assets/cover.png):** `glow.cover` is a separate grayscale WebP aligned to the 1280×720 cover, same pixel size. **DECISION FOR WARDEN — Default (Gamewright):** after inspecting the cover, illuminate only the already warm cottage window panes: the left foreground cottages, the smaller middle-left cottage/window cluster, the middle-right cottages and the near-right foreground cottage. Hand-trace the actual panes; soft gray falloff just around each pane, black roof/wall/road/well/sky and black keep slit windows/gate. Do not illuminate the whole sunset or invent castle lights. Existing landing `hero.webp` window masks belong to a different picture and must not be reused. For any higher-resolution derivative, retrace/transform its matching mask and assert dimensions/alignment again; never pair the 720p mask with a larger painting.
3. **LOCKED (DEC-206/575):** panning art needs full-resolution headroom, source 3840×2160, max zoom 1.5×, focus clear of the lower third. The 1280×720 original is not proof of that headroom. **DECISION FOR WARDEN — Default (Gamewright):** retain original `cover.png`; make a composition-matched 3840×2160 master and matching mask for TV output, not a bare upscale passed off as detail. Keep the 1280×720 mask only for original-cover review. Use a matching 3840×2160 dashboard export for the actual gate, displayed at 1920×1080, with no named move required. Q-451 remains outside G-A1. No second cover concept or 4K TV pass is added.
4. **DECISION FOR WARDEN — Default (Gamewright), implementing P2 S2/S4/S5/S6/S8 and A1 step 4:** fixtures are deterministic valid PNG image-provider results → WebP, grayscale lossless WebP masks, PCM16 mono 22050-Hz WAV TTS masters → valid tiny AAC-in-MP4 m4a via CI converter stub/golden, plus schema-1 `asset-job.json` and real index/export JSON. Decode and validate bytes; no file-extension tricks, paid calls, keys or macOS binary in CI. Developer-generated neutral shapes/tones are sufficient; Illusionist need not hand-paint test fixtures.
5. **LOCKED (DEC-665/666; C3/03-ruined-keep-pack plan):** keep pack ID/folder `test`; change only display `title` to **The Ruined Keep**. `assets[]` already exists. **CORRECTION — Default (Gamewright):** drop the broad pack-v2/script migration prerequisite entirely. Keep inline `chapters`, `game`, settings, assignments, flags and legacy text unchanged. A1 step 2 owns pack-to-job generation and step 5 owns `assets/index.json` generation/loader compatibility; neither is a prerequisite generator to write in an unrelated slice. No required `script.yaml` or `cast.yaml` for playable test. Register image/mask using existing `assets[]` rows (`type: still`, `target: storyboard`, actual status/path), voice using existing `type: line` row; reference voice only through the existing optional inline narrate-line `voice` field in the controlled demo. Preserve `cover: assets/cover.png`. Do not invent `glow`, `kind`, `moment` or cast keys in runtime pack YAML. P2's derived `glow.cover` association belongs in the adapter job/export/index, not a new runtime mask type. Source schemas: `apps/bloodtower/src/protocols/pack-v2/story.ts` assets rows and `effects.ts` narrate lines. Registration alone does not claim automatic combined painting/mask/audio playback: A1 4/5/G-A1 must prove the current board playback integration, or separately size its narrow missing hook through Wright; no chapter/script-loader cutover. Existing unapproved inline narrator text is not newly voiced or silently replaced by the accepted Keep line.

## Dependency correction after Hammer's brief-gate failure

Read `/workspace/briefs/bt-pack-v2-script-migration.md` (blocked); its three REDs are valid objections to the old migration proposal, not authorization for a larger runtime build. That proposal and this document's earlier requirement for a separate test `script.yaml` are withdrawn.

- **Narrow slice: title/registration, Cutover N.** Future Touches only `packs/test/pack.yaml`, real media files under `packs/test/assets/**` if available/approved, and existing pack loader/catalog tests for those declarations. No `apps/**` runtime/protocol edits in this slice, no script/cast files, no generator. Do not declare nonexistent files as final to make lint green; register the existing cover now and a valid image mask when present. Defer audio/index files and their row registration to A1 5: current `server/pack/assets.ts` `validateAssetsFolder` rejects non-image files even though the schema/index helper has line/audio branches. Do not add an m4a/index JSON early and break lint. Preserve four `place.*` IDs/status/files.
- **Title safety verified from source:** `apps/bloodtower/src/protocols/pack-v2/story.ts` validates `title` independently from `pack_id`; `apps/bloodtower/src/server/core/loadStories.ts` maps `card.id = pack_id` and `card.title = title`. Identity/save routing remains `test`. AC: parsed before/after manifests are identical except title and deliberately appended asset rows; catalog has ID `test`, title The Ruined Keep; Continue/restore/restart and existing test-pack flow still pass. Existing spoken/caption prose containing “Proving Grounds” is left unchanged, not globally search/replaced. This is source verification, not a claim that unrun e2e passed.
- **Existing declaration mechanism, not speculative schema:** `assets[]` supports `type: still` and `type: line`, storyboard target and path/status today; inline `narrate.lines[]` supports speaker/text/optional voice today. A declaration is not a playback effect; cover remains the existing cover path. Do not add mask hooks to production chapter flow in this slice. Existing asset directory validation/index support for new index JSON/audio is A1 3/5 implementation work, not evidence to fabricate a precursor migration.
- **Copy AC:** old inline narrations are preserved byte-for-byte and receive no new voice reference. They have no approved Keep-script provenance. The accepted `seal break ch1, Loremaster` line is separate approved input for the controlled once-only demo; new IDs/trigger binding are defaults, not locked copy rulings. Any production replacement awaits the existing story/feature integration lane, not a schema migration.
- **Correct order:** P2 S2 derivation decision/test in #16 → S3–S8 → S9 published 0.2 → A1 2 job adapter over current inputs → A1 3/4/6 → A1 5 generated index and compatible loader → A1 7/8 → G-A1. Title/image registration can run independently with preserved gameplay; audio/index registration waits for A1 5 compatibility checks. No dependency on an unbuilt index generator or a playable Dracula script; Dracula's authoring/import checks do not certify its runtime playability.
- **Runnable narrow-slice AC:** `pack:lint test`, existing loader/catalog tests and test-pack e2e unchanged except title expectations; save identity/party/start/day/flags/chapters equal baseline; absent script/cast still loads; no renderer call/portrait request; no new protocol keys. This is a future implementation checklist, not a coding launch or an edit to Hammer's brief.


### Gate evidence checklist

- [ ] **G-A1-01** published 0.2 install and A1 2–8 evidence, exact pack/moment/line/assets listed, configured work folder outside repo. Render is separately authorized; run AI draft → pack `--drafts`; board/TV plays line once with exact caption and aligned cover/mask, zero Loremaster portrait/mouth requests.
- [ ] **G-A1-02** real TV check at 1920×1080 plus Mac evidence; reviewer sees mask only at specified panes, no clipping/illegible caption. No named move or 0.3 feature claimed.
- [ ] **G-A1-03** “redo glow.cover: reduce the window brightness” stores exact note, rerender produces new draft/hash and preserves old; person approves one asset in studio, repack copies its final status. Other drafts are still drafts, not falsely all-final release.
- [ ] **G-A1-04** no-tower run completes without Bluetooth; no-art fixture with engine defaults reaches same next state, caption-only on unavailable audio remains legible. Release missing-reference lint still fails. Controlled once-only demo entry does not auto-replay on restore; no new seal-break gameplay event is introduced. Real seal-break consumption is verified when its owning feature integrates it; explicit user replay remains possible.

## Defaults, risks and ownership before coding

- **D1–D4:** no iPad art; repeated/unknown-repeatability lines silent; transactional writes; no-art/no-tower regression without new engine fallback implementation.
- **D5–D7:** structural/path/status/error hardening; audio-only preflight and caption-only failure status; explicit redo required for rejected work.
- **D8:** locked audio-only Loremaster result versus new empty-moods derivation decision; #16 currently derives a neutral portrait unconditionally. Correct/test derivation without a new schema; no legacy cast/script migration.
- **D9–D12:** caption-count/edge evidence; safe index packing/hash policy; import idempotency/backup and corrected removal Touches; no-current-ID/mode reuse skill behavior.
- **D13–D14:** generated neutral fixture inventory and decodable fake-media protocol; no test-art commissioning dependency.
- Demo defaults: once-only seal-break-1, provisional Charon provenance, lit-cottage-only mask, 3840×2160 derivative retaining original, no pack migration prerequisite; title/real-file registration only, keeping inline gameplay. All decision-for-Warden items above stay visible in implementation briefs; no questions left for Bob here.
- **Risk: legacy IDs.** C5 checklist contains historical ID forms to check against the published consumer contract (`vo.loremaster.*`, `snd.listen_*`, `tomb.*`, `map.*`). Default: adapter must not silently rewrite shipped IDs; A1 job/export boundary owns any explicit new-ID provenance; preserve existing shipped IDs/save references and do not commission a migration. Multi-dot IDs already pass #16's regex; do not rewrite them merely for having extra dots. Underscore IDs still need deliberate handling, not silent normalization. A1 fixture IDs in this document are new neutral test IDs, not a rename order. C5 all-art approval checklist EV reference says EV-05 but final-approval eval is EV-04; record evidence against actual eval IDs, no app edit here.
- **Risk: schedule.** There is no test-pack migration prerequisite. The narrow P2 S2 derivation decision and A1 job/index work stay in their existing lanes; fake tests never stand in for actual board integration. Wright owns any missing playback hook as a separately sized change, not an implicit loader cutover. Contract assumptions cannot be patched with `link:`/`file:` or pulling 0.3 into 0.2.
- **Parallel lanes (future, not launched):** P2 S4 `tts/voice`, S5 `picture/glow` + dependency files, S7 `packages/studio/**`, S8 `cli/src/export/**` are disjoint after S3; S5 owns lockfile. A1 3 `assets/lint/**` + `server/scripts/packLint.ts` can run against 4 `assets/render/**` or 6 `assets/import/**` + retirements; 6 owns removal dependency files. After 5, A1 7 board/config and 8 `.claude/skills/bt-assets/**` + root CLAUDE are disjoint once 6 lands. Keep common manifests, plan Results and fixture ownership serialized. Source: P2/A1 Batches/Touches.

This document changes only `research/game-design/specs/A1-P2-requirements.md`. It does not change a plan under `apps/`, approve new copy/art, create media, publish packages or merge anything.
