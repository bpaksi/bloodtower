# Dungeon review

How Bob and Claude review one set-piece type (a "dungeon") by chatting, and how the review is recorded. Written 2026-10-21, after Bob found the batch-1 prototypes hard to picture: "This need to be a very Visual game."

The prototypes in `apps/prototypes` test the **numbers**. A review settles the **experience**: what the table sees on the TV and what the players choose. Bob makes the visuals himself. Claude asks the questions and keeps the record.

## The aim: one picture

A set piece is done when it fits in **one picture** a player understands from the couch:

- **one picture:** the scene on the Story board, such as a cross-section of the tomb, or a tower of champions;
- **one meter:** the thing that runs out or fills up, such as health, torchlight or the camp's temper;
- **two or three choices** each round, such as go deeper or leave.

Anything that doesn't fit the picture is cut, however clever it is.

## The prompt

Copy this into Claude Code from the repo folder. Change the first line to the set piece you are reviewing.

```text
Dungeon review: Tomb (MEC-026).

Follow research/game-design/dungeon-review.md. Read the set piece's card and everything it links to (`pnpm graph show <ID>`), the prototype's FINDINGS.md, and its simulation numbers.

Then review it with me one question at a time, multiple choice, high level first, in the order the guide gives. I make the visuals myself. When I describe a picture or give you an image, record it as the guide says.

Record as we go: a session branch in the main folder, one commit per answer. Before you finish, show me the summary and the cut list.
```

The set pieces: Tomb (MEC-026, P-02), Cave (MEC-027, P-03), Encampment (MEC-028, P-04), Fortress (MEC-029, P-05), Ruins (MEC-030) and Shrine (MEC-031). Ruins and Shrine have no prototype yet.

## The order of questions

One question at a time, high level first. Numbers come last.

1. **The picture:** what the TV shows when the scene opens. Bob describes it or gives an image.
2. **The meter:** the one thing that runs out or fills up, and how it looks.
3. **The choices:** the two or three things the party can do each round, and who chooses (the board, an iPad, or a vote).
4. **One round, step by step:** what the TV shows, what the tower does, and what the players do. Then what changes in the picture.
5. **In and out:** how the party enters, wins, leaves and loses, and what each looks like.
6. **The Advantage:** what the matching RtDT Advantage (Undead, Beast, Humanoid, Melee, Stealth, Magic) does, as something visible.
7. **The tower:** which sounds, lights or drum moves mark the moments. Nothing physical happens on its own (CLAUDE.md, Tower safety).
8. **The cut list:** what the prototype has that the picture doesn't need. It goes.
9. **The numbers:** starting values, taken from the prototype's simulation and its tuning panel.
10. **The assets:** each still, sound, line of narration and animation the picture needs.

## How it is recorded

- **Where:** a session branch `chore/dungeon-review-<set-piece>-<date>` in the main folder, so the workbench shows the cards as they land. Make one commit per answer and one PR per review. It merges when Bob says so.
- **Bob's words:** each idea Bob states goes in an `IDEA-` card, quoted as he said it.
- **Rulings:** each answer Bob chooses becomes a `DEC-` card with `status: decided`, which `refines` the set piece's `MEC-` card.
- **Claude's proposals:** anything Bob has not chosen is recorded with `status: proposed`. Claude's ideas are never written up as Bob's.
- **Visuals:** each image Bob makes is saved to `research/game-design/mockups/<date>-<set-piece>/`, with a short descriptive name. Each one gets an `SK-` sketch card: `part-of` the set piece's area, with the image path and what it shows in its body. A picture Bob only describes gets an `SK-` card with his words and no image.
- **The set piece card:** once the review ends, the `MEC-` card is rewritten to the one-picture version. It names its picture (`SK-`), meter, choices and round, and links the new `DEC-` cards. Whatever the review cut is listed at the bottom under **Cut**, with a line on why.
- **The prototype:** its `FINDINGS.md` gets a **Review** section with the date, the PR, what changed, and whether the prototype now needs a table view or new numbers.
- **The assets:** each asset the picture needs gets a row in the walkthrough's `asset-needs.csv` (`research/game-design/mockups/2026-10-21-setup-walkthrough/`), with the set piece as the step and the new card IDs.
- **The summary:** the PR body lists the picture, the meter, the choices, the rulings, the cut list, the open questions, and the assets needed.

**Checks before the PR:**
- `pnpm graph gaps` shows nothing new for the set piece;
- the link rules pass;
- `pnpm check` passes.
