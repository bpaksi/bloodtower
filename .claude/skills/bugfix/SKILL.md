---
name: bugfix
description: Fix a bug test-first. Use whenever Bob reports a bug or a defect is found, in any app in this repo.
---

# Bugfix

1. **Branch.** Create `fix/<app>-<slug>` from `main`.
2. **Reproduce.** Find the smallest input or sequence that shows the bug. If it cannot be reproduced, stop and tell Bob what was tried.
3. **Failing test first.** Write a test that fails because of the bug, and run it to confirm that it fails for the right reason. Commit it alone: `test(<app>): reproduce <bug>`. If the pre-commit check blocks the commit because of this failing test, mark the test with `it.fails` so the suite passes while the bug exists.
4. **Fix.** Change the code, not the test. After the first commit on a `fix/*` branch, the `test-lock` hook blocks changes to test files. If the test itself turns out to be wrong, stop and tell Bob.
5. **Prove.** Remove `it.fails` if it was used. This is the one test edit `test-lock` allows: change `it.fails(` to `it(` with the Edit tool and touch nothing else in the file. Run `pnpm check`. Commit: `fix(<app>): <what was wrong>`, with the before and after test output in the message.
6. **Follow up.** For a tower app, if the bug shows that the library or the tower behaves differently from what the spec assumed, add a gap entry with the `gap-entry` skill.
