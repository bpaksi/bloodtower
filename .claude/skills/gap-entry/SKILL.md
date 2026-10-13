---
name: gap-entry
description: Write a feature-gap entry for a tower app with evidence and an honest confidence level. Use when a tower capability is unsupported, partial, unverified, missing diagnostics, or limited by the platform.
---

# Gap entry

A gap records something the tower, the library, the UI or the platform cannot do, or something not yet proven. Seed gaps live in `src/server/gaps/seed.ts`. The fields come from FR-11 of the intent.

## Fields

| Field | Rule |
|---|---|
| ID | `GAP-<AREA>-<NNN>`, with area `HW`, `LIB`, `UI`, `DIAG` or `PLAT`. Use the next free number. IDs are stable; never reuse one. |
| Title | Short, and says what is missing |
| Type | One of the six gap types in FR-11 |
| Category | hardware, library, UI, diagnostics or platform |
| Description | Expected behavior versus observed behavior |
| Evidence | A doc link, a source reference (`file:line` in the library at the pinned version), or a saved diagnostic session ID |
| Evidence confidence | confirmed, inferred or unverified |
| Status | unverified, confirmed gap, investigating, implemented, verified resolved or deferred |
| Priority | low, medium or high |
| Affected version | Library and app version |
| Reproduction steps | When there is a way to reproduce it |
| Linked capability | The inventory `id`, when there is one |
| Resolution notes | Fix, workaround, or the reason for deferral |

## Rules

- **Confidence must match the evidence.** `confirmed` needs something observed: a diagnostic session from the real tower, or library source that settles the question. Reading the code and guessing is `inferred`. No evidence is `unverified`.
- **Status `confirmed gap` requires evidence.** Without it, use `unverified` or `investigating`.
- **Mock results are not hardware evidence.** A mock-mode test proves the app's behavior, not the tower's.
- **Keep gaps that have no workaround.** An unsupported or unverified entry still belongs in the register.
- Do not delete a gap when it is resolved. Set the status and fill in the resolution notes.
