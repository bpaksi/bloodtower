---
name: new-app
description: Scaffold a new app folder under apps/ with its README and tier, ready for Bob to write the intent. Use when Bob asks to start a new app, prototype or experiment in this repo.
---

# New app

1. Ask Bob for the folder name (kebab-case), a one-line purpose, the phase (Explore, Design or Build) and the tier (Experiment or Full). The tiers are defined in `docs/sdlc.md`.
2. Create `apps/<name>/README.md` from the app README template in `docs/sdlc.md`. Set Status to "Awaiting intent".
3. Add a row for the app to the Apps table in the root `README.md`.
4. Do not create anything under `apps/<name>/intent/`. Intent is written by Bob, and the `protect-intent` hook blocks it. Tell Bob the next step is for them to write `apps/<name>/intent/0001-<name>.md` in their own words.
5. Do not add code or a `package.json` yet. For a Full app, code starts after the spec and the first plan are approved. For an Experiment, it starts after Bob accepts the intent.
6. Work on a `chore/<name>-scaffold` branch.
