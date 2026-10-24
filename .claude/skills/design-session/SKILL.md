---
name: design-session
description: Start a game-design session on the saga game. Asks Bob for the topic, orients from the card graph and the last session, sets up the session branch, then works one question at a time. A morning card review uses the same branch and PR. Use when Bob says he wants a design session, a brainstorm on the game, a morning card review, or runs /design-session.
---

# Design session

The game design lives in `research/game-design/`: long documents as sources, and one small idea per file in `cards/` (format in [cards/README.md](../../../research/game-design/cards/README.md)). Bob views the cards in the game-workbench. A session turns his answers into cards.

## Morning card review

Not a full design session. Skip the question loop. Use the same branch and PR as §3 and §5.

Bob edits cards on that branch, in the main checkout. Commit those edits on the branch. The git diff and the PR are the change record. Do not add version or `as-of` fields. Follow [cards/README.md](../../../research/game-design/cards/README.md).

## 1. Topic

If Bob passed a topic as the argument, use it. Otherwise ask with one AskUserQuestion call before reading anything else. Build the options from what is open now:

- Run `pnpm -s graph gaps | head -15` and read the roadmap memory (`game-design-roadmap`).
- Offer up to 4 options: the next roadmap step (name the first open `Q-` ids it covers), one area with many open questions, "A new idea of mine" and "Probe a playthrough" (say if the roadmap says it is too early). Bob can always type his own.

## 2. Orient (fast, no full documents)

1. `git log --oneline -6 -- research/game-design` for what the last sessions decided.
2. `pnpm -s graph find <topic words>`, then `pnpm -s graph show <ID>` for the area and the open `Q-` cards in it. Follow `needs` and `conflicts` links one step.
3. Read a source document only at the lines a card cites.
4. Find the next free ID of each kind you expect to add: `ls research/game-design/cards | grep '^DEC-' | tail -1` (same for `Q-`, `IDEA-`, `OPT-`, `MEC-`).

Then give Bob a short brief: the topic, what is already decided (by ID), the open questions you will ask in order, and any conflict you found. Keep it under 15 lines.

## 3. Branch

Sessions run in the main folder, not a worktree, so Bob's workbench shows the cards as they land.

1. `git status` must be clean. If it is not, stop and ask Bob.
2. Branch `chore/design-session-<YYYY-MM-DD>` from `origin/main`. If that branch exists, add the next letter (`…-21b`, `…-21c`).
3. Tell Bob to run (or reload) the workbench: `pnpm --dir apps/game-workbench dev`, port 4797.

## 4. Work

- **One question per AskUserQuestion call**, multiple choice, recommended option first. No prose questions at the end of a reply.
- **High level first.** Settle who holds a system, what it is and its core rule before numbers. Park detail questions as new open `Q-` cards.
- **Record each answer before the next question**: a `DEC-` card for the ruling (Bob's words in the body, `by: Bob, <date>`), `answers` link to the `Q-`, `OPT-` cards for the choices he weighed when they matter, new `Q-` cards for what it raises. Mark the `Q-` `answered`. Your own proposals go in as `status: proposed`.
- If an answer is already in a card or document, link it instead of making a new card.
- Keep each area to about 10 direct links; add a sub-area (`part-of` the parent) instead of crowding it.
- **One commit per idea**: `docs(game-design): <the ruling> (DEC-nnn)`. `pnpm check` runs the card lint on commit; fix what it reports.
- A prompt that starts with **Ask** from the workbench means answer only: edit nothing. When Bob then says "record everything", turn the answers into cards as above.
- Refer to every piece by ID in chat and commits.

## 5. Close

When Bob says the session is done:

1. Push and open one PR titled `docs(game-design): design session <date>, <topics>`, listing the new IDs by kind. Leave it open. Gamewright reviews and squash-merges it. Bob does not merge. Wright stays off design merges.
2. Update the `game-design-roadmap` memory with what progressed and where the next session starts.
3. Switch the folder back to `main` only after the merge, so the workbench keeps showing the session's cards until then.
