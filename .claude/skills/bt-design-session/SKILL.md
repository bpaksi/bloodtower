---
name: bt-design-session
description: Start a Bloodtower game-design session on the saga game. Asks Bob for the topic, makes the session's own worktree and branch, orients from the card graph and the last session, then works one question at a time. Several sessions can run at once. A morning card review uses the same worktree, branch and PR. Use when Bob says he wants a design session, a brainstorm on the game, a morning card review, or runs /bt-design-session.
---

# Design session

The game design lives in `research/game-design/`: long documents as sources, and one small idea per file in `cards/` (format in [cards/README.md](../../../research/game-design/cards/README.md)). Bob views the cards in the game-workbench. A session turns his answers into cards.

## Running several sessions at once

Bob may run several sessions side by side. Each one keeps to its own:

- **Worktree and branch.** Every session works in its own `pnpm wt` worktree (§2). Never edit, stage, stash or switch branches in the main folder; another session or Bob's own work may be there.
- **Workbench.** Each worktree runs its own workbench on the port in its `.wt.json`.
- **Card IDs.** Never pick an ID by listing the folder. Reserve it with `pnpm card-id <PREFIX> [count]` (§4); a reserved ID is never handed to another session.

Keep the shell in the main folder and reach the worktree by its absolute path (`git -C <wt>`, `pnpm --dir <wt>`, absolute paths for edits). Inside a worktree the `worktree-guard` hook blocks writes outside it, which would block the roadmap memory update in §5.

## Morning card review

Not a full design session. Skip the question loop. Use the same worktree, branch and PR as §2 and §5.

Bob edits cards on that branch, in the session's worktree folder (give him the path). Commit those edits on the branch. A new card Bob adds gets its ID from `pnpm card-id`; rename his file if he guessed one. The git diff and the PR are the change record. Do not add version or `as-of` fields. Follow [cards/README.md](../../../research/game-design/cards/README.md).

## 1. Topic

If Bob passed a topic as the argument, use it. Otherwise ask with one AskUserQuestion call before reading anything else. Build the options from what is open now:

- Run `pnpm -s graph gaps | head -15` and read the roadmap memory (`game-design-roadmap`). The main folder may be on another branch; that is close enough for picking a topic.
- Offer up to 4 options: the next roadmap step (name the first open `Q-` ids it covers), one area with many open questions, "A new idea of mine" and "Probe a playthrough" (say if the roadmap says it is too early). Bob can always type his own.

## 2. Worktree and branch

1. From the main folder: `pnpm wt chore/design-session-<YYYY-MM-DD>-<topic-slug>` (two to four words, for example `…-2026-10-27-battle-retreat`). It branches from `origin/main`. If the branch exists, add the next letter (`…-retreat-b`).
2. Read `<wt>/.wt.json` for `ports.workbench`. Start the workbench in the background: `pnpm --dir <wt>/apps/game-workbench/src/web exec next dev -p <port>`. Note its PID.
3. Tell Bob the worktree path and the workbench URL, `http://localhost:<port>`. He reloads that page to see the cards land.

## 3. Orient (fast, no full documents)

Run every command against the worktree.

1. `git -C <wt> log --oneline -6 -- research/game-design` for what the last sessions decided.
2. `pnpm -s --dir <wt> graph find <topic words>`, then `pnpm -s --dir <wt> graph show <ID>` for the area and the open `Q-` cards in it. Follow `needs` and `conflicts` links one step.
3. Read a source document only at the lines a card cites.

Then give Bob a short brief: the topic, what is already decided (by ID), the open questions you will ask in order, and any conflict you found. Keep it under 15 lines.

## 4. Work

- **One question per AskUserQuestion call**, multiple choice, recommended option first. No prose questions at the end of a reply.
- **High level first.** Settle who holds a system, what it is and its core rule before numbers. Park detail questions as new open `Q-` cards.
- **Record each answer before the next question**: a `DEC-` card for the ruling (Bob's words in the body, `by: Bob, <date>`), `answers` link to the `Q-`, `OPT-` cards for the choices he weighed when they matter, new `Q-` cards for what it raises. Mark the `Q-` `answered`. Your own proposals go in as `status: proposed`.
- **IDs come from `pnpm -s --dir <wt> card-id <PREFIX> [count]`**, run just before you write the cards (`DEC`, `Q`, `IDEA`, `OPT`, `MEC`…). It prints one ID per line. An ID you reserve and then do not use stays unused; IDs are never reused anyway.
- If an answer is already in a card or document, link it instead of making a new card.
- Keep each area to about 10 direct links; add a sub-area (`part-of` the parent) instead of crowding it.
- **One commit per idea**, in the worktree: `git -C <wt> commit -m "docs(game-design): <the ruling> (DEC-nnn)"`. `pnpm check` runs the card lint on commit; fix what it reports.
- A prompt that starts with **Ask** from the workbench means answer only: edit nothing. When Bob then says "record everything", turn the answers into cards as above.
- Refer to every piece by ID in chat and commits.

## 5. Close

When Bob says the session is done:

1. Push the branch and open one PR titled `docs(game-design): design session <date>, <topics>`, listing the new IDs by kind. Leave it open. Gamewright reviews and squash-merges it. Bob does not merge. Wright stays off design merges.
2. Update the `game-design-roadmap` memory with what progressed and where the next session starts. Another session may have changed it since you read it: read it again just before, and edit only the lines about your topic.
3. After the merge, stop the workbench you started (by its PID, never `pkill`) and remove the worktree from the main folder with `pnpm wt:rm <branch>`. Until then the worktree's workbench keeps showing the session's cards.
