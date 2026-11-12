# G-A1 art specs: painting.cover, glow.cover, seal-break.01~vo-01, and the A1-4c line pick

Design-only handoff by Gamewright, 2026-11-10 (ET), for Illusionist. It finishes the G-A1 rows of [A1-P2-requirements.md](A1-P2-requirements.md) (Art inventory table; G-A1 decisions 1–3) into production specs. Nothing here authorizes a paid image or voice run: Bob's Nov 8 art hold still applies, and these specs generate nothing. **LOCKED** cites a decided card or accepted text. **Default (Gamewright)** repeats a default already recorded in A1-P2-requirements.md (a recommendation up the chain, not a Bob ruling). **PROPOSED** is new in this file and undecided.

Common rules for all three:

- Masters, WAVs and drafts stay in asset-studio's work folder, outside git; only shipped WebP/m4a and `index.json` enter `packs/test/assets/` (DEC-386, DEC-622). Bob approves each final in the studio (C5-05 Q-C5-06; DEC-384).
- IDs follow `<kind>.<entry>~<variant>` (DEC-622, DEC-844). `glow.cover` belongs to `painting.cover` (DEC-844).
- Look: the game's oil-painting look (DEC-335, DEC-478), grim and plain low fantasy (DEC-834), the palette and art treatment in [docs/art-direction/game-look.md](../../../docs/art-direction/game-look.md) §2. Story board only, never iPad (DEC-201, C-03/D1).
- Delivery route for hand-made masters (A1 runbook, `apps/bloodtower/spec.md` D43/D47): a plain `assets:render` with no `--ai` fails `glow.cover` with `AS-GLOW-2`; Illusionist hand-places `masters/glow.cover.png` (and the painting master) in the work folder, or the mask is made in AI mode after the hold lifts.

---

## 1. `painting.cover`

| Field | Spec |
|---|---|
| Asset id | `painting.cover` (kind `painting`; C5-05 approval.md, "16:9 Ruined Keep cover for 1.0 (Bob locked Nov 2 2026 via Warden)") |
| Purpose / where used | The Ruined Keep's 16:9 cover, and the Painting the G-A1 demo narrates `seal-break.01~vo-01` over on the Story board/TV, with `glow.cover` on top (A1-P2 G-A1 decision 1; UI-003, DEC-056). Board only. |
| Size | **LOCKED:** 3840×2160 master and shipped painting (DEC-575 source size; DEC-206 headroom). Shown at 1920×1080 for the G-A1 gate (decision 3). The existing `packs/test/assets/cover.png` (1280×720 PNG, #359) is **kept unchanged** as the composition reference and pack `cover:` path; it is not replaced or deleted. |
| Format | Master: lossless PNG, sRGB, 8-bit RGB, no alpha (PROPOSED bit depth/colour space; nothing in the repo sets them). Shipped: WebP at 3840×2160, emitted by asset-studio S5 from the master (P2-05a; DEC-386). Never resave the master in place (P2 S5 edges). |
| Look and mood | Dusk under heavy storm cloud, a low band of dying amber light on the horizon; a ruined stone keep on its hill, dark and silent; a thatched village (Greyford) below with a few warm lit windows. Muted umber/soot range with candle-gold accents only in the windows and sky band (game-look §2: ~70% dark, candle colour precious). Oil-painting texture, not photographic, not glossy. No letters, title, logo or border baked in (A1-P2 inventory). No face, mouth or anchor (no Portrait). |
| Composition | **Match the existing cover, recomposed at 4K, not a bare upscale.** Keep every element where it is in the 1280×720 original (positions scale ×3): keep centred on the upper half, its tallest tower near x≈0.53, crenellated towers left and right, arched gate at the keep's base near x≈0.52, y≈0.52; sky with cloud break behind; village across the bottom: two foreground cottages left, a smaller cottage middle-left, the stone well with a wooden roof at centre, two cottages middle-right and one large near-right cottage; the dirt road forking around the well. Repaint detail at native 4K (stone courses, thatch, cloud edges); do not add a second subject or new lights. **Focus:** the keep (key detail) sits entirely above y = 0.667 (1440 px); the lower third holds only the village and road, which may be overlapped by captions (DEC-206 caption band; DEC-575 1.5× max zoom). **Focus box (PROPOSED for the index entry DEC-206 asks for):** x 0.16–0.84, y 0.02–0.64 of the frame. A 1.5× crop (2560×1440) centred on the focus box must still show the whole keep. |
| References | `packs/test/assets/cover.png` (composition, palette); `docs/art-direction/game-look.md` §2, §5, `moodboard.png`; DEC-206, DEC-335, DEC-347, DEC-478, DEC-575, DEC-834; A1-P2-requirements.md G-A1 decisions 2–3. Do **not** use the landing `hero.webp` (different picture). |

**Acceptance checks**

- [ ] **CV-01** Decoded pixel size exactly 3840×2160, 16:9, sRGB, no alpha; shipped file is WebP with that size (P2-05a; A1-15 kind `painting`).
- [ ] **CV-02** Side-by-side with `cover.png` downscaled to 1280×720: same elements in the same places (keep, gate, six cottages, well, road fork); a reviewer can overlay the two at 50% opacity and every element lines up within ~1% of frame width. No new subject, light source or text.
- [ ] **CV-03 Not an upscale:** at 100% zoom on a 4K display, stone courses, thatch strands and cloud edges show painted detail, not interpolation blur or upscaler halos. Evidence: a 1:1 crop of the gate area next to a bicubic 3× upscale of the original, in the PR.
- [ ] **CV-04 Lower third:** the keep and gate are entirely above y = 1440 px; draw the line on a review copy.
- [ ] **CV-05 Pan headroom:** 2560×1440 crops at the focus box centre and at each move's extreme (DEC-844 moves at 1.5×) stay inside the picture and still show the keep whole (DEC-206 camera inside).
- [ ] **CV-06** At 1920×1080 on the TV, with a 3-line caption in place, no key detail is hidden (G-A1-02).
- [ ] **CV-07** Bob approves it in the studio; status `final` comes only from that approval (DEC-384, C-05).

**Open decisions**

- **OPEN (Bob):** a 4K derivative candidate is waiting on Bob's comparison against the original. Until he picks it (or asks for a fresh recomposition), this spec is the acceptance bar either candidate must meet. Not decided here.
- **PROPOSED:** focus box values above; master bit depth/colour space.
- **OPEN (Warden/Wright, existing):** the cover shows through `cover:` (1280×720) in the story picker; whether that picker later reads the 4K painting is not part of G-A1.

---

## 2. `glow.cover`

| Field | Spec |
|---|---|
| Asset id | `glow.cover`, the mask of `painting.cover` (DEC-401 as renamed by DEC-844; kind `glow`, not a picture kind). |
| Purpose / where used | The glow layer over `painting.cover` on the Story board: lit areas glow or flicker slowly, 1–2 Hz with jitter, never a strobe; a steady glow under reduced motion (DEC-343, UI-005). Story Paintings only (DEC-347). Board only. |
| Size | **LOCKED:** exactly the paired painting's pixel size: 3840×2160 for the 4K painting (DEC-401; P2-05b `AS-GLOW-1` on a mismatch; lint A1-17). Default (Gamewright): a separate 1280×720 mask exists only for reviewing the original `cover.png`; never pair the 720p mask with the 4K painting. One ID, not two competing index entries (A1-P2 inventory). |
| Format | Master: `masters/glow.cover.png`, 8-bit single-channel grayscale (or RGB with R=G=B on every pixel). Shipped: grayscale **lossless** WebP, same size (DEC-401; P2-05b; A1-18 fails any coloured pixel). No alpha channel (PROPOSED: alpha is ignored by the glow layer; keep it out so nothing hides in it). |
| What is lit | **Default (Gamewright), decision 2:** only the already-warm cottage **window panes**: the left foreground cottages, the smaller middle-left cottage, the middle-right cottages and the near-right foreground cottage. **Black:** the keep and **all its slit windows and gate**, sky and sunset band, roofs, walls, doors, road, well, fences, trees. No invented castle lights, no whole-sunset glow. |
| Values | **PROPOSED:** background exactly 0. Pane cores 200–235 (8-bit); the brightest pane at most 235 so the flicker has room before clipping; dimmer, farther panes (middle-left, gable) 150–190. No pixel 1–15 outside a pane's falloff zone (no grey haze). Nothing at 255. |
| Edge falloff | **PROPOSED:** each pane is hand-traced to its painted glass, with the muntins (window cross-bars) kept darker (≤ 60% of the pane's core) so the light reads as glass, not a blob. Soft falloff outward from the pane edge to 0 over 12–24 px at 4K (4–8 px at 720p), a smooth, roughly Gaussian ramp; no hard binary edge, and no falloff reaching the next pane or the door. |
| Composition | Trace panes on the actual 4K painting, not by scaling the 720p mask: the recomposed painting moves panes by a few pixels. Reference locations on the original 1280×720 `cover.png` (approx. ±3 px, Gamewright measurement 2026-11-10): **P1** x178–193, y592–616 (left foreground cottage, left window); **P2** x322–335, y592–615 (same cottage, right window); **P3** x415–426, y553–568 (middle-left cottage window); **P4** x822–831, y515–533 (middle-right cottage, gable window); **P5** x891–903, y561–580 (middle-right cottage, side window); **P6** x1012–1032, y618–646 (near-right cottage window). Not panes (stay 0 under this default): wall lanterns near x238–266/y597–620, x780–800/y562–577, x834–860/y561–583, and the lit porch/doorway near x496–520/y555–573. |
| References | `packs/test/assets/cover.png`; DEC-343, DEC-347, DEC-401, DEC-844; UI-005; P2-05b; A1-P2-requirements.md decision 2; lint rules A1-17, A1-18. |

**Acceptance checks**

- [ ] **GV-01** Decoded size equals `painting.cover`'s decoded size exactly (3840×2160); mismatch fails `AS-GLOW-1` / A1-17 (P2-05b).
- [ ] **GV-02** Every pixel has R=G=B (A1-18); the shipped WebP is lossless (re-decoding gives the master's pixels exactly).
- [ ] **GV-03 Black outside panes:** with the six pane boxes (plus their falloff, 24 px at 4K) masked out, every remaining pixel is 0. A reviewer script or image editor histogram shows it.
- [ ] **GV-04 Keep dark:** the keep region (above the hill line, x 0.16–0.84) has max value 0, so the slit windows and gate never glow.
- [ ] **GV-05 Overlay alignment:** the mask at 50% screen blend over the painting puts light only on painted glass, centred on each pane within 2 px at 4K; no light on lanterns, doors, walls or roof (P2-05b "verified by overlay, not dimension check alone"). The overlay PNG is attached to the PR.
- [ ] **GV-06 Values:** pane cores 150–235, nothing at 255; falloff reaches 0 within 24 px of the pane edge at 4K.
- [ ] **GV-07 On the TV** (G-A1-02): at 1920×1080 the flicker shows only at the panes, reads as candlelight behind glass, and is not a strobe (≤ 2 Hz; DEC-343).
- [ ] **GV-08** A redo with "reduce the window brightness" lowers pane cores and keeps the old draft (G-A1-03).

**Open decisions**

- **OPEN (Warden): wall lanterns and the lit porch.** They are as warm as the panes. Decision 2 says panes only, so this spec leaves them black; lighting them is a one-line change to this spec if Warden or Bob wants it.
- **PROPOSED:** value ranges, falloff widths, muntin rule, no alpha.
- **OPEN (Bob, existing):** if Bob picks the waiting 4K derivative candidate, its mask is traced on that candidate, never transformed from another painting.
- **OPEN (Bob, A1 runbook):** studio mode fails `AS-GLOW-2` for any story with a mask; the hand-placed master route above or `--ai` is needed. Not a design choice; listed so the delivery route is not a surprise.

---

## 3. `seal-break.01~vo-01`

| Field | Spec |
|---|---|
| Asset id | `seal-break.01~vo-01`, a voiced line (moment `seal-break-1`), Default (Gamewright) demo assignment, decision 1. Provenance: maps from the C5-05 checklist ID `vo.loremaster.seal-break-1` to this job line only; no shipped ID is renamed. |
| Purpose / where used | The G-A1 demo: the Loremaster narrates over `painting.cover` with `glow.cover` on the Story board, once, with the exact caption (G-A1-01). Loremaster is audio plus captions, no Portrait, no mouths (C5-05 approval change note, Nov 2; DEC-843). Played on the board's Mac speakers only (DEC-201). |
| Text (LOCKED) | “The roads are clear, and a seal breaks like an old oath giving way. Ahead stands the Ruined Keep.” Source: `research/stories/ruined-keep/script.md`, Chapter 1 won, tag `seal break ch1, Loremaster`, accepted by Bob 2026-11-06. 97 characters (≤ 120, DEC-576/A1-13); fixed text, plays once, so it may be voiced (DEC-349). Caption = this text exactly, no pause markup. |
| Voice | Gemini TTS **Charon**, “slow, low, ominous storyteller” (existing narrator voice, `assets/stories/dracula/scripts/cast.md`). **Locked:** Bob locked Charon as the Loremaster voice on 2026-11-10 (D-01); DEC-902 applies it to the Ruined Keep's Loremaster too. (Before 2026-11-12 this row read: no source approves Charon for the Ruined Keep, final voice pending.) Style direction (PROPOSED, never spoken, P2-04b): grim, plain, unhurried, like reading an old record aloud; no theatrical swell (DEC-834). |
| Format | **Set by the repo:** PCM WAV master in the work folder → m4a shipped (P2-04a, DEC-386); duration measured and stored in the index (A1-P2 inventory). **PROPOSED:** mono, 24 kHz, 16-bit master (Gemini's native PCM; the repo sets no rate for real lines; the 22050 Hz rule in P2-04b is the pause-only/fixture case). m4a AAC-LC ~96 kb/s mono (PROPOSED). |
| Loudness | **Set by the repo (requirement note, not a DEC card):** voice at about −18 LUFS integrated (R3-UI-60 in `playthrough-ui-notes-2026-10-17.md`; game-look.md §6: lines measure ≈ −18 LUFS, UI sounds ≈ −20 LUFS under VO). **PROPOSED:** −18 ±1 LUFS integrated, true peak ≤ −1 dBTP. |
| Duration | **Set by the repo:** a line estimated over 20 s is rejected before any paid call; exactly 20 s passes (P1 preflight, A1-P2 D6). **PROPOSED target:** 7–10 s (19 words at a slow pace), with ≤ 250 ms of silence head and tail. |
| References | script.md (above); DEC-349, DEC-576, DEC-201, DEC-843, DEC-834; P2-04a/b/d; A1-P2-requirements.md decision 1 and D6; game-look.md §6. |

**Acceptance checks**

- [ ] **VV-01** The job line text and the index caption equal the locked text byte for byte.
- [ ] **VV-02** Shipped file decodes as m4a (AAC in MP4), not a renamed WAV; WAV master stays in the work folder, not in the pack (P2-08b, A1-05a).
- [ ] **VV-03** Duration ≤ 20 s, recorded in the index; PROPOSED 7–10 s.
- [ ] **VV-04** Integrated loudness −18 ±1 LUFS, true peak ≤ −1 dBTP (measured with a BS.1770 meter; PROPOSED tolerance).
- [ ] **VV-05** Listening check: every word clear and in order, nothing spoken from the style prompt, no clipped first or last word.
- [ ] **VV-06** No portrait, still or mouth ID derives for the Loremaster (A1-02b; D8 empty-moods rule).
- [ ] **VV-07** Plays once on the board with the exact caption, and a restore does not replay it on its own (G-A1-01, G-A1-04).

**Open decisions**

- **Settled (Bob 2026-11-10, DEC-902):** the Loremaster voice is Charon.
- **PROPOSED:** sample rate/bit depth, AAC bitrate, loudness tolerance and true-peak ceiling, 7–10 s target.
- **OPEN (Wright, A1 runbook):** G-A1-01's “board/TV plays line once” has no A1 step that plays a packed line; add a playback step or reword G-A1.

---

## 4. A1-4c: the real render of 3 Dracula lines (pick only)

A1 step 4's manual evidence: Bob renders 3 real Dracula lines with his key, after he lifts the art hold (A1 plan step 4 and Results; A1-P2 A1-04c). Nothing is rendered here. Text is quoted exactly from `packs/dracula/script.yaml`; speaker voices are from `assets/stories/dracula/scripts/cast.md` and `packs/dracula/cast.yaml`. All three are storyboard (no `target: ipad:`), fixed text with no `{...}` substitution or `[pause]` markup, and have no `~variant` in the ID (the A1 runbook notes `~` variant lines are rejected as `invalid-id`).

| # | Line id | Speaker (voice, style) | Text (exact) | Why this one |
|---|---|---|---|---|
| 1 | `n1-burgomasters-house.06.vo-01` | `narrator` (Gemini Charon, “slow, low, ominous storyteller”) | The maid saw the end from the kitchen door. She tells it to the floor, not to you. | Short narration in Charon, the locked Loremaster voice (DEC-902). |
| 2 | `n1-burgomasters-house.07.vo-02` | `agnes` (Gemini Kore, “calm, dry, quietly stern”), note “thumb on her scar” | Then we bring her down it. | Very short, a second voice and a quiet, stern mood; its `note` checks that a direction is never spoken. |
| 3 | `n1-fortune-reading.10.vo-01` | `emeric` (Gemini Fenrir, “nervous, fast, breathless”) | Two lives... is that a metaphor? Please tell me that's a metaphor. | A third voice at the opposite pace and mood; ellipsis, question and apostrophe test delivery and caption text. |

- **Acceptance (A1-04c):** each line renders a PCM WAV master plus a playable m4a draft, status `draft`, speaker/text/source kept (P2-04a); duration measured; caption equals the text above byte for byte; nothing marked final. Evidence (command, versions, IDs, durations, LUFS readings) is recorded separately in the step 4 PR; CI fakes do not stand in for it.
- **Check before the run (OPEN):** confirm with `pnpm assets:needs dracula --json` that all three IDs are in the job's eligible `lines[]` after D2 filtering. Line 2's text also appears under `n1-burgomasters-house.07~no-tomas.vo-02`; that variant is not picked. If a pick is filtered out, swap in another short storyboard line of a different speaker; do not edit the script.
- **OPEN (Bob):** the run spends on Bob's Gemini key and waits for the art hold to lift.

---

## Not in G-A1

`place.village`, `place.bazaar`, `place.citadel`, `place.sanctuary` are reused by the A1 6 import and need no repaint. The rest of the Ruined Keep set (C5-05) is specified in its own PR, `research/game-design/specs/C5-05-ruined-keep-art.md`.
