# Story workbench (`story-workbench`)

| | |
|---|---|
| Purpose | A local, read-only website for working on several stories at once (Dracula, the Fellowship saga, more later). Each story in `research/stories/<story>/` keeps its own cards, documents and IDs, with the story code in every ID (`DRA-CHR-004`). A card can be copied from one story into another. |
| Phase | Design |
| SDLC tier | Experiment |
| Status | Awaiting intent |
| Disposable? | Yes. The content lives in `research/stories/`; this app only displays it. |

Like game-workbench, the site never writes. Changes are made by pasting a prompt into Claude, and every prompt is scoped to one story. The card graph, documents and prompt starter come from the shared `packages/workbench` package, which is moved out of game-workbench first.
