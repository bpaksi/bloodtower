Keep it a checklist. Strict: a plausible wrong build must fail.

# Evals: CU / 01-join-hydration-guard — Stop the /join hydration warning and keep it stopped

- Brief: ./plan.md
- Mockup: none
- Risk: Low

## Checks

### EV-01 — No hydration error with injected attributes
- Requirement: /join logs no hydration error when the browser adds its own attributes before React runs (issue #414).
- Method: playwright
- How: new spec `src/e2e/tests/join-hydration.spec.ts`. An init script sets `__gchrome_remoteframetoken` on `<html>` and sets `__gchrome_uniqueid` on every `form` and `input` as soon as each exists, before hydration. Open `/join` on the iPad viewport and collect `console` and `pageerror` messages.
- Pass evidence: zero messages containing "hydrat" or "did not match"; the join code input and the submit button are visible.
- Fails if: the flag is missing from `<html>` or from one of the named forms or inputs.

### EV-02 — The guard catches a real mismatch
- Requirement: the guard must fail on a real hydration difference, so it cannot pass by being blind.
- Method: unit
- How: a test in the same spec file's helper (or a small unit test beside it) feeds the collector a console message "Hydration failed because the server rendered HTML didn't match the client" and checks that the collector reports it.
- Pass evidence: the collector returns that one message; the collector returns nothing for an ordinary log line.
- Fails if: the collector ignores every message, or matches every message.

### EV-03 — The flag is narrow
- Requirement: `suppressHydrationWarning` is only on `<html>` and on the join forms or inputs the warning named; never on a wrapper of game content.
- Method: unit
- How: a source check in the new spec's folder or a unit test reads `layout.tsx`, `JoinScreen.tsx` and `LiveJoin.tsx` and counts the elements that carry the flag.
- Pass evidence: the flag is on `<html>` and on no more than the forms and inputs named in the PR; no `<main>`, board, or screen wrapper carries it.
- Fails if: the flag is set on `<body>`, a page wrapper, or a game component.

### EV-04 — No SSR change, join still works
- Requirement: the same HTML is served and the join forms still work (#414: no SSR behaviour change).
- Method: playwright
- How: existing join e2e specs (`c2-session-screen.spec.ts`, `c2-session-enter.spec.ts`) run unchanged. The PR attaches the server HTML of `/join` from main and from the branch.
- Pass evidence: the existing specs pass without edits; the two HTML files differ only in attributes React does not emit to the client (none expected; a diff of zero bytes is the target).
- Fails if: any existing join spec needed an edit, or the HTML differs in content.

## Survival evals (one per survival invariant in plan.md)

### EV-11 — The join forms still submit and pre-fill
- Requirement: the code form and the token form submit and pre-fill from the link as before.
- Method: playwright
- How: the existing join specs named in EV-04.
- Pass evidence: both forms submit; a link with a code pre-fills the code input.
- Fails if: a form no longer submits or pre-fills.

## Assumptions surfaced

- The warning comes from Chrome on iOS autofill, as #414 says → confirmed by the diff Bob attached; Bob checks the iPad after merge.
- Safari on iPad shows no mismatch → Bob: confirm on the iPad after merge (cannot be run in CI).
