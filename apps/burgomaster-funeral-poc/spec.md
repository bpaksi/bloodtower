# spec.md — Burgomaster's Funeral POC

| Field | Value |
|---|---|
| Status | M1 step 2, 2026-10-14. Docs only. This file is the build contract for the app once the step merges. Bob's gates stay G1 (playtest, no tower), G2 (SC-5) and G3 (sign-off). |
| Source intent | [docs/PRD.md](docs/PRD.md) rev 4 (R4-1..R4-3, 2026-10-14 16:00 ET), which keeps rev 3 rulings R3-1..R3-12. G0 (Bob, 2026-10-14 3:54 PM ET) made that PRD the intent. |
| Plan | [plans/M1-funeral-poc.md](plans/M1-funeral-poc.md) |
| Spec version | 1 (2026-10-14) |
| Scene | `n2-burgomasters-funeral` (Dracula pack, night 2, the K2 Sanctuary) |

This spec carries PRD rev 4 forward for the M1 build. **If this spec and the PRD conflict, this spec wins, and the conflict is a row in §2.** The plan said the PRD wins over the plan until this spec exists. Step 2 touches only this file, so a conflict with the plan is recorded here and the plan file is not edited in this step.

M1 plays the scene on the Mac host, the Dashboard, and one or more devices holding all 4 hunters, **with no tower**. Every cue plays its screen half plus its fallback audio. The Dashboard runs the E16 ambient bed. SC-1..SC-5 are met in that form.

---

## 1. Summary

Prove the engine end to end on one set piece. The Mac holds the single authoritative game state and SQLite. Browsers are thin clients over a typed WebSocket. There is no tower connection and no tower command (R4-1).

Success criteria, all required:

| ID | Criterion | Proven by |
|---|---|---|
| SC-1 | The scene plays start to finish with no tower. Every cue plays its screen half, and plays its fallback audio when the cue sheet has one (`dim-all`'s fallback is the fade itself; §7). The tower-connected run is Phase 2 (PRD §13). | Steps 5, 8, 10, 11, 12, 14, gate G1. AT-1, AT-2, AT-12, AT-12b, AT-26 |
| SC-2 | No private text, still or audio appears on the Dashboard. | Steps 9, 10, 12, 14. AT-3, AT-20, AT-24, AT-27 |
| SC-3 | A device that rejoins mid-scene gets back the private state of every hunter it holds. | Steps 4, 9, 13, 14. AT-4, AT-5, AT-21, AT-25 |
| SC-4 | The stats rows alone reconstruct the run (choice, fight, costs, cues, devices). | Steps 5, 7, 11, 15. AT-14, AT-15 |
| SC-5 | Playtesters call the fight branch tense. Bob records their words. | Step 6 builds the branch. Gate G2. AT-18 |

---

## 2. Decision log

| # | Decision | PRD or plan said | Reason |
|---|---|---|---|
| D1 | The app uses the tower-poc source layout in §3: an orchestrator `package.json` at the app root, and four pnpm workspace packages under `src/` (`web`, `server`, `protocols`, `e2e`). pnpm, SQLite through better-sqlite3 + Drizzle. | PRD named Next.js + React, a pnpm workspace and SQLite, and said not to redesign `apps/tower-poc`. It did not name the folders. | G0 condition (Bob, 2026-10-14). The funeral app copies that layout. It does not link or import `apps/tower-poc`. |
| D2 | Tower control is Phase 2 (PRD §13). M1 opens no tower connection, sends no tower command, and has no tower wiring. Cues play their screen half plus fallback audio (R4-2). | Same, R4-1 and R4-2. | Restated so no step adds a tower client "for later". |
| D3 | PRD-40 names `shared/tower/cues.json`. That path is not created. The cue sheet M1 reads is the file the asset kit already has: `apps/burgomaster-funeral-poc/assets/cues/cue-sheet.json`. | PRD-40's path. | The asset kit already has the sheet. Assets stay where they are (G0, D5). |
| D4 | Bob deferred plan step 3 (the cue-sheet contract edit) to Phase 2. M1 does not edit `assets/cues/cue-sheet.json`. Steps 8 and 10 read that file in place and do not wait on a step 3 PR. Phase 2 may add an empty `tower` slot and a stricter schema; it does not rename cue ids (R4-3). | Plan step 3 would reshape the sheet in B1: one entry per cue with a screen half, a fallback-audio asset id, an empty tower slot, and E16 bed and accent ids. | Bob, in the step 2 brief (2026-10-14). PRD-40 still holds: the existing file is the contract, and the ids already in it stay. |
| D5 | Assets are read in place from `apps/burgomaster-funeral-poc/assets/`. Nothing is copied into `src/` or into `packages/` for M1. | G0: `assets/` stays exactly where it is. | Same. |
| D6 | Portraits and stills are first-pass art. No code, test, layout or readiness check depends on their exact pixel size, crop or image contents. A file present at the manifest path is enough. The sizes named in `assets/README.md` (1920×1080, iPad stills) are an art target for a later pass, not a runtime contract. | PRD §10 still said stills were not started. The files are now in `assets/portraits/` and `assets/stills/`. | Bob, step 2 brief. First-pass art will be replaced in place. |
| D7 | The app's script copy does not yet contain the five new moments. They are synced into `assets/script/n2-burgomasters-funeral.md` and `assets/manifest.json` before batch B2. This step does not copy them. Placeholder voice and render paths are allowed after the sync (PRD-26). | The plan said step 10's readiness check reports them until voice, renders and entries exist. | Bob, step 2 brief: the sync happens before B2, so B2 starts with the entries present. The words already exist in the Loremaster script (see §8). |
| D8 | Ports and the SQLite folder come from `.wt.json` in a worktree (dev, e2e, `dataDir`). With no `.wt.json`, dev is **4767**, e2e is **4768**, and SQLite files live under `apps/burgomaster-funeral-poc/data/` (gitignored). The app never binds 4747 or 4748. | Not in the PRD. The plan set these so the app does not collide with tower-poc. | G0 layout, plan. |
| D9 | R3-1..R3-12 and R4-1..R4-3 are binding. Where the asset script still says "Gamewright to rule", the PRD ruling wins. | PRD rev 3 and rev 4. | The build follows the rulings, not the proposal notes in the script. |
| D10 | **AT-25's binding text is the replacement** in the PRD's "Decisions after review": disconnecting a hunter's only connected holder pauses play, and reconnecting or a new holder resumes it. The §11 sentence that says killing tomas's only holder does **not** pause is stale. | Both sentences are in the PRD. Rev 3 says later rulings win, and the decisions list says AT-25 is replaced. | R3-2 and the replacement agree. The §11 sentence does not. |
| D11 | Forewarned sit-out does not change the locked presence set and does not select `~no-<hunter>` variants. Sit-out is a fight flag: the hunter is marked sitting out on the battle status, is still present, and still counts in the foe base. | The asset script's follow-the-mourner note says the sitter is "absent from `.04`–`.07`" and that `~no-<hunter>` variants apply. R3-8 says sit out the fight. PRD-36 locks presence at scene start. | R3-8 plus PRD-36. The script note was a proposal ("Gamewright to rule"). |
| D12 | The investigation seal cue (`seal-sequence`) fires when the host taps Continue, and only if a present hunter locked `follow-the-mourner`. It does not fire at the moment of the last lock. | R3-6 puts the seal sequence after Continue. The cue sheet's `trigger` string and the script say "once all picks are locked". | R3-6 is the later ruling. The sheet is not edited in M1 (D4), so the player follows this row, not the stale trigger string. |
| D13 | E16 in M1 is Dashboard behaviour (PRD-39), not new rows in the cue sheet. Step 3 would have added bed and accent ids; that edit is Phase 2 (D4). Step 8 chooses the Mac audio ids from entries already in `assets/manifest.json` and records those ids in this spec in the step 8 commit. The screen pulse does not wait on that choice. | Plan step 3 listed E16 ids as cue-sheet data. | The behaviour is in M1. The file edit is not. |
| D14 | Reading of PRD-39 together with AT-26. The ambient **bed** (screen pulse + Mac audio) is what keeps the Dashboard from going idle. **Accents** are seeded one-shots every 20–60 s. Moment audio (speech, scene sfx) and a logged pause are not quiet gaps. The bed ducks under moment audio and stops for a pause. During a choice the screen pulse stays on, accent one-shots wait, and the bed audio stays up so a long choice is not silence. Scene cues override the bed and accents while they run, then the bed returns. The ≤10 s check ignores pauses and ignores stretches where moment audio is playing. | PRD-39 suppresses the bed during speech, choices and pauses, and also requires a quiet gap ≤10 s. AT-26 excludes pauses only. | One reading has to satisfy both sentences. Bob can override this row. |
| D15 | The +2 cap counts trait pips only: Ready Stake, carried holy water, Consecrated Ground. Mother-bars-the-window is a foe-count change (−1, min 1), not a pip. Forewarned is a revealed card, not a pip, and does not consume the cap. | PRD lists the cap and the five advantages in one block, without saying which of them are pips. | The battle status has to show a number. This is the reading of "advantages by trait" (R3-1) against "reveals the first battle card" (Forewarned) and "−1 foe" (mother). Bob can override this row. |

---

## 3. Source layout

Same source layout as `apps/tower-poc` (D1). The app root holds the orchestrator. `src/` holds four pnpm workspace packages. The workspace globs `apps/*` and `apps/*/src/*` already, so the new `package.json` files join the workspace when step 1 adds them.

```text
apps/burgomaster-funeral-poc/
  package.json        # "burgomaster-funeral-poc": dev / start / build / e2e for its parts
  README.md
  spec.md             # this file
  docs/               # PRD.md; playtest-notes.md at G1 and G2
  plans/              # M1-funeral-poc.md
  data/               # SQLite in the main checkout (gitignored). A worktree uses .wt.json dataDir
  assets/             # already exists; read in place (D5). Not moved, not copied
  src/
    web/              # "burgomaster-funeral-poc-web": Next.js App Router. Dashboard + device views
    server/           # "burgomaster-funeral-poc-server": Node host. Game logic, WS hub, SQLite, cue scheduler
    protocols/        # "burgomaster-funeral-poc-protocols": shared types, Zod schemas, WS messages
    e2e/              # "burgomaster-funeral-poc-e2e": Playwright
```

Conventions, matching tower-poc and the repo:

- Tests sit next to the files they cover (`foo.ts` + `foo.test.ts`). End-to-end tests live in `src/e2e/tests/`.
- Game logic (state, scene runner, rules, readiness) is pure TypeScript inside `src/server/`, one folder per concern, with no I/O, so it is unit-tested without a server. The folders are `state/`, `scene/`, `rules/`, `db/`, `cues/`, `channels/`, `readiness/`, `session/`. Host wiring is `src/server/server.ts`. The reconstruct script is `src/server/scripts/`.
- Web routes: `src/web/app/dashboard/**`, `src/web/app/play/**`. Components: `src/web/components/dashboard/**`, `src/web/components/device/**`. The Dashboard cue player is `src/web/lib/cues/**`.
- Each part exports TypeScript source. Relative imports use the `.ts` extension. No app imports another app's folder. This app does not depend on `ultimatedarktower`.
- Stack: Next.js + React, pnpm, SQLite (better-sqlite3 + Drizzle), `ws`, Zod, Vitest, Playwright, Biome, exact pins, the repo's pinned TypeScript.
- `pnpm dev` runs the server and `next dev`. `pnpm build` builds the web UI. `pnpm start` serves that build and `/ws` from the server on the dev port (D8). `pnpm e2e` runs Playwright on the e2e port.
- Step 1 owns the package files, the lockfile and the protocols module. Later steps add modules only. Changing `src/protocols/types.ts` or `messages.ts` after step 1 is a plan deviation.

`src/protocols` must be able to express: hunter ids `agnes` \| `tomas` \| `wren` \| `emeric`; per-hunter state (corruption, holders, location, present, carried items); story items `stake`, `holy-water`, `host`, `holy-symbol`; moment ids and targets `dashboard` \| `ipad:<hunter>`; cue ids; the §10 event types and payloads; the WS messages, validated with Zod on both sides. No message type carries raw bytes. M1 has no `command` message and no tower payload. Step 1 chooses the field names. This spec does not.

Unknown values are shown as unavailable, never as zero. The event log stores unknowns as null (PRD-23).

---

## 4. Architecture

```text
 Mac host (Node)                                         LAN browsers
┌───────────────────────────────────────────────┐      ┌─────────────────────┐
│ src/server  (one port, default 4767)          │      │ Dashboard (1080p)   │
│                                               │  ws  │ iPad Safari         │
│  HTTP: the web UI                             │◄────►│ Phone browser       │
│  WS  : /ws  typed protocol (Zod)              │      └─────────────────────┘
│   ├─ session (authoritative state)            │
│   ├─ scene runner, rules, readiness           │
│   ├─ channels (Dashboard + one per hunter)    │
│   ├─ cue scheduler (screen half + Mac audio)  │
│   └─ Db (better-sqlite3 + Drizzle, data/)     │
└───────────────────────────────────────────────┘
src/protocols : Zod schemas + TS types shared by server and web
```

There is no tower process, no Bluetooth, and no import of `apps/tower-poc` (D2). The skull drop is a table step into the unpowered tower: the Dashboard asks, then waits for Done. Nothing physical runs automatically, and nothing is retried.

Routing: the server sends every moment to one target, `dashboard` or `ipad:<hunter>`. `ipad:<hunter>` fans out to every device currently holding that hunter, and only while that hunter is present. The Dashboard channel never carries a payload whose moment id contains `.private.` (including `end.private.<hunter>`). The server refuses that payload. The UI does not get a second copy to filter.

---

## 5. Play flow

1. **Door.** The host opens the Dashboard. It shows a stub landing with a "Burgomaster's Funeral POC" door. No Connect, no Calibrate, no tower chip (those are Phase 2).
2. **Join (PRD-3, PRD-4).** QR code plus a numeric code. The phone layout is detected, with a switch to the full layout. One human with one device is enough. The join page shows no private data. The hunter picker shows names and portraits only, plus a notice that devices which share a hunter share its secrets.
3. **Holdings (PRD-32, PRD-33).** Each device picks one or more of agnes, tomas, wren, emeric. A hunter may already be held. The roster shows holders and flags any unheld hunter. Begin stays disabled until all 4 are held.
4. **Who is at the Sanctuary (PRD-36).** The host marks each hunter present or away. At least 1 must be present. The set locks when the scene starts. Test default: wren + agnes present, tomas + emeric away. iPad 1 holds wren + tomas, iPad 2 holds agnes + emeric.
5. **Party kit.** Corruption and carried story items per hunter, plus skull supply. The host confirms. Starting kit: §6.
6. **No tower init.** Skipped (R4-1). The Dashboard starts the E16 ambient bed here (PRD-39, D13, D14).
7. **Scene.** Moments in §7. Stills advance when the host taps Next. No auto-advance timer. A clip advances when it ends, or on Next.
8. **Lid choice, fight, skull.** §6. The host enters the table's answers.
9. **Private thoughts.** `.09.private.<hunter>` for each present hunter, on every device holding that hunter, each card labelled with the hunter's name and portrait. Absent hunters get nothing (`private_skipped_absent`). The Dashboard shows only "Each hunter has a private thought; check your device" and waits until every receiving device taps Continue, or the host overrides.
10. **Dawn, night card, summary.** `.10`, then the phase card for night 2 → night 3. The POC ends on that card. The mini summary is computed only from stored stats. Each device shows one personal line and one 1–5 fun rating per held hunter (R3-9).

A 1981 bookend slot exists and stays silent (out of scope). No key is awarded (`key_eligible=false`, nothing shown).

**Pause (R3-2, D10).** If any hunter has no connected holder, play pauses. No moment advances, no cue fires, choices lock. The Dashboard says "Waiting for someone to hold <Name>" using the hunter's display name. The host cannot force-continue. Resume is a Dashboard reassignment to any connected device, or the holder rejoining. Pause and resume are logged. A device whose hunters are also held by another connected device does not block play; its private moment waits until the scene ends, then is logged undelivered.

---

## 6. State and rules

**Hunters.** agnes, tomas, wren, emeric are always in play, whatever the number of humans (PRD-32). One device holding all 4 is a valid game.

Per hunter: `corruption` (0–2 in the POC; 3 would be Turned), `holders` (device ids; must be non-empty while play runs), `location`, `present` (locked at scene start), `carried_items`. A hunter who is held but not present is absent. Effects use only present hunters and the items they carry (PRD-37). Items carried by absent hunters are untouched.

**Devices.** One or more. A device holds 1–4 hunters. A hunter may have several holders. Holdings can change from the Dashboard, and from a device for its own holdings, at any time (PRD-34). A new device taking an extra hold mid-scene needs the host's confirm. A dropped connection does not release holdings.

**Story items.** `stake` (count), `holy-water`, `host`, `holy-symbol` (gates `.04~holy-symbol`). Warriors and spirit are never touched.

**Starting kit (OQ-3).** wren carries 1 stake, agnes 1 holy water, tomas 1 stake (away, so it cannot be used), no host. Holy symbol off unless the seed or the pre-start test toggle turns it on. Corruption 0, with a pre-start preset "one hunter at 2" for the guard test. Skull supply 12, debug 5. The same seed, party, choices and fight results produce the same kit and the same moments (PRD-29). Host tower-mode is not an input in M1.

**Lid choice (PRD-10).**

| Choice | When offered | Immediate | Foes | If the fight is lost |
|---|---|---|---|---|
| `~nailed` | A present hunter carries ≥1 stake. Otherwise Nail is hidden. A stake on an absent hunter does not count. | stake −1 from a present carrier | base −1, then other modifiers, min 1 | The party loses 1 story item carried by a present hunter. No skull drop. |
| `~watched` | Always | none | base, then other modifiers, min 1 | One present hunter +1 corruption (guard applies) and one story skull drop (cap applies) |

Either way Dorka rises and the `.06` line plays. The choice is stored.

**Foe count.** Base = number of hunters present (OQ-1). Then nailed −1 if that was the choice. Then −1 if a present hunter locked question-mother (mother bars the window). Minimum 1. Sit-out does not change the base (D11). The mother modifier is a foe-count change, not a trait pip, so it sits outside the +2 cap (D15).

**Fight (R3-1).** No in-app battle and no battle simulation. Players use the physical cards at the table. The Dashboard battle status shows: present hunters (sitters marked sitting out); foe count after modifiers (min 1); each hunter's advantages by trait with the +2 cap applied; the Forewarned card face up if active (the host enters the physical card). Buttons: Won / Lost. The result chooses `.07` or `.07~fight-lost`.

**Investigation (E17, R3-6), after `.03` and before `.lid-choice`.** One pick per present hunter. Absent hunters do not pick. No two hunters pick the same action: the first lock wins, and taken cards grey out. No pick timer and no auto-pick in the POC. Picks and findings stay on the picking hunter's holders until all present hunters have locked (AT-27). The Dashboard shows only that a hunter has chosen, never the finding. The host taps Continue (no timer). Then `seal-sequence` fires if anyone locked `follow-the-mourner` (D12).

| Action | Finding | Mechanical result |
|---|---|---|
| `examine-body` | two bites, private | Ready Stake: +1 Undead to the picker |
| `question-mother` | singing, private | Sets `mother-warned`. Mother bars the window: −1 foe |
| `anton-coat` | holy water, private | The picker gains 1 holy water. Clue text mentions the lady's rooms. This does not set `dracula.lead.ladys-rooms` |
| `pray-over-coffins` | consecrated, private | Consecrated Ground: +1 Wild for each present hunter, this fight |
| `follow-the-mourner` | the servant, private | Forewarned, below. Risky cue: `seal-sequence` after Continue |

Story advantages are capped at +2 pips per hunter per fight (D15). Ready Stake, carried holy water and Consecrated Ground are pips. Forewarned is a revealed card, not a pip, and does not consume the cap. Holy water spent as a price is removed at once, before any later cost is picked, and then gives no advantage (R3-7). Holy water still carried counts toward the cap.

**Forewarned (R3-8, D11).** The picker's holders choose on the device: `corruption` (+1) or `sit-out`. Shared hunter: the first answer locks, and the others see it. At 2 corruption the choice is forced to `sit-out` (it cannot cause the third corruption). Log `n2-burgomasters-funeral.forewarned.choice` with `hunter`, `choice` (`corruption` \| `sit-out`) and `forced`.

**Item loss.** Each stake is one item (R3-7). The party chooses at the table; the host taps, from items carried by present hunters (OQ-4). Device voting is out of scope. If no present hunter carries an item, nothing is lost and the event is `cost_unpayable`.

**Corruption guard (watched + lost, and any other corruption).** The party picks a present hunter. A hunter at 2 cannot be picked. If every present hunter is at 2, the cost redirects to one story item carried by a present hunter (`~blocked`). If there is no such item either, log `cost_unpayable`. No cure is offered. The win/loss check runs after every state change and is logged. The guard prevents Turned in this scene. The only reachable terminal state is Concede.

**Skull drop (PRD-16).** Counter `story_skull_drops[night]`, cap 2. Before a drop: if supply < 6, add `finale_ledger.extra_foes += 1` instead and log `skull_drop_converted`. If the cap is already reached, skip and log `skull_drop_capped`. Otherwise the Dashboard asks the players to drop 1 skull into the unpowered tower and waits for Done. Supply −1. Log requested and confirmed. The drop is a clock input and does not advance the phase (OQ-6). The tower's `onSkullDrop` is Phase 2. Only scene completion advances night 2 → night 3.

**Flag.** `.06` sets `dracula.lead.ladys-rooms = true` whatever the fight result (PRD-17).

**End for now / Concede (PRD-31).** Both are on the Dashboard during play. Both are logged.

---

## 7. Moments and cues

Ids use the prefix `n2-burgomasters-funeral`. Variants replace the base of the same number when their condition holds. Combined variants (`~nailed~no-wren`) take precedence (PRD-8). If no variant exists and the replacement speaker is also absent, the line is cut. E15a applies to no moment in this scene: `.01` and `.10` are scene moments, not phase moments, and nothing is `scope: global` (R3-5). The pressed-flower dusk clue is outside this POC.

| Moment | Play when | Target |
|---|---|---|
| `.01` | always | dashboard |
| `.02` / `.02~no-wren` | wren present / absent | dashboard |
| `.03` / `.03~no-emeric` | emeric present / absent | dashboard |
| investigate round | after `.03`, present hunters only | picker on `ipad:<hunter>`; status on dashboard |
| `.lid-choice` | after the investigation Continue | dashboard |
| `.lid-choice~nailed` / `~nailed~no-wren` | nailed, wren present / absent | dashboard |
| `.lid-choice~watched` / `~watched~no-agnes` | watched, agnes present / absent | dashboard |
| `.04` / `.04~holy-symbol` | no holy symbol / party holds it | dashboard |
| `.05` / `.05~no-agnes` | agnes present / absent | dashboard |
| `.06` / `.06~no-tomas` | tomas present / absent; fight; sets the flag | dashboard |
| `.07` / `.07~no-wren` | won, wren present / absent | dashboard |
| `.07~fight-lost` / `.07~fight-lost~no-wren` | lost / lost and wren absent. The `~no-wren` line is narrator only (R3-12) | dashboard |
| `.08` / `.08~no-agnes` | agnes present / absent. `.08` reuses the `.07` still (R3-11); the manifest already points there | dashboard |
| `.09.private.<hunter>` | that hunter present | `ipad:<hunter>`, every holder |
| `.10` | always | dashboard |
| `end.private.<hunter>` | summary, for each held hunter | `ipad:<hunter>` (R3-9) |

**Cues (R4-2, D3, D4).** M1 fires cues from the moment with no per-cue confirm. Each one plays its screen half on the Dashboard. Where the sheet has `fallback_sfx`, that Mac audio plays too, every time. There is no tower, so nothing is suppressed because a tower sound worked (R3-3's suppression is Phase 2). No cue waits for a sound to end. Music, ambience and fallback audio come from the Mac only (PRD-13). Colour is not used.

The player reads `assets/cues/cue-sheet.json` and does not write it. Which moments fire `heartbeat` and `dim-all` comes from each entry's `moments` array (that list includes the investigation still for `heartbeat`, which the PRD §7 table does not repeat). `seal-sequence` and `skull-drop` also obey §6: the seal only after Continue when the risky action was locked (D12), the skull only when a physical drop is actually due.

| Cue id | Screen half (the entry's `fallback` text) | Mac audio |
|---|---|---|
| `heartbeat` | screen pulse on the vignette | `fallback_sfx` `n2-burgomasters-funeral.sfx.heartbeat-fallback` |
| `dim-all` | screen fades to near-black for 1.5 s | none on the entry. §7 of the PRD gives this cue no separate sound; the same moments also fire `heartbeat`. M1 does not invent an audio file. |
| `seal-sequence` | screen seal flicker | `n2-burgomasters-funeral.sfx.seal-flicker` |
| `skull-drop` | Dashboard prompt, waits for Done. Not a tower command | `n2-burgomasters-funeral.sfx.skull-drop-sting` |

`skull-drop` fires only on watched + lost, and only when the cap and the supply check say a physical drop happens. A converted or capped drop does not play the prompt or the sting.

Every fired cue logs `cue_fired` with result `fallback` and reason `no_tower` (PRD-24). Status on the sheet today is `Library`; M1 still logs `fallback` / `no_tower`, not `sent`.

**Readiness and cues (step 10, with D4).** A cue id the scene fires must name an entry in the sheet whose `fallback` string is non-empty. `dim-all` passes. An id that is missing, or whose `fallback` is empty, fails readiness (AT-17). M1 does not fail `dim-all` for a missing `fallback_sfx`, and it does not require E16 rows in the sheet.

**E16 (PRD-39, D13, D14).** From party-kit confirm through the night card, except where D14 ducks or pauses it: a screen pulse plus Mac ambient audio, and seeded one-shot accents every 20–60 s. Accent timing and choice come from the game seed and are logged (`ambient_bed`, `ambient_accent`). Suppressed under moment audio, held for accents during a choice, stopped during a pause, overridden by a scene cue. Quiet gap during play ≤10 s (AT-26). Step 8 writes the chosen manifest audio ids into this spec.

---

## 8. Assets

Read in place from `apps/burgomaster-funeral-poc/assets/` (D5, D6). The manifest is `assets/manifest.json`, keyed by id. Media is pre-rendered and played by that id. Nothing is generated live. Drafts and placeholders are allowed (PRD-26). `@dashboard` on the Dashboard, `@ipad` on devices. A missing `@phone` falls back to `@ipad`, then to text.

Folders already there: `script/`, `stills/`, `clips/`, `cards/`, `portraits/`, `audio/lines/`, `audio/sfx/`, `audio/music/`, `cues/cue-sheet.json`. Replacements keep the id and the path and change `status` in place.

**First-pass art (D6).** Portraits and stills may change size, crop and contents later. Layout uses the file as an image in its frame. Tests identify a moment by its id and its manifest path, not by bitmap size or pixels.

**Five moments not in the app copy yet (D7).** They are written in `assets/stories/dracula/scripts/n2-burgomasters-funeral.md` and absent from both `apps/burgomaster-funeral-poc/assets/script/n2-burgomasters-funeral.md` and `assets/manifest.json`:

- `n2-burgomasters-funeral.07~fight-lost~no-wren`
- `n2-burgomasters-funeral.end.private.agnes`
- `n2-burgomasters-funeral.end.private.tomas`
- `n2-burgomasters-funeral.end.private.wren`
- `n2-burgomasters-funeral.end.private.emeric`

They are synced into the app script and the manifest before B2. Until that sync, a readiness check would report them missing. B2 does not start on that gap. Placeholder voice and still paths satisfy PRD-26 after the sync. This step does not edit `assets/`.

**Readiness (PRD-27, AT-17), before play.** Every reachable moment id resolves in the manifest (`@dashboard` / `@ipad`, `@phone` → `@ipad` → text). Every private moment and every `end.private.<hunter>` has a line per joined hunter who can receive it. Every `~no-<hunter>` variant the scene can play, including `.07~fight-lost~no-wren`, has voice and a render entry. Every fired cue id resolves as §7 says. No private moment targets the Dashboard. `.08` resolving to the `.07` still passes (R3-11).

---

## 9. Privacy, channels, rejoin

- One Dashboard channel. One private channel per held hunter. `ipad:<hunter>` goes to every current holder, only while that hunter is present.
- The server drops any `.private.` payload aimed at the Dashboard, including `end.private.*`. A test asserts no Dashboard payload contains a `.private.` moment id or its text (AT-3).
- Logs, the mini summary, error text and the readiness report do not include private line text, private still paths' image contents, or private audio. They may name a moment id. The summary's personal line is sent on the hunter channel, not rendered on the Dashboard.
- The QR and the join page show no hunter-private data.
- On first join a device gets a token bound to (session, device). Reload or a new scan with that token restores holdings, and for each held hunter the current private moment, the status line and the pending choice (PRD-20, SC-3). A disconnect does not release holdings.
- If the disconnect leaves a hunter with no connected holder, play pauses (D10, AT-5, AT-25). If another connected device still holds that hunter, play continues (AT-5).
- A pending choice survives a change of holders. The first answer wins (OQ-14, R3-8).
- Private audio plays on the device only.
- The join token rotates, and the QR refreshes. The QR view never shows private data (PRD-3).

---

## 10. Persistence

SQLite file under the configured data folder (D8). Drizzle schema for the PRD §8 tables: `games`, `sessions`, `devices`, `game_heroes`, `clock_ticks`, `events`, `encounters`, `combats`, `resource_snapshots`, `inventory_changes`, `tower_activity`, `flags`, `outcomes`. `events` is append-only and is the source of truth. Times are UTC. Unknowns are null. The session records the seed and the pack version. Step 7 creates every table, including `tower_activity`. M1 writes no rows to `tower_activity`.

M1 writes every POC event type below. It does not write `tower_connect`, `tower_calibrate`, `tower_selftest` or `tower_disconnect` (Phase 2). Cue rows are `events` of type `cue_fired`.

| Event type | What it must carry |
|---|---|
| `session_started` / `session_ended` | seed, pack_version, `tower_used` always false, end_reason |
| `device_joined` / `device_left` / `device_rejoined` | device_id, form_factor (`ipad` \| `phone`), held hunters |
| `holding_changed` | device_id, hunter, action (`take` \| `release`), by (`device` \| `dashboard`), holders_after |
| `holdings_snapshot` | at start: hunter → device ids, all 4 |
| `start_gate_blocked` | unheld hunters |
| `paused_unheld` / `resumed_held` | hunter, paused_ms |
| `presence_locked` | scene_id, present, absent, locations |
| `moment_played` | moment_id including variant, target, started_at, skipped |
| `private_delivered` / `private_acknowledged` / `private_skipped_absent` | moment_id, hunter, device_id (one row per receiving device) |
| `cue_fired` | cue name, capability, status, result `fallback`, reason `no_tower` |
| `ambient_bed` / `ambient_accent` | phase, accent id, seed draw, started_at, suppressed, reason |
| `lid_choice` | choice (`nailed` \| `watched`), stake_before, stake_after, nail_offered |
| `fight_started` / `fight_resolved` | base_foes, foes, hunters, result (`won` \| `lost`) |
| `cost_applied` | kind (`corruption` \| `item` \| `redirected` \| `unpayable`), hunter, item, guard_triggered |
| `resource_changed` | resource, value, delta, cause_event_id |
| `skull_drop_requested` / `skull_drop_confirmed` / `skull_drop_converted` / `skull_drop_capped` | night, drops_tonight, supply_before, ledger_delta |
| `flag_set` | key, value |
| `phase_advanced` | from_night 2, to_night 3 |
| `winloss_checked` | result (`none` in this scene) |
| `fun_rating` | hunter, device, rating 1–5, note |
| `n2-burgomasters-funeral.forewarned.choice` | hunter, choice, forced |

`fun_rating` and the end line are stored per hunter and per device (R3-9).

A script (step 15) rebuilds the moment sequence, investigation picks, lid choice, fight result, costs, skull outcome, cue rows, ambient accents and device holdings from `events` alone (AT-14). Two runs with the same seed, party, choices and fight results produce identical event payloads, including E16 accent timing and choice, apart from wall-clock times and ids (AT-15). Tower-mode is not part of the input.

---

## 11. Screens

**Dashboard (PRD-2).** Mac browser, 1080p 16:9 play view. Zones: phase/night, story items, corruption per hunter, skulls (supply and dropped tonight). No tower status chip. Text ≥28 px. Key numbers ≥48 px. Also: QR + numeric join ("Join iPad" at any time), roster and start gate, "Who is at the Sanctuary", party kit, moment player (stills, clips, Mac audio) using the cue player, investigation status and Continue, lid choice, battle status (R3-1), skull-drop prompt, the neutral `.09` line, the unheld-pause banner with reassign, the night phase card, the mini summary, End for now, Concede.

**Device (PRD-30, PRD-35).** Join and hunter picker. One card per held hunter, headed with name and portrait. Private moments, status and pending choice per hunter. Investigation picks with taken cards greyed. Forewarned choice. Carried items, stake first. Phone: one decision at a time, hunter switcher, haptic tap on a private cue when the browser exposes vibration. Touch targets ≥44 pt, primary actions in the thumb zone. Per-hunter end line and fun rating. Rejoin by token.

The door, the Dashboard and the device views are Next.js App Router pages in `src/web`. Step 1 ships the door only.

---

## 12. Traceability

This step is the mapping. It adds no code and no test. A row is specified when §1–§11 state the behaviour and this table names the later step and the test. Executable proof is that later step's job. Step 14 runs every POC acceptance test except AT-18 (Bob's notes) and AT-13 (Phase 2), with screenshots at Dashboard, iPad and phone sizes.

### PRD ids

| ID | In M1 | Spec | Steps | Test |
|---|---|---|---|---|
| PRD-1 | POC half: host owns state and SQLite. Tower half is Phase 2 | §3, §4, §10 | 1, 4, 11 | AT-1, AT-4, AT-5 |
| PRD-2 | POC half: 1080p zones, type sizes. No tower chip | §11 | 12 | Step 14 Dashboard screenshots. The PRD has no separate AT id for type size |
| PRD-3 | yes | §5, §9 | 9, 12 | Join path inside step 14 (AT-4 and AT-19 start from a joined device). No separate AT id |
| PRD-4 | yes | §5, §11 | 9, 13 | AT-16, AT-21 |
| PRD-5 | Phase 2 | §13 | — | — |
| PRD-6 | Phase 2 | §13 | — | — |
| PRD-7 | yes | §7 | 5 | AT-12, AT-12b |
| PRD-8 | yes | §7 | 5 | AT-12, AT-12b |
| PRD-9 | yes | §6, §7 | 5 | AT-12 (holy symbol) |
| PRD-10 | yes | §6 | 6 | AT-6 |
| PRD-11 | POC half | §7 | 8, 11 | AT-1, AT-2 |
| PRD-12 | POC half. Path is D3. Sheet edit is D4 | §7 | 8, 10 | AT-2, AT-17 |
| PRD-13 | POC half: no wait, Mac audio only | §7 | 8 | AT-2 |
| PRD-14 | yes | §6, §11 | 6, 12 | AT-28; outcome selects `.07` or `.07~fight-lost` (AT-12, AT-12b) |
| PRD-15 | yes | §6 | 6 | AT-7, AT-8, AT-9 |
| PRD-16 | yes | §6 | 6 | AT-8, AT-10 |
| PRD-17 | yes | §6 | 5 | AT-11 |
| PRD-18 | yes | §4, §9 | 9 | AT-3, AT-20 |
| PRD-19 | yes | §5, §9 | 9 | AT-24 |
| PRD-20 | yes, with D10 | §5, §9 | 9 | AT-4, AT-5, AT-25 |
| PRD-21 | yes | §5, §6 | 5 | AT-1 (night 3 card) |
| PRD-22 | yes | §6 | 6 | AT-9; `winloss_checked` in the log (AT-14) |
| PRD-23 | yes | §10 | 7, 15 | AT-14, AT-15 |
| PRD-24 | POC half: `fallback` / `no_tower` | §7, §10 | 7, 8 | AT-2 |
| PRD-25 | yes. Rating is per hunter + device (R3-9), which wins over "per player" | §5, §10 | 11, 12, 13 | Step 14's full run reaches the summary. Fields reconstruct under AT-14. No separate AT id |
| PRD-26 | yes, with D6 | §8 | 10 | AT-17 |
| PRD-27 | yes, with D4 and D7 | §7, §8 | 10 | AT-17 |
| PRD-28 | Phase 2 | §13 | — | — |
| PRD-29 | POC half: no tower-mode input | §6, §10 | 5, 15 | AT-15 |
| PRD-30 | yes | §11 | 13 | AT-16 |
| PRD-31 | yes | §6, §11 | 11, 12 | No AT id in the PRD. Steps 11 and 14 assert both actions are reachable during play and are logged |
| PRD-32 | yes | §6 | 4 | AT-21 |
| PRD-33 | yes | §5 | 4, 12 | AT-19 |
| PRD-34 | yes | §5, §6 | 4, 11 | AT-22 |
| PRD-35 | yes | §9, §11 | 9, 13 | AT-20, AT-21 |
| PRD-36 | yes | §5, §6 | 4 | AT-23 |
| PRD-37 | yes | §6 | 4, 6 | AT-6, AT-7, AT-8 |
| PRD-38 | yes | §10 | 7 | AT-19, AT-22, AT-23 (the logged rows) |
| PRD-39 | yes. Cue-sheet rows for the bed are Phase 2 (D4, D13) | §7, D14 | 8, 12 | AT-26 |
| PRD-40 | yes, as D3 and D4. The contract is the existing file. The step 3 rewrite is Phase 2 | §2, §7 | 8, 10 | AT-2, AT-17 |

### Acceptance tests

| Test | In M1 | Steps |
|---|---|---|
| AT-1 | POC form: no tower, screen half visible, fallback audio heard, night 3 card | 14, G1 |
| AT-2 | POC form: every cue row `fallback` / `no_tower` | 14 |
| AT-3 | Dashboard payloads have no private id or text | 14 |
| AT-4 | Reload during `.09` restores both hunters' private state within 5 s | 14 |
| AT-5 | Network kill: pause only when a hunter has no connected holder; no force-continue | 14 |
| AT-6 | Nail hidden when the only stake is on an absent hunter; present stake nails and reduces foes | 6, 14 |
| AT-7 | Nailed + lost: one present item, no skull | 6, 14 |
| AT-8 | Watched + lost: corruption, skull prompt waits for confirm | 6, 14 |
| AT-9 | All present hunters at 2: redirect, guard, no Turned | 6, 14 |
| AT-10 | Cap skips; supply 5 converts | 6, 14 |
| AT-11 | Both fight outcomes set the flag | 5, 14 |
| AT-12 | Test-default variants, plus holy symbol | 5, 14 |
| AT-12b | Flipped presence, including `.07~fight-lost~no-wren` narrator only | 5, 14 |
| AT-13 | Phase 2 | — |
| AT-14 | Reconstruct from the log | 15 |
| AT-15 | POC form: determinism includes E16 accents, not tower mode | 15 |
| AT-16 | Phone layout, one decision, haptic on a private cue | 13, 14 |
| AT-17 | Readiness fails closed on missing voice, render or cue fallback (§7's rule) | 10 |
| AT-18 | Bob's playtest notes. Not automated | G2 |
| AT-19 | Start gate | 4, 12, 14 |
| AT-20 | Shared hunter: both devices, nothing on the Dashboard | 9, 14 |
| AT-21 | One device, all 4 hunters; `.09` shows only the present pair, labelled | 13, 14 |
| AT-22 | Release the only holder: pause and resume | 4, 12, 14 |
| AT-23 | Presence lock | 4, 5, 14 |
| AT-24 | Absent hunter's holder gets no private line | 9, 14 |
| AT-25 | Binding text is D10, not the stale §11 sentence | 9, 14 |
| AT-26 | POC form: Dashboard ambient gaps ≤10 s outside pauses and moment audio (D14) | 8, 14 |
| AT-27 | Investigation findings only on the picker's holders | 5, 9, 13, 14 |
| AT-28 | Battle status matches the rules; Won / Lost is the only resolution | 6, 12, 14 |
| AT-29, AT-30 | Phase 2 | — |

### Rulings → where they bind

| Ruling | Binds in |
|---|---|
| R3-1 | §6 fight, §11 battle status. Steps 6, 12 |
| R3-2 | §5 pause, §9. Steps 4, 9, 11, 12 |
| R3-3 | Screen half always plays. Audio suppression is Phase 2. M1 always plays fallback audio (R4-2). Step 8 |
| R3-4 | §7 E16, §10, AT-15. Steps 7, 8, 15 |
| R3-5 | §7. Step 5 |
| R3-6 | §6 investigation, D12. Steps 5, 6, 13 |
| R3-7 | §6 items and cap. Step 6 |
| R3-8 | §6 Forewarned, D11. Steps 6, 7, 13 |
| R3-9 | §5 summary, §7 `end.private.*`, §10. Steps 5, 7, 10, 13 |
| R3-10 | Phase 2 |
| R3-11 | §7 `.08`, §8. Step 10 |
| R3-12 | §7 `.07~fight-lost~no-wren`. Steps 5, 10 |
| R4-1 | D2, §4, §13. Every step: no tower code |
| R4-2 | D2, §7. Steps 8, 12 |
| R4-3 | D3, D4. Ids unchanged. Steps 8, 10 |

---

## 13. Phase 2 (out of M1)

Not built in M1. Ids kept so Phase 2 can pick them up. Phase 2 maps the same cue ids onto the tower through the `apps/tower-poc` service, which stays a black box. This app still does not import that folder; a later milestone decides the boundary.

- **PRD-1 tower half, PRD-2 tower chip, PRD-5, PRD-6, PRD-28.** Connect, calibrate, self-test, "Play without tower", no command during calibration, manual reconnect. Nothing automatic, nothing retried.
- **PRD-11, PRD-12, PRD-13, PRD-24 tower halves, and PRD-29's tower-mode input.** Cues sent to the tower; Verified / Library / GAP; `onSkullDrop` when connected; host mode Full / Lights only / Off logged as a determinism input.
- **R3-3 suppression.** Fallback audio suppressed only while the tower is connected and its sound works. The screen half, including the pulse, still always plays.
- **R3-10 self-test and OQ-7.** `dim-all`, then `heartbeat` lights, then the skull-drop sound. Host confirms. A failed step switches that channel to the screen fallback.
- **E16 on the tower** and the host tower-mode toggle.
- **Plan step 3 (D4).** The cue-sheet rewrite: structured screen half, fallback-audio asset id, empty `tower` slot, E16 bed and accent ids. Same path as D3. No renamed ids.
- **Tests:** AT-1 (tower), AT-2 (tower), AT-13, AT-15 (tower), AT-26 (tower), AT-29, AT-30.

Also out of M1, from PRD §2: the full setup wizard, multi-night saves, the 1981 bookends beyond the silent slot, final art, late arrivals, board-movement UI, the rest of the campaign, warriors and spirit, and any edit under `apps/tower-poc`.

---

## 14. Assumptions still in force

From PRD §12, unless a §2 row already replaced one. The build uses these until Bob overrides them.

| ID | Build follows |
|---|---|
| OQ-1 | Base foes = hunters present. Fight resolved at the table. Host taps Won or Lost. |
| OQ-2 | Test default in §5. A second pass flips presence (AT-12b). |
| OQ-3 | Starting kit in §6. |
| OQ-4 | Host taps the victim and the lost item. No device vote. |
| OQ-5 | Resolved by R3-12. |
| OQ-6 | Skull drop is logged as a clock input and does not advance the phase. |
| OQ-7 | Phase 2. |
| OQ-8 | No keys. `key_eligible=false`. |
| OQ-9 | Silent bookend slot. |
| OQ-10 | Host taps Next. Clips also advance when they end. |
| OQ-11 | Placeholders until a later art pass. D6: first-pass portraits and stills are not measured. |
| OQ-12 | Resolved by R3-2 and D10. |
| OQ-13 | "Who is at the Sanctuary" before `.01`. At least 1 present. |
| OQ-14 | A pending choice moves to the new holders. First answer wins. |
