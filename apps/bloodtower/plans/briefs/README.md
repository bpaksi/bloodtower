# Briefs

A brief is the short checklist one Bloodtower coding step must have before code starts. Keep it a checklist. Design decisions stay in AREA notes and DEC records.

Files live in `apps/bloodtower/plans/briefs/`.

Design fills one file per step, copied from [BRIEF-TEMPLATE.md](BRIEF-TEMPLATE.md). Name it `<plan-id>-step-<N>.md` (for example `C2-step-3.md`).

Warden reviews the brief for completeness: required headings, exactly one of `Cutover: Y` or `Cutover: N`, and done-when lines someone can run.

Wright launches coding for that step only after the brief is merged. A draft here is not a go-ahead.

`pnpm brief:lint` runs as part of `pnpm check`. It fails a filled brief that is missing a required heading or the single cutover line. `README.md` and `BRIEF-TEMPLATE.md` are excluded from the filled-brief rules. The template is still checked for the four `##` headings.
