# Briefs

A brief is the short checklist one Bloodtower coding step must have before code starts. Keep it a checklist. Design decisions stay in AREA notes and DEC records.

Files live in `apps/bloodtower/plans/briefs/`.

Each plan has a folder `<plan-name>/` (e.g. `C2/`). Each feature of that plan has a folder `##-<feature>/` (e.g. `C2/01-pick-beat/`) containing:

- `plan.md` — the brief, from [BRIEF-TEMPLATE.md](BRIEF-TEMPLATE.md). Gamewright.
- `eval.md` — numbered checks EV-01…, from [EVAL-TEMPLATE.md](EVAL-TEMPLATE.md). Gamewright. Each check: requirement, method (unit test, Playwright step, or screenshot side-by-side vs mockup), passing evidence, and the wrong build it catches. Write each so a wrong-but-plausible build fails.
- `mockup.html` — only if the feature changes a screen. Illusionist. Static HTML/CSS, no app imports, at the feature's named viewports. At least one EV compares a Playwright screenshot to it side by side.
- `approval.md` — from [APPROVAL-TEMPLATE.md](APPROVAL-TEMPLATE.md). Who approved the evals and mockup, when, and a link to the chat message.

Bob approves the evals and mockup in chat; Gamewright (or Warden) records it in `approval.md` in the same brief PR. Wright launches coding only after that folder, with `approval.md` filled, is on main.

Every feature of a plan gets `eval.md`. Docs-only / design / art / pack PRs on lite CI need none.

Flat briefs named `<plan-id>-step-<N>.md` predate this layout. They stay valid for steps that already had an open coding PR on 2026-10-31; every other step moves to the folder layout.

`pnpm brief:lint` (part of `pnpm check`) fails a feature folder that is missing `plan.md`, `eval.md`, or `approval.md`; a `plan.md` missing a required heading or the single cutover line; an `eval.md` with no EV IDs, duplicate IDs, or an EV missing Requirement / Method / How / Pass evidence / Fails if; a `plan.md` whose `Mockup:` names a missing file; a `mockup.html` with no EV of method `screenshot`; and an `approval.md` with no approver/date. Templates and README are excluded from filled-file rules.

Those folder and eval failures are the rules for this layout. They are not in `scripts/check-briefs.mjs` yet; that change is its own PR. Until it lands, the script still checks each flat `*.md` brief, and these templates, for the four headings and one cutover line. `EVAL-TEMPLATE.md` and `APPROVAL-TEMPLATE.md` carry a short HTML comment so that check keeps passing. Do not copy the comment into a feature file.
